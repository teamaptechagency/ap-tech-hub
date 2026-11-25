import {auth} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:Request){
 const s=await auth();if(!s?.user||!['SUPER_ADMIN','ADMIN'].includes(s.user.role))return Response.json({error:'Not authorized'},{status:403});
 if(request.headers.get('origin')!=='https://manage.aptechagency.com')return Response.json({error:'Invalid origin'},{status:403});
 const text=await request.text();if(text.length>1100000)return Response.json({error:'Request too large'},{status:413});
 try{const p=JSON.parse(text);if(typeof p.path!=='string'||p.path.length>160||!/^\/(?:[a-z0-9-]+\/?)*$|^$/.test(p.path))return Response.json({error:'Invalid operation'},{status:400});
 const token=process.env.AP_HUB_CHAT_TOKEN;if(!token)return Response.json({error:'AP Tech connection is not configured'},{status:503});
 const r=await fetch('http://127.0.0.1:8788/internal/hub-leads',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...p,userId:s.user.id}),signal:AbortSignal.timeout(120000),cache:'no-store'});
 return new Response(await r.text(),{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Lead service unavailable. Check status before retrying.'},{status:503});}
}
