import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
export async function POST(request:Request){
  const session=await auth();
  if(!session?.user||!["SUPER_ADMIN","ADMIN"].includes(session.user.role))return NextResponse.json({error:"Not authorized"},{status:403});
  try{
    const origin=request.headers.get("origin");if(!origin||new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Invalid origin"},{status:403});
    const text=await request.text();if(text.length>150000)return NextResponse.json({error:"Request too large"},{status:413});
    const input=JSON.parse(text);if(!["settings","settings.save","test","folders","list","read","send","open"].includes(input.op))return NextResponse.json({error:"Unsupported action"},{status:400});
    if(!process.env.AP_HUB_CHAT_TOKEN)throw Error();
    const response=await fetch("http://127.0.0.1:8788/internal/hub-mail",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AP_HUB_CHAT_TOKEN}`},body:JSON.stringify(input),cache:"no-store",signal:AbortSignal.timeout(90000)});
    return NextResponse.json(await response.json(),{status:response.status,headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Mailbox request failed. If sending, check Sent before retrying."},{status:503});}
}
