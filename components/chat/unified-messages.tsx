"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {EndedLiveChats} from "./quick-live-panel";
import { WebsiteMail } from "@/components/chat/website-mail";
import { useSearchParams } from "next/navigation";
type Conversation={id:string;name:string;email:string;mode:string;status:string;updated:string};
type Message={id:string;actor:string;text:string;created:string};
async function chat(input: Record<string,unknown>){
  const response=await fetch("/api/website-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
  const data=await response.json();if(!response.ok)throw Error(data.error||"Unable to load website chat");return data;
}
export function UnifiedMessages({children}:{children:ReactNode}){
  const search=useSearchParams();
  const [tab,setTab]=useState(search.get('tab')==='ended'?'ended':search.get('tab')==='mail'?'mail':search.get('tab')==='hub'?'hub':'website');
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [id,setId]=useState(search.get('conversation')||'');const [messages,setMessages]=useState<Message[]>([]);
  const [mobileThread,setMobileThread]=useState(Boolean(search.get("conversation")));
  const [selected,setSelected]=useState<Conversation|null>(null);
  const [error,setError]=useState("");const [text,setText]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(tab!=="website")return;let active=true;let pending=false;
    const load=async()=>{if(pending)return;pending=true;try{
      const data=await chat({op:"state"});if(!active)return;setConversations(data.conversations);
      const target=id||data.conversations[0]?.id;if(!id&&target){setId(target);return;}
      if(target){const detail=await chat({op:"read",id:target});if(active){setMessages(detail.messages);setSelected(detail.conversation);}}
      if(active)setError("");
    }catch(e){if(active)setError(e instanceof Error?e.message:"Connection failed");}finally{pending=false;}};
    void load();const timer=setInterval(load,3000);return()=>{active=false;clearInterval(timer);};
  },[id,tab]);
  async function action(input:Record<string,unknown>){setBusy(true);try{await chat(input);const data=await chat({op:"read",id});setMessages(data.messages);setSelected(data.conversation);setError("");return true;}catch(e){setError(e instanceof Error?e.message:"Action failed");return false;}finally{setBusy(false);}}
  return <div className={`hub-unified-messages space-y-4 ${tab==="website"?"hub-live-screen":""} ${mobileThread?"mobile-thread-open":""}`}>
    <div className="hub-message-tabs flex flex-wrap gap-2"><Button variant={tab==="website"?"default":"outline"} onClick={()=>setTab("website")}>Live chat</Button><Button variant={tab==="hub"?"default":"outline"} onClick={()=>setTab("hub")}>Projects & team</Button><Button variant={tab==="mail"?"default":"outline"} onClick={()=>setTab("mail")}>Mail</Button><Button variant={tab==="ended"?"default":"outline"} onClick={()=>setTab("ended")}>Ended chats</Button></div>
    {tab==="ended"?<EndedLiveChats/>:tab==="mail"?<WebsiteMail/>:tab==="hub"?children:<>
      <div><h1 className="text-2xl font-bold">Website live chat</h1><p className="text-sm text-muted-foreground">Visitor and Aptee conversations · Updates automatically every 3 seconds</p></div>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="hub-live-columns grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="hub-live-list rounded-xl border bg-card p-3 max-h-[70vh] overflow-auto space-y-2">{conversations.length===0?<p className="p-3 text-sm text-muted-foreground">No website conversations yet.</p>:conversations.map(c=><button key={c.id} onClick={()=>{setId(c.id);setMobileThread(true);setSelected(null);setMessages([]);setText("");}} className={`w-full rounded-lg p-3 text-left ${id===c.id?"bg-accent":"hover:bg-muted"}`}><strong className="block">{c.name||"Website visitor"}</strong><span className="block text-xs text-muted-foreground">{c.email}</span><span className="text-xs">{c.mode==="ai"?"Aptee":"Team"} · {c.status}</span></button>)}</div>
        <div className="hub-live-thread rounded-xl border bg-card flex flex-col min-h-[60vh]">
<button type="button" className="hub-live-back md:hidden" onClick={()=>setMobileThread(false)}>← All conversations</button>
          {selected?<><div className="border-b p-4 flex flex-wrap gap-3 items-center justify-between"><div><strong>{selected.name}</strong><p className="text-xs text-muted-foreground">{selected.mode==="ai"?"Aptee is replying":"Team replies · Aptee paused"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void action({op:"conversation.update",id,mode:selected.mode==="ai"?"human":"ai",status:selected.status})}>{selected.mode==="ai"?"Take conversation":"Resume Aptee"}</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>void action({op:"conversation.update",id,mode:selected.mode,status:selected.status==="open"?"closed":"open"})}>{selected.status==="open"?"Resolve":"Reopen"}</Button></div></div>
          <div className="hub-live-history flex-1 overflow-auto max-h-[55vh] p-4 space-y-4">{messages.map(m=><div key={m.id} className={`max-w-[85%] rounded-xl p-3 ${m.actor==="visitor"?"bg-muted":"bg-accent ml-auto"}`}><p className="text-xs text-muted-foreground mb-1">{m.actor==="visitor"?selected.name:m.actor==="ai"?"Aptee":"Support"} · {new Date(m.created).toLocaleString("en-GB",{timeZone:"Asia/Dhaka"})}</p><p className="whitespace-pre-wrap break-words text-sm">{m.text}</p></div>)}</div>
          <form className="border-t p-4 flex gap-2" onSubmit={async e=>{e.preventDefault();if(!text.trim()||busy)return;if(await action({op:"send",id,text:text.trim(),requestKey:crypto.randomUUID()}))setText("");}}><Input aria-label="Reply to visitor" placeholder="Reply to visitor…" value={text} maxLength={4000} disabled={busy||selected.status!=="open"} onChange={e=>setText(e.target.value)}/><Button disabled={busy||!text.trim()||selected.status!=="open"}>Send</Button></form></>:<p className="p-6 text-muted-foreground">Select a visitor conversation.</p>}
        </div>
      </div>
    </>}
  </div>;
}
