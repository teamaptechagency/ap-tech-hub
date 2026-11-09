"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {decideMessageDeletion} from "@/actions/message-deletion.actions";
export function MessageDeletionReview({requests}:{requests:{key:string;messageId:string;requestedAt:string}[]}){
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);const router=useRouter();
 async function decide(key:string,approve:boolean){setBusy(true);try{const result=await decideMessageDeletion(key,approve);if("error"in result)setMessage(result.error||"Failed");else router.refresh();}catch{setMessage("Could not review request. Retry.");}finally{setBusy(false);}}
 return <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Message deletion requests</h2>{requests.length?requests.map(request=><article key={request.key} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><p className="flex-1 break-all text-sm">Message {request.messageId} · {new Date(request.requestedAt).toLocaleString()}</p><button disabled={busy} className="rounded border px-3 py-2 text-sm" onClick={()=>void decide(request.key,true)}>Approve deletion</button><button disabled={busy} className="rounded border px-3 py-2 text-sm" onClick={()=>void decide(request.key,false)}>Reject</button></article>):<p className="text-sm text-muted-foreground">No pending requests.</p>}{message&&<p role="alert">{message}</p>}</section>;
}
