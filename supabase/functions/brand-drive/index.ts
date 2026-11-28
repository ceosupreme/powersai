import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { postingCaptions } from './captions.ts';
import { ADMIN_ROOTS, APPROVAL, READY, FOLDER, driveId, fileAvailable, normalizeName, titleMatches, type BrandRoot, type DriveFile } from './safety.ts';
const headers = { ...corsHeaders, 'Access-Control-Allow-Headers': `${corsHeaders['Access-Control-Allow-Headers']}, range`, 'Access-Control-Expose-Headers':'Content-Range, Content-Length, Accept-Ranges, Content-Disposition', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer' };
const Input = z.object({ action:z.enum(['brand','list','text','ticket','posts','mark']), fileId:z.string().regex(/^[\w-]{5,200}$/).optional(), projectIds:z.array(z.string().uuid()).max(100).optional(), projectId:z.string().uuid().optional(), date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), channel:z.enum(['instagram','facebook','tiktok','google','linkedin','youtube','pinterest','x','other']).optional(), liveUrl:z.string().url().max(2048).nullable().optional(), note:z.string().max(4000).nullable().optional(), mode:z.enum(['media','thumbnail','download']).optional() });
const env = (key:string) => { const v=Deno.env.get(key)?.trim(); if (!v) throw new Error('File service is not configured'); return v; };
const gateway='https://connector-gateway.lovable.dev/google_drive/drive/v3';
async function provider(path:string, params:Record<string,string>={}, extra:Record<string,string>={}) {
 const u=new URL(`${gateway}${path}`); for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 const res=await fetch(u,{headers:{Authorization:`Bearer ${env('LOVABLE_API_KEY')}`,'X-Connection-Api-Key':env('GOOGLE_DRIVE_API_KEY'),...extra}});
 if(!res.ok && res.status!==206){const body=await res.text(); console.error(`Drive [${res.status}]: ${body}`); throw Object.assign(new Error(`Drive could not open this file [${res.status}]: ${body}`),{status:res.status});} return res;
}
async function key(){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env('SUPABASE_SERVICE_ROLE_KEY'))),'AES-GCM',false,['encrypt','decrypt']);}
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=(s:string)=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function ticket(payload:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(JSON.stringify(payload))));return `${b64(iv)}.${b64(bytes)}`;}
async function openTicket(s:string){const [iv,data]=s.split('.');if(!iv||!data)throw new Error('File link expired. Reopen the file.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await key(),unb64(data))));}
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json'}});}
function refs(value:unknown):string[]{if(typeof value==='string')return (value.match(/https:\/\/(?:drive|docs)\.google\.com\/[^\s"<>]+/g)??[]).map(driveId).filter((id):id is string=>!!id);if(Array.isArray(value))return value.flatMap(refs);if(value&&typeof value==='object')return Object.values(value).flatMap(refs);return [];}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 try{
  let accessToken=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')??'';
  let media:{fileId:string;mode:string;exp:number;token:string}|null=null;
  if(req.method==='GET'){media=await openTicket(new URL(req.url).searchParams.get('ticket')??'');if(!media||media.exp<Date.now())return json({error:'File link expired. Reopen the file.'},401);accessToken=media.token;}
  else if(req.method!=='POST')return json({error:'Not available'},405);
  const parsed = media ? null : Input.safeParse(await req.json());
  if(parsed && !parsed.success)return json({error:'Choose a valid file or brand'},400);
  const input = parsed?.success ? parsed.data : null;
  const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:`Bearer ${accessToken}`}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await db.auth.getUser(accessToken);if(authError||!user||user.is_anonymous)return json({error:'Sign in required'},401);
  const {data:admin,error:roleError}=await db.rpc('has_role',{_user_id:user.id,_role:'admin'});if(roleError)throw roleError;
  const {data:client}=await db.rpc('has_role',{_user_id:user.id,_role:'client'});if(client&&!admin)return json({error:'Not available'},403);
  const metadata=new Map<string,Promise<DriveFile>>();
  const get=(id:string)=>{let p=metadata.get(id);if(!p){p=provider(`/files/${encodeURIComponent(id)}`,{fields:'id,name,mimeType,parents,trashed,size,thumbnailLink,webViewLink',supportsAllDrives:'true'}).then(r=>r.json());metadata.set(id,p);}return p;};
  const lists=new Map<string,Promise<DriveFile[]>>();
  const list=(id:string|null,folders=false):Promise<DriveFile[]>=>{const cacheKey=`${id}:${folders}`;const cached=lists.get(cacheKey);if(cached)return cached;const promise=(async()=>{let all:DriveFile[]=[];let page='';do{const r=await provider('/files',{q:`trashed=false${id?` and '${id}' in parents`:''}${folders?` and mimeType='${FOLDER}'`:''}`,fields:'nextPageToken,files(id,name,mimeType,parents,size,webViewLink)',pageSize:'1000',...(page?{pageToken:page}:{}),supportsAllDrives:'true',includeItemsFromAllDrives:'true'});const v=await r.json();all=all.concat(v.files??[]);page=v.nextPageToken??'';}while(page);return all.sort((a,b)=>a.name.localeCompare(b.name));})();lists.set(cacheKey,promise);return promise;};
  let kitQuery=db.from('brand_kits').select('id,project_id,brand_kit_links(url),venues(name)');
  if(input?.projectId)kitQuery=kitQuery.eq('project_id',input.projectId);
  else if(input?.projectIds?.length)kitQuery=kitQuery.in('project_id',input.projectIds);
  const {data:kits,error:kitError}=await kitQuery;if(kitError)throw kitError;
  let fallback:Promise<DriveFile[]>|undefined;
  const brands:BrandRoot[]=await Promise.all((kits??[]).map(async(k:any)=>{const name=k.venues?.name??'Brand';const ids=[...new Set<string>((k.brand_kit_links??[]).filter((l:any)=>/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(l.url)).map((l:any)=>driveId(l.url)).filter(Boolean))];
   const roots=ids.length?await Promise.all(ids.map(get)):(await (fallback??=list(null,true))).filter(r=>normalizeName(r.name)===normalizeName(name));
   return {projectId:k.project_id,name,roots:roots.filter(r=>r.mimeType===FOLDER&&!r.trashed),aliases:[name,...roots.map(r=>r.name)]};}));
  let storedRoots:string[]=[];
  // Arbitrary stored links are an admin-only exception; helper authorization never trusts mailbox links.
  if(admin && (media || input?.fileId)){for(const [table,columns] of [['agent_handoffs','id,spec,result,result_links'],['action_items','id,output_url,facts,detail']] as const){let offset=0;while(true){const {data,error}=await db.from(table).select(columns).range(offset,offset+999);if(error)throw error;storedRoots.push(...refs(data));if(!data||data.length<1000)break;offset+=1000;}}}
  const available=(id:string)=>fileAvailable(id,{admin:!!admin,brands,storedRoots},get);
  const check=async(id:string)=>{if(!await available(id))throw Object.assign(new Error('Not available'),{status:403});return get(id);};
  const text=async(id:string)=>{const f=await check(id);if(f.mimeType==='application/vnd.google-apps.document')return (await provider(`/files/${id}/export`,{mimeType:'text/plain'})).text();if(!/^(text\/|application\/json)/.test(f.mimeType)&&!f.name.toLowerCase().endsWith('.md'))throw new Error('Open this file in Drive.');if(Number(f.size)>2_000_000)throw new Error('This document is too large to read here. Open in Drive.');return (await provider(`/files/${id}`,{alt:'media'})).text();};
  if(media){const f=await check(media.fileId);let res:Response;
   if(media.mode==='thumbnail'){
    if(!f.thumbnailLink)return json({error:'No thumbnail available'},404);
    const thumb=new URL(f.thumbnailLink);if(thumb.protocol!=='https:'||!/(^|\.)googleusercontent\.com$/.test(thumb.hostname))return json({error:'Not available'},403);
    res=await fetch(thumb);if(!res.ok)return json({error:'No thumbnail available'},404);
   }else{if(!/^(image|video)\//.test(f.mimeType))return json({error:'Open this file in Drive'},415);
    const range=req.headers.get('range');if(range&&!/^bytes=\d*-\d*$/.test(range))return json({error:'Invalid file range'},400);
    res=await provider(`/files/${f.id}`,{alt:'media'},range?{Range:range}:{});
   }
   const h=new Headers(headers);h.set('Content-Type',res.headers.get('content-type')??f.mimeType);h.set('Accept-Ranges','bytes');
   for(const name of ['content-range','content-length']){const v=res.headers.get(name);if(v)h.set(name,v);}
   h.set('Content-Disposition',`${media.mode==='download'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(f.name)}`);
   return new Response(res.body,{status:res.status,headers:h});
  }
  if(!input)return json({error:'Choose a valid file or brand'},400);
  const selected=brands.filter(b=>!input.projectIds||input.projectIds.includes(b.projectId));
  async function slices(brand:BrandRoot){const dayFolders=(await list(READY)).filter(f=>f.mimeType===FOLDER&&/^\d{4}-\d{2}-\d{2}(?:\s|$)/.test(f.name));const now=new Date();const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const [y,m,d]=today.split('-').map(Number);const tomorrow=new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10);
   const result: {date:string;folder:DriveFile}[]=[];for(const day of dayFolders.filter(f=>[today,tomorrow].includes(f.name.slice(0,10))))for(const folder of await list(day.id))if(folder.mimeType===FOLDER&&brand.aliases.some(a=>normalizeName(a)===normalizeName(folder.name)))result.push({date:day.name.slice(0,10),folder});return result;
  }
  async function packageFrom(brand:BrandRoot,folder:DriveFile,date:string){const children=await list(folder.id);const doc=children.find(f=>f.mimeType==='application/vnd.google-apps.document'&&/^post this\s*[-–—]/i.test(f.name));const md=children.find(f=>f.name.toLowerCase().endsWith('.md')&&/copy|posting|notes/i.test(f.name));const caption=doc?await text(doc.id):md?await text(md.id):'';
   return {projectId:brand.projectId,brandName:brand.name,date,folder,caption,captions:postingCaptions(caption),captionFile:doc??md??null,files:children.filter(f=>/^(image|video)\//.test(f.mimeType))};
  }
  if(input.action==='brand'){const b=brands.find(b=>b.projectId===input.projectId);if(!b)return json({error:'Not available'},403);return json({roots:b.roots,ready:await slices(b),approvals:(await list(APPROVAL)).filter(f=>titleMatches(f.name,b.aliases))});}
  if(input.action==='posts'){return json({packages:(await Promise.all(selected.map(async b=>Promise.all((await slices(b)).map(s=>packageFrom(b,s.folder,s.date)))))).flat()});}
  if(!input.fileId)return json({error:'Choose a file'},400);const f=await check(input.fileId);
  if(input.action==='list'){if(f.mimeType!==FOLDER)return json({file:f});const children=await list(f.id);const allowed=admin?children:(await Promise.all(children.map(async c=>await available(c.id)?c:null))).filter(Boolean);return json({file:f,files:allowed});}
  if(input.action==='text')return json({file:f,text:await text(f.id)});
  if(input.action==='ticket'){const expires=Date.now()+30*60_000;return json({file:f,ticket:await ticket({fileId:f.id,mode:input.mode??'media',exp:expires,token:accessToken}),expires});}
  if(input.action==='mark'){
   const b=brands.find(b=>b.projectId===input.projectId);if(!b||!input.date||!input.channel)return json({error:'Choose a brand, date and platform'},400);
   // It must be the exact matching brand/day slice, not just any authorized folder.
   const slice=(await slices(b)).find(s=>s.folder.id===f.id&&s.date===input.date);if(!slice)return json({error:'Not available'},403);
   const pkg=await packageFrom(b,f,input.date);
   const service=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
   const {data,error}=await service.rpc('hq_mark_drive_daily_post_posted',{_actor_id:user.id,_project_id:b.projectId,_post_date:input.date,_folder_id:f.id,_snapshot:{caption:pkg.captions.find(c=>c.channel===input.channel)?.caption??pkg.caption,captions:pkg.captions,media:pkg.files.map(m=>({drive_file_id:m.id,name:m.name,kind:m.mimeType.startsWith('video/')?'video':'image'})),post_this_doc_url:pkg.captionFile?.webViewLink??(pkg.captionFile?`https://drive.google.com/file/d/${pkg.captionFile.id}/view`:null)},_channel:input.channel,_live_url:input.liveUrl??null,_note:input.note??null});if(error)throw error;return json(data);
  }
  return json({error:'Not available'},400);
 }catch(e){const error=e as Error&{status?:number};return json({error:error.message??'Could not open this file'},error.status??500);}
});
