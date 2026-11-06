import { InvoiceBrand } from "@/components/invoices/invoice-brand";
import "./invoice.css";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/agreement/print-button";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Invoice | AP Tech Agency",referrer:"no-referrer",robots:{index:false,follow:false}};
export default async function SharedInvoice({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[a-f0-9]{64}$/.test(token))notFound();
 const share=await prisma.setting.findFirst({where:{key:{startsWith:"invoice.share."},value:token},select:{key:true}});if(!share)notFound();
 const invoice=await prisma.invoice.findUnique({where:{id:share.key.slice("invoice.share.".length)},select:{number:true,title:true,currency:true,amount:true,amountPaid:true,status:true,dueDate:true,createdAt:true,vatPercent:true,methodChargeLabel:true,methodChargePercent:true,externalName:true,client:{select:{companyName:true,contactName:true}},items:{select:{id:true,description:true,qty:true,amount:true}}}});if(!invoice)notFound();
 const money=(value:number)=>`${invoice.currency} ${value.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 const date=(value:Date)=>value.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Dhaka"});
 const total=Number(invoice.amount),paid=Number(invoice.amountPaid),remaining=Math.max(0,total-paid);
 const displayStatus=invoice.status==='DUE'&&invoice.dueDate<new Date()?'OVERDUE':invoice.status;
 return <main className="shared-invoice-shell">
  <div className="invoice-toolbar print:hidden"><Link href="/">AP Tech Agency</Link><PrintButton/></div>
  <article className="invoice-paper">
   <header className="invoice-header"><InvoiceBrand/><div className="invoice-heading"><p className="invoice-eyebrow">INVOICE</p><h1>{invoice.number}</h1><span className={"invoice-status "+(displayStatus==='PAID'?'invoice-paid':'')}>{displayStatus.replaceAll('_',' ')}</span></div></header>
   <section className="invoice-details"><div><p className="invoice-eyebrow">BILL TO</p><h2>{invoice.client?.companyName||invoice.client?.contactName||invoice.externalName||"Customer"}</h2>{invoice.title&&<p className="invoice-description">{invoice.title}</p>}</div><dl><div><dt>Issue date</dt><dd>{date(invoice.createdAt)}</dd></div><div><dt>Due date</dt><dd>{date(invoice.dueDate)}</dd></div><div><dt>Currency</dt><dd>{invoice.currency}</dd></div></dl></section>
   <div className="invoice-table-scroll"><table className="invoice-table"><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody>{invoice.items.map(item=><tr key={item.id}><td>{item.description}</td><td>{item.qty}</td><td>{money(Number(item.amount))}</td><td>{money(item.qty*Number(item.amount))}</td></tr>)}{!invoice.items.length&&<tr><td>{invoice.title||"Services"}</td><td>—</td><td>—</td><td>{money(total)}</td></tr>}</tbody></table></div>
   <section className="invoice-summary"><div className="invoice-note"><p className="invoice-eyebrow">THANK YOU FOR YOUR BUSINESS</p><p>Keep this invoice for your records.</p>{Number(invoice.vatPercent)>0&&<p>VAT included: {Number(invoice.vatPercent)}%</p>}{Number(invoice.methodChargePercent)>0&&<p>{invoice.methodChargeLabel||"Payment method charge"}: {Number(invoice.methodChargePercent)}% included</p>}</div><dl><div><dt>Invoice total</dt><dd>{money(total)}</dd></div><div><dt>Amount paid</dt><dd>{money(paid)}</dd></div><div className="invoice-due"><dt>Amount remaining</dt><dd>{money(remaining)}</dd></div></dl></section>
   <footer className="invoice-paper-footer">{invoice.number} · All amounts in {invoice.currency}</footer>
  </article>
  <footer className="invoice-login print:hidden"><div><h2>Manage your invoice online</h2><p>Sign in to view payments and your other invoices.</p></div><Link href="/login">Login to your account <span aria-hidden="true">→</span></Link></footer>
 </main>;
}
