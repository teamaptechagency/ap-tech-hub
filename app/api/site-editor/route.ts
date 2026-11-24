import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
async function handle(request:Request){
  const session=await auth();
  if(!session?.user)return Response.json({error:"Not authorized"},{status:403});
  const user=await prisma.user.findUnique({where:{id:session.user.id},select:{role:true,accountStatus:true}});
  if(user?.accountStatus!=="ACTIVE"||!["SUPER_ADMIN","ADMIN"].includes(user.role))return Response.json({error:"Not authorized"},{status:403});
  if(request.method==='POST'){
    const origin=request.headers.get('origin');if(!origin||new URL(origin).host!==request.headers.get('host'))return Response.json({error:'Invalid origin'},{status:403});
  }
  if(!process.env.AP_HUB_CHAT_TOKEN)return Response.json({error:'Website connection unavailable'},{status:503});
  try{
    const body=request.method==='POST'?await request.text():undefined;
    if(body&&Buffer.byteLength(body)>1000000)return Response.json({error:'Request too large'},{status:413});
    const r=await fetch('http://127.0.0.1:8788/internal/hub-site-editor',{method:request.method,headers:{Authorization:`Bearer ${process.env.AP_HUB_CHAT_TOKEN}`,'Content-Type':'application/json'},body,cache:'no-store',signal:AbortSignal.timeout(30000)});
    return Response.json(await r.json(),{status:r.status,headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Website editor is unavailable. Your public site has not been changed.'},{status:503});}
}
export const GET=handle;
export const POST=handle;
