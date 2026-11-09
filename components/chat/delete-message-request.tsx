"use client";
import { useState } from "react";
import { requestMessageDeletion } from "@/actions/message.actions";
export function DeleteMessageRequest({id}:{id:string}) {
 const [status,setStatus]=useState("");
 return <button type="button" className="mt-2 block text-xs underline opacity-70" disabled={Boolean(status)} onClick={async()=>{
  setStatus("Requesting…");
  try { const result=await requestMessageDeletion(id); setStatus("error" in result ? result.error || "Request failed" : "Deletion requested"); }
  catch { setStatus(""); }
 }}>{status||"Request deletion"}</button>;
}
