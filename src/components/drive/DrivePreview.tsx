import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Copy, Download, ExternalLink, FileText, FolderOpen, Loader2, RefreshCw, ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { driveCall, driveId, streamUrl, type DriveFile } from '@/lib/brandDrive';
import { useDriveTicket, useBrandDrive } from '@/hooks/useBrandDrive';
import { toast } from 'sonner';
const isFolder=(f:DriveFile)=>f.mimeType==='application/vnd.google-apps.folder';
async function copy(text:string){try{await navigator.clipboard.writeText(text);toast.success('Copied.');}catch{toast.error('Could not copy.');}}
export function DriveLink({href,children,projectId,className}:{href:string;children:React.ReactNode;projectId?:string;className?:string}){
 const [open,setOpen]=useState(false);const id=driveId(href);
 if(!id)return <a href={href} target="_blank" rel="noreferrer" className={className}>{children}</a>;
 return <><Button variant="outline" size="sm" className={className} onClick={()=>setOpen(true)}><FolderOpen className="mr-1.5 h-4 w-4 shrink-0"/><span className="break-words whitespace-normal text-left">{children}</span></Button>{open&&<DrivePreview fileId={id} projectId={projectId} onClose={()=>setOpen(false)}/>}</>;
}
export function DriveFileTile({file,projectId}:{file:DriveFile;projectId?:string}){
 const [open,setOpen]=useState(false);const [visible,setVisible]=useState(false);const element=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=element.current;if(!el)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'200px'});observer.observe(el);return()=>observer.disconnect();},[]);
 const thumb=useDriveTicket(file.id,'thumbnail',visible&&/^(image|video)\//.test(file.mimeType),projectId);
 return <div ref={element} className="min-w-0 space-y-2"><Button variant="outline" className="h-auto w-full p-0 overflow-hidden flex-col" onClick={()=>setOpen(true)} aria-label={`Open ${file.name}`}>
 <div className="aspect-video w-full bg-muted flex items-center justify-center relative">{thumb.data?<img src={thumb.data.url} alt={file.name} loading="lazy" className="w-full h-full object-contain"/>:file.mimeType.startsWith('video/')?<Play className="h-6 w-6"/>:isFolder(file)?<FolderOpen className="h-6 w-6"/>:<FileText className="h-6 w-6"/>}</div><span className="p-2 w-full text-left text-sm whitespace-normal break-words">{file.name}</span></Button>
 {/^(image|video)\//.test(file.mimeType)&&<SaveFile file={file}/>}{open&&<DrivePreview fileId={file.id} projectId={projectId} onClose={()=>setOpen(false)}/>}</div>;
}
function SaveFile({file}:{file:DriveFile}){
 const [busy,setBusy]=useState(false);
 const save=async()=>{setBusy(true);try{const data=await driveCall<{ticket:string}>({action:'ticket',fileId:file.id,mode:'download'});const a=document.createElement('a');a.href=streamUrl(data.ticket);a.download=file.name;a.rel='noreferrer';document.body.appendChild(a);a.click();a.remove();}catch(e){toast.error(e instanceof Error?e.message:'Could not save file.');}finally{setBusy(false);}};
 return <Button variant="outline" size="sm" disabled={busy} onClick={save}><Download className="h-4 w-4 mr-1.5"/>{busy?'Preparing…':'Save to phone'}</Button>;
}
export function DrivePreview({fileId,projectId,onClose}:{fileId:string;projectId?:string;onClose:()=>void}){
 const {user}=useAuth();
 const [path,setPath]=useState<string[]>([fileId]);const id=path[path.length-1]??fileId;
 const q=useQuery({queryKey:['drive-folder',user?.id,id],enabled:!!user,queryFn:()=>driveCall<{file:DriveFile;files?:DriveFile[]}>({action:'list',fileId:id}),staleTime:25_000,refetchInterval:30_000,retry:false});
 const f=q.data?.file;
 return <Sheet open onOpenChange={o=>!o&&onClose()}><SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto pb-24"><SheetHeader className="text-left"><SheetTitle className="pr-6 break-words">{f?.name??'Drive files'}</SheetTitle><SheetDescription>Files stay in Google Drive.</SheetDescription></SheetHeader>
 <div className="mt-4 space-y-4"><div className="flex gap-2 flex-wrap">{path.length>1&&<Button size="sm" variant="outline" onClick={()=>setPath(p=>p.slice(0,-1))}><ArrowLeft className="h-4 w-4 mr-1.5"/>Back</Button>}<Button size="sm" variant="outline" onClick={()=>q.refetch()} aria-label="Refresh Drive files"><RefreshCw className="h-4 w-4"/></Button>
 {f&&!q.isError&&<Button asChild size="sm" variant="outline"><a href={f.webViewLink??`https://drive.google.com/${isFolder(f)?'drive/folders/':'file/d/'}${id}${isFolder(f)?'':'/view'}`} target="_blank" rel="noreferrer">Open in Drive <ExternalLink className="h-4 w-4 ml-1.5"/></a></Button>}</div>
 {q.isPending&&<p role="status" className="flex gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin"/>Opening files…</p>}{q.isError&&<p role="alert" className="text-sm text-destructive">{q.error.message}</p>}
 {f&&isFolder(f)&&<><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{q.data?.files?.map(child=>isFolder(child)?<Button key={child.id} variant="outline" className="min-h-20 h-auto whitespace-normal text-left justify-start" onClick={()=>setPath(p=>[...p,child.id])}><FolderOpen className="mr-2 h-5 w-5 shrink-0"/><span className="break-words">{child.name}</span></Button>:<DriveFileTile key={child.id} file={child} projectId={projectId}/>)}</div>{!q.data?.files?.length&&<p className="text-sm text-muted-foreground">No files here yet.</p>}</>}
 {f&&!isFolder(f)&&<FileContents file={f} projectId={projectId}/>}</div></SheetContent></Sheet>;
}
function FileContents({file,projectId}:{file:DriveFile;projectId?:string}){
 const {user}=useAuth();
 const media=/^(image|video)\//.test(file.mimeType);const video=file.mimeType.startsWith('video/');const [failed,setFailed]=useState(false);const source=useDriveTicket(file.id,'media',media,projectId);
 const readable=file.mimeType==='application/vnd.google-apps.document'||file.mimeType.startsWith('text/')||file.name.toLowerCase().endsWith('.md');
 const text=useQuery({queryKey:['drive-text',user?.id,file.id],enabled:!!user&&readable,queryFn:()=>driveCall<{text:string}>({action:'text',fileId:file.id}),staleTime:25_000,refetchInterval:30_000,retry:false});
 return <div className="space-y-4">{media&&source.isPending&&<p role="status" className="text-sm">Opening preview…</p>}{source.error&&<p role="alert" className="text-sm text-destructive">{source.error.message}</p>}
 {source.data&&!failed&&(video?<video src={source.data.url} controls playsInline preload="metadata" className="w-full max-h-[65vh] bg-muted" onError={()=>setFailed(true)}/>:<img src={source.data.url} alt={file.name} className="w-full max-h-[70vh] object-contain" onError={()=>setFailed(true)}/>)}
 {failed&&<p role="status" className="text-sm">This {video?'video':'image'} cannot open inside HQ. Use Open in Drive {video?'for Drive’s own player.': 'to view it.'}</p>}{media&&<SaveFile file={file}/>}
 {readable&&<>{text.isPending&&<p className="text-sm">Reading document…</p>}{text.error&&<p role="alert" className="text-sm text-destructive">{text.error.message}</p>}{text.data&&<><Button variant="outline" size="sm" onClick={()=>copy(text.data.text)}><Copy className="h-4 w-4 mr-1.5"/>Copy</Button><div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text.data.text}</div></>}</>}
 {!media&&!readable&&<p className="text-sm text-muted-foreground">Open this file in Drive.</p>}</div>;
}
export function BrandDriveFiles({projectId}:{projectId:string}){
 const q=useBrandDrive(projectId);
 return <section className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Drive files</h3><Button size="sm" variant="outline" onClick={()=>q.refetch()} aria-label="Refresh brand Drive files"><RefreshCw className="h-4 w-4"/></Button></div>
 {q.isPending&&<p className="text-sm">Opening brand folders…</p>}{q.error&&<p role="alert" className="text-sm text-destructive">{q.error.message}</p>}{q.data&&<><div className="flex flex-wrap gap-2">{q.data.roots.map(f=><DriveLink key={f.id} href={`https://drive.google.com/drive/folders/${f.id}`} projectId={projectId}>{f.name}</DriveLink>)}</div>{!q.data.roots.length&&<p className="text-sm text-muted-foreground">No brand folder available.</p>}<h4 className="font-semibold text-base">Ready to post</h4><div className="flex flex-wrap gap-2">{q.data.ready.map(s=><DriveLink key={s.folder.id} href={`https://drive.google.com/drive/folders/${s.folder.id}`} projectId={projectId}>{s.date} · {s.folder.name}</DriveLink>)}</div>{!q.data.ready.length&&<p className="text-sm text-muted-foreground">No folders for today or tomorrow yet.</p>}<h4 className="font-semibold text-base">For your approval</h4><div className="flex flex-wrap gap-2">{q.data.approvals.map(f=><DriveLink key={f.id} href={`https://drive.google.com/file/d/${f.id}/view`} projectId={projectId}>{f.name}</DriveLink>)}</div>{!q.data.approvals.length&&<p className="text-sm text-muted-foreground">No approval files for this brand.</p>}</>}</section>;
}
