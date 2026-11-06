import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
export async function InvoiceProofReview({invoiceId}:{invoiceId:string}){
 const session=await auth();if(!session?.user)return null;
 const user=await prisma.user.findFirst({where:{id:session.user.id,accountStatus:"ACTIVE"},select:{role:true}});if(!user||!ADMIN_ROLES.includes(user.role))return null;
 const records=await prisma.setting.findMany({where:{key:{startsWith:`invoice.proof.${invoiceId}.`}},orderBy:{key:"desc"},take:50});
 const proofs=records.flatMap(row=>{try{const value=JSON.parse(row.value);return typeof value.attachmentId==='string'?[value as {attachmentId:string;amount:number;currency:string;method:string;senderName:string;transactionId:string;paymentDate:string;note:string;createdAt:string;submissionId:string|null}]:[];}catch{return [];}});
 if(!proofs.length)return null;
 const attachments=await prisma.attachment.findMany({where:{id:{in:proofs.map(p=>p.attachmentId)}},select:{id:true,url:true}});
 return <section className="space-y-4 rounded-xl border p-5 print:hidden"><h2 className="text-lg font-semibold">Payment proofs from invoice link</h2><p className="text-sm text-muted-foreground">Submitted amounts are unverified. Check your receiving account before approving a payment or marking the invoice paid. Linked-client proofs use the existing approval controls; external invoices use Record payment / Mark paid below.</p>{proofs.map(proof=><article key={proof.attachmentId} className="space-y-2 rounded-lg border p-4"><p className="font-semibold">{proof.currency} {Number(proof.amount).toFixed(2)} · {proof.method}</p><p className="text-sm">{proof.senderName} · {proof.paymentDate} · Reference: {proof.transactionId}</p>{proof.note&&<p className="whitespace-pre-wrap text-sm">{proof.note}</p>}{attachments.find(a=>a.id===proof.attachmentId)&&<a className="text-sm text-primary underline" target="_blank" rel="noopener noreferrer" href={'/api/files?url='+encodeURIComponent(attachments.find(a=>a.id===proof.attachmentId)!.url)+'&disposition=attachment'}>Download private proof</a>}</article>)}</section>;
}
