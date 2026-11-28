/** Extract only explicit caption blocks; never invent copy or scheduled/published state. */
export function postingCaptions(text:string):{channel:string;caption:string}[]{
 const aliases:Record<string,string>={instagram:'instagram',facebook:'facebook',tiktok:'tiktok',youtube:'youtube',pinterest:'pinterest',linkedin:'linkedin',google:'google',x:'x',twitter:'x',threads:'threads'};
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);const result:{channel:string;caption:string}[]=[];
 let platform='';let collecting=false;let copy:string[]=[];
 const finish=()=>{const caption=copy.join('\n').trim();if(platform&&caption)result.push({channel:platform,caption});copy=[];collecting=false;};
 for(const line of lines){const heading=line.trim().match(/^(INSTAGRAM|FACEBOOK|TIKTOK|YOUTUBE|PINTEREST|LINKEDIN|GOOGLE|TWITTER|THREADS|X)(?:\s*[-–—:]|\s*$)/i);
  if(heading){finish();platform=aliases[heading[1].toLowerCase()];continue;}
  if(/^\s*caption(?:\s*\([^)]*\))?\s*:/i.test(line)){finish();collecting=true;const first=line.replace(/^\s*caption(?:\s*\([^)]*\))?\s*:\s*/i,'');if(first)copy.push(first);continue;}
  if(collecting&&/^\s*(?:AI label|Hashtags: none|Photo credits|Full copy|When done|File:|Posting notes|Source(?:s)?\s*:)/i.test(line)){finish();continue;}
  if(collecting)copy.push(line);
 }
 finish();return result;
}
