import { randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sameOriginWrite } from "@/lib/workstation-access";
export const runtime="nodejs";
const MAX=4*1024*1024;
const fields=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),operationId:z.string().uuid(),amount:z.string().regex(/^\d{1,9}(\.\d{1,2})?$/),methodId:z.string().min(1).max(100),paymentDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),transactionId:z.string().trim().min(1).max(150),senderName:z.string().trim().min(2).max(120),note:z.string().trim().max(1000)});
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request){
 let uploaded:string|null=null;
 try{
  if(!sameOriginWrite(request))return reply({error:"Cross-origin request rejected"},403);
  if(Number(request.headers.get("content-length")||0)>MAX+20000)return reply({error:"Maximum proof size is 4 MB"},413);
  if(!request.body)return reply({error:"Upload a payment proof"},400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>MAX+20000){await reader.cancel();return reply({error:"Maximum proof size is 4 MB"},413);}chunks.push(part.value);}
  const bounded=new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")||""},body:Buffer.concat(chunks)});
  const form=await bounded.formData();const parsed=fields.safeParse(Object.fromEntries([...form.entries()].filter(([key])=>key!=="file")));if(!parsed.success)return reply({error:"Check payment fields and reference"},400);
  const data=parsed.data,file=form.get("file");if(!(file instanceof File)||!file.size||file.size>MAX)return reply({error:"Upload one JPG, PNG, WebP or PDF, up to 4 MB"},400);
  const share=await prisma.setting.findFirst({where:{key:{startsWith:"invoice.share."},value:data.token},select:{key:true}});if(!share)return reply({error:"Invoice link is invalid or disabled"},404);
  const invoiceId=share.key.slice("invoice.share.".length),operationKey=`invoice.proof.${invoiceId}.${data.operationId}`;
  if(await prisma.setting.findUnique({where:{key:operationKey}}))return reply({success:true});
  const invoice=await prisma.invoice.findUnique({where:{id:invoiceId},select:{id:true,number:true,clientId:true,status:true,amount:true,amountPaid:true,currency:true}});
  if(!invoice||["PAID","CANCELLED","ON_HOLD"].includes(invoice.status))return reply({error:"This invoice is not accepting payment proofs"},409);
  const amount=Number(data.amount),date=new Date(data.paymentDate+"T00:00:00+06:00");if(!Number.isFinite(amount)||amount<=0||amount>Number(invoice.amount)-Number(invoice.amountPaid)+0.01||!Number.isFinite(date.getTime())||date.getTime()>Date.now()+86400000)return reply({error:"Check paid amount and payment date"},400);
  const method=await prisma.paymentMethod.findFirst({where:{id:data.methodId,active:true,key:{not:null}},select:{id:true,key:true,label:true}});if(!method)return reply({error:"Choose an active payment method"},400);
  // Claim a bounded attempt before storing any bytes. Serializable isolation
  // prevents simultaneous requests bypassing this invoice's daily limit.
  const day=new Date().toISOString().slice(0,10),limitKey=`invoice.proof.limit.${invoiceId}.${day}`;
  await prisma.$transaction(async tx=>{const row=await tx.setting.findUnique({where:{key:limitKey}});const count=Number(row?.value||0);if(count>=5)throw Error("LIMIT");await tx.setting.upsert({where:{key:limitKey},create:{key:limitKey,value:"1"},update:{value:String(count+1)}});},{isolationLevel:"Serializable"});
  let bytes=Buffer.from(await file.arrayBuffer()),type="application/pdf",extension="pdf";
  if(file.type==='application/pdf'){if(bytes.subarray(0,5).toString()!=='%PDF-')return reply({error:"Invalid PDF file"},400);}
  else if(["image/jpeg","image/png","image/webp"].includes(file.type)){bytes=await sharp(bytes,{limitInputPixels:25000000}).rotate().resize({width:2200,height:2200,fit:"inside",withoutEnlargement:true}).webp({quality:85}).toBuffer();type="image/webp";extension="webp";}
  else return reply({error:"Only JPG, PNG, WebP or PDF proof files are accepted"},400);
  const blob=await put(`invoice-proofs/${invoiceId}/${randomUUID()}.${extension}`,bytes,{access:"private",contentType:type,token:process.env.private_READ_WRITE_TOKEN});uploaded=blob.url;
  await prisma.$transaction(async tx=>{
   const currentShare=await tx.setting.findUnique({where:{key:share.key}});if(currentShare?.value!==data.token)throw Error("REVOKED");
   const current=await tx.invoice.findUnique({where:{id:invoiceId},select:{status:true,amount:true,amountPaid:true}});if(!current||["PAID","CANCELLED","ON_HOLD"].includes(current.status)||amount>Number(current.amount)-Number(current.amountPaid)+0.01)throw Error("STATE");
   let submissionId:string|null=null;
   if(invoice.clientId){const submission=await tx.paymentSubmission.create({data:{invoiceId,clientId:invoice.clientId,paymentMethodId:method.id,methodKey:method.key!,methodLabel:method.label,amount,currency:invoice.currency,paymentDate:date,transactionId:data.transactionId,senderName:data.senderName,note:`Submitted via invoice share link. ${data.note}`,status:"PENDING"}});submissionId=submission.id;}
   const attachment=await tx.attachment.create({data:{url:blob.url,name:`Payment-proof-${data.operationId}.${extension}`,mimeType:type,size:bytes.length,paymentSubmissionId:submissionId}});
   await tx.setting.create({data:{key:operationKey,value:JSON.stringify({attachmentId:attachment.id,invoiceId,submissionId,amount,currency:invoice.currency,method:method.label,paymentDate:data.paymentDate,transactionId:data.transactionId,senderName:data.senderName,note:data.note,createdAt:new Date().toISOString()})}});
   await tx.invoice.update({where:{id:invoiceId},data:{status:"PAYMENT_SUBMITTED",submittedAt:new Date(),paymentNote:`${method.label} proof submitted · claimed ${amount.toFixed(2)} · ref ${data.transactionId}`}});
   const admins=await tx.user.findMany({where:{role:{in:["SUPER_ADMIN","ADMIN","CEO"]},accountStatus:"ACTIVE"},select:{id:true}});if(admins.length)await tx.notification.createMany({data:admins.map(admin=>({userId:admin.id,title:"Invoice payment proof received",body:`${invoice.number} · ${invoice.currency} ${amount.toFixed(2)} · awaiting verification`,href:`/invoices/${invoiceId}`}))});
  },{isolationLevel:"Serializable"});
  uploaded=null;return reply({success:true});
 }catch(error){if(uploaded)try{await del(uploaded,{token:process.env.private_READ_WRITE_TOKEN});}catch{}return reply({error:error instanceof Error&&error.message==="LIMIT"?"Daily upload limit reached. Please contact the team.":"Could not submit proof. Please retry; payment has not been marked paid."},409);}
}
