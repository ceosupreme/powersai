import { brandIdentity } from '@/lib/brandIdentity';
export function BrandIdentity({id, name}: {id:string;name:string}) {
  const identity = brandIdentity(id, name);
  return <div className="hq-brand-identity flex items-center gap-4 rounded-lg p-4" style={{backgroundColor:identity.color, color:'#fff'}}>
    <span aria-hidden="true" className="shrink-0 text-2xl font-extrabold tracking-wider border border-white/50 rounded-lg px-3 py-2">{identity.initials}</span>
    <span className="text-lg font-bold leading-snug break-words">{name}</span>
  </div>;
}
