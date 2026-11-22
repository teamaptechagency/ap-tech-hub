import { NextResponse } from "next/server";
import { wpNazmulAccess } from "@/lib/wpnazmul-access";
export const runtime="nodejs";
async function proxy(request:Request,context:{params:Promise<{path:string[]}>}){
  if(!await wpNazmulAccess())return NextResponse.json({error:{message:"WP Nazmul access is restricted to the owner and Super Admin."}},{status:403});
  const {path}=await context.params;
  if(path.some(p=>!p||!/^[a-zA-Z0-9._-]+$/.test(p)||p===".."))return NextResponse.json({error:{message:"Invalid path"}},{status:400});
  const [area,...parts]=path;
  if(!["workspace","legacy"].includes(area))return NextResponse.json({error:{message:"Unknown integration"}},{status:404});
  const suffix=parts.join('/');
  if(area==="legacy"&&!/^(session|admin\/(dashboard|profile|entries(?:\/\d+)?|messages\/\d+|upload))$/.test(suffix))return NextResponse.json({error:{message:"Unsupported operation"}},{status:403});
  if(area==="workspace"&&(!suffix||/^(logout|login|register)(\/|$)/.test(suffix)))return NextResponse.json({error:{message:"Unsupported operation"}},{status:403});
  if(!["GET","HEAD"].includes(request.method)){
    const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==request.headers.get('host'))return NextResponse.json({error:{message:"Invalid origin"}},{status:403});
  }
  if(!process.env.WPN_HUB_TOKEN)return NextResponse.json({error:{message:"WP Nazmul connection is not configured."}},{status:503});
  try{
    const incoming=new URL(request.url);
    const inbox=area==='workspace'&&/^inbox(?:\/sync-mail|\/\d+(?:\/references|\/save-draft)?)?$/.test(suffix);
    const target=new URL(inbox?'/api/admin/hub-'+suffix.replace('/save-draft','/draft'):(area==="workspace"?'/api/v1/admin/':'/api/')+suffix,'http://127.0.0.1:18027');target.search=incoming.search;
    const headers=new Headers({Accept:'application/json',Authorization:`Bearer ${process.env.WPN_HUB_TOKEN}`,'X-AP-Tech-Hub':'1'});
    for(const key of ['content-type','idempotency-key']){const value=request.headers.get(key);if(value)headers.set(key,value);}
    const body=['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer();if(body&&body.byteLength>12*1024*1024)return NextResponse.json({error:{message:"Upload too large"}},{status:413});
    const result=await fetch(target,{method:request.method,headers,body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(90000)});
    const type=result.headers.get('content-type')||'';
    if(request.method==='GET'&&area==='workspace'&&suffix.endsWith('/download')&&result.ok){
      return new Response(result.body,{headers:{'Content-Type':type||'application/octet-stream','Content-Disposition':result.headers.get('content-disposition')||'attachment','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(!type.includes('application/json')&&result.status!==204)return NextResponse.json({error:{message:"Unexpected response from WP Nazmul."}},{status:502});
    return new Response(result.status===204?null:await result.text(),{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(result.headers.get('retry-after')?{'Retry-After':result.headers.get('retry-after')!}:{})}});
  }catch{return NextResponse.json({error:{message:"WP Nazmul is temporarily unavailable. Check status before retrying a change."}},{status:503});}
}
export {proxy as GET,proxy as POST,proxy as PUT,proxy as PATCH,proxy as DELETE};
