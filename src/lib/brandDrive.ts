import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
export { driveId } from '../../supabase/functions/brand-drive/safety';
export interface DriveFile { id:string; name:string; mimeType:string; size?:string; webViewLink?:string }
export interface DrivePackage { projectId:string; brandName:string; date:string; folder:DriveFile; caption:string; captions?:{channel:string;caption:string}[]; captionFile:DriveFile|null; files:DriveFile[] }
export async function driveCall<T>(body:Record<string,unknown>):Promise<T>{
 const {data,error}=await supabase.functions.invoke('brand-drive',{body});
 if(error){let message=error.message;if(error instanceof FunctionsHttpError){const raw=await error.context.text();try{message=JSON.parse(raw).error??raw;}catch{message=raw;}}throw new Error(message);}
 return data as T;
}
export function streamUrl(ticket:string){return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-drive?ticket=${encodeURIComponent(ticket)}`;}
