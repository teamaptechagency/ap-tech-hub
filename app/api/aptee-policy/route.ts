import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultApteePolicy, validateApteePolicy } from "@/lib/aptee-policy";
const key="aptee.policy";
export async function GET() {
  const session=await auth();if(!session?.user||!["SUPER_ADMIN","ADMIN","CEO"].includes(session.user.role))return NextResponse.json({error:"Not authorized"},{status:403});
  const row=await prisma.setting.findUnique({where:{key}});let policy=defaultApteePolicy;
  try{if(row)policy=validateApteePolicy(JSON.parse(row.value));}catch{}
  return NextResponse.json({policy},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request) {
  const session=await auth();if(!session?.user||!["SUPER_ADMIN","ADMIN"].includes(session.user.role))return NextResponse.json({error:"Not authorized"},{status:403});
  const origin=request.headers.get("origin");
  try{if(!origin||new URL(origin).host!==request.headers.get("host"))throw Error();}catch{return NextResponse.json({error:"Invalid origin"},{status:403});}
  try{const text=await request.text();if(text.length>50000)throw Error("Settings are too large.");const policy=validateApteePolicy(JSON.parse(text));await prisma.setting.upsert({where:{key},create:{key,value:JSON.stringify(policy)},update:{value:JSON.stringify(policy)}});return NextResponse.json({policy,message:"Saved. Auto-orders remain pending until pricing, email and payment delivery are verified."});}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Check settings"},{status:400});}
}
