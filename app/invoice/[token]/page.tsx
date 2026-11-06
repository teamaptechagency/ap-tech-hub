import { InvoiceProofForm } from "@/components/invoices/invoice-proof-form";
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
 const invoice=await prisma.invoice.findUnique({where:{id:share.key.slice("invoice.share.".length)},select:{number:true,title:true,currency:true,amount:true,amountPaid:true,status:true,dueDate:true,createdAt:true,vatPercent:true,methodChargeLabel:true,methodChargePercent:true,payoneerInvoiceUrl:true,payoneerInvoiceButtonLabel:true,payoneerInvoiceNote:true,externalName:true,client:{select:{companyName:true,contactName:true}},items:{select:{id:true,description:true,qty:true,amount:true}}}});if(!invoice)notFound();
 const paymentMethods=await prisma.paymentMethod.findMany({where:{active:true,key:{not:null}},orderBy:{sortOrder:"asc"},select:{id:true,key:true,label:true,details:true,instructions:true,warning:true,receiverNumber:true,accountType:true,wiseEmail:true,wiseAccountName:true,wisePaymentUrl:true,wiseTransferDetails:true,cashReceiverInfo:true,bankAccounts:{where:{active:true},orderBy:{sortOrder:"asc"},select:{id:true,bankName:true,accountName:true,accountNumber:true,branchName:true,routingNumber:true,swiftCode:true,currency:true,instructions:true}}}});
 const secureUrl=(value:string|null)=>{try{const url=new URL(value||"");return url.protocol==='https:'?url.href:null;}catch{return null;}};
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
   <section className="invoice-payments">
    <p className="invoice-eyebrow">PAYMENT OPTIONS</p><h2>How to pay</h2>
    {invoice.status==='CANCELLED'?<p>This invoice is cancelled. No payment is requested.</p>:invoice.status==='ON_HOLD'?<p>This invoice is on hold. Please contact the team before making a payment.</p>:remaining<=0?<p>This invoice is settled. No payment is required.</p>:<>
     <p className="invoice-payment-intro">Use invoice <strong>{invoice.number}</strong> as your payment reference. Amount remaining: <strong>{money(remaining)}</strong>.</p>
     <div className="invoice-payment-grid">{paymentMethods.map(method=><details name="invoice-payment-method" className="invoice-payment-card" key={method.id}><summary><span>{method.label}</span><span className="invoice-method-hint">View details</span></summary><div className="invoice-method-body">{method.details&&<p>{method.details}</p>}{method.receiverNumber&&<p><strong>Receiver:</strong> {method.receiverNumber}{method.accountType&&' · '+method.accountType}</p>}{method.wiseAccountName&&<p><strong>Account name:</strong> {method.wiseAccountName}</p>}{method.wiseEmail&&<p><strong>Email:</strong> {method.wiseEmail}</p>}{method.wiseTransferDetails&&<p>{method.wiseTransferDetails}</p>}{secureUrl(method.wisePaymentUrl)&&<a href={secureUrl(method.wisePaymentUrl)!} target="_blank" rel="noopener noreferrer">Open payment page →</a>}{method.cashReceiverInfo&&<p>{method.cashReceiverInfo}</p>}{method.bankAccounts.map(bank=><div className="invoice-bank" key={bank.id}><h4>{bank.bankName} · {bank.currency}</h4><p>Account name: {bank.accountName}</p><p>Account number: {bank.accountNumber}</p>{bank.branchName&&<p>Branch: {bank.branchName}</p>}{bank.routingNumber&&<p>Routing: {bank.routingNumber}</p>}{bank.swiftCode&&<p>SWIFT: {bank.swiftCode}</p>}{bank.instructions&&<p>{bank.instructions}</p>}</div>)}{method.instructions&&<p>{method.instructions}</p>}{method.warning&&<p className="invoice-payment-warning">{method.warning}</p>}<InvoiceProofForm token={token} currency={invoice.currency} remaining={remaining} method={{id:method.id,label:method.label}}/></div></details>)}</div>
     {secureUrl(invoice.payoneerInvoiceUrl)&&<div className="invoice-direct-payment"><a href={secureUrl(invoice.payoneerInvoiceUrl)!} target="_blank" rel="noopener noreferrer">{invoice.payoneerInvoiceButtonLabel||'Pay with Payoneer'} →</a>{invoice.payoneerInvoiceNote&&<p>{invoice.payoneerInvoiceNote}</p>}{paymentMethods.find(method=>method.key==='PAYONEER')&&<InvoiceProofForm token={token} currency={invoice.currency} remaining={remaining} method={paymentMethods.find(method=>method.key==='PAYONEER')!}/>}</div>}
     {!paymentMethods.length&&!secureUrl(invoice.payoneerInvoiceUrl)&&<p>Contact the team for payment details.</p>}
     <details className="invoice-processing"><summary>Processing time · Bank/global: up to 7 working days · Wise: 24–48 hours</summary><p>Recommended estimates for receipt and verification. Weekends, bank holidays and provider checks may affect timing. Upload proof after paying; Admin confirms receipt from the dashboard.</p></details>

    </>}
   </section>
   <footer className="invoice-paper-footer">{invoice.number} · All amounts in {invoice.currency}</footer>
  </article>
  <footer className="invoice-login print:hidden"><div><h2>Manage your invoice online</h2><p>Sign in to view payments and your other invoices.</p></div><Link href="/login">Login to your account <span aria-hidden="true">→</span></Link></footer>
 </main>;
}
