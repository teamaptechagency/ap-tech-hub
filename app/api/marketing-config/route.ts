import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const key = "marketing.aptech.v1";
const headers = {"Access-Control-Allow-Origin":"https://aptechagency.com","Cache-Control":"no-store"};
export async function GET() {
  const row=await prisma.setting.findUnique({where:{key}});
  const config=row?JSON.parse(row.value):{ga4:"",pixel:""};
  return Response.json({ga4:config.ga4||"",pixel:config.pixel||""},{headers});
}
export async function POST(request:Request) {
  const session=await auth();
  if(!session?.user||session.user.role!=="SUPER_ADMIN")return Response.json({error:"Not authorized"},{status:403});
  if(request.headers.get("origin")!=="https://manage.aptechagency.com" && !(process.env.NODE_ENV!=="production"&&new URL(request.url).origin===request.headers.get("origin")))return Response.json({error:"Invalid origin"},{status:403});
  const p=await request.json();
  const ga4=String(p.ga4||"").trim(),pixel=String(p.pixel||"").trim();
  if((ga4&&!/^G-[A-Z0-9]{5,20}$/.test(ga4))||(pixel&&!/^\d{5,25}$/.test(pixel)))return Response.json({error:"Enter a valid GA4 Measurement ID and Meta Pixel ID."},{status:400});
  const value=JSON.stringify({ga4,pixel});
  await prisma.setting.upsert({where:{key},create:{key,value},update:{value}});
  return Response.json({ok:true});
}
