import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {createWebmail} from '../integrations/agency-webmail.mjs';
import {profiledMailOperation} from '../integrations/agency-mail-profiles.mjs';
test('profiles stay separate and reject shared sender and incoming no-reply operations',async()=>{
 let called='';const communication={status:()=>({username:'hello@aptechagency.com'}),operation:async()=>{called='communication';return {configured:true};}};const noreply={status:()=>({username:'no-reply@aptechagency.com'}),operation:async()=>{called='noreply';return {configured:true};}};
 const services={communication,noreply};await profiledMailOperation({op:'settings',domain:'aptechagency.com'},services);assert.equal(called,'communication');
 const result=await profiledMailOperation({op:'settings',domain:'aptechagency.com',profile:'noreply'},services);assert.equal(called,'noreply');assert.equal(result.replyTo,'hello@aptechagency.com');
 await assert.rejects(()=>profiledMailOperation({op:'settings.save',domain:'aptechagency.com',profile:'noreply',username:'hello@aptechagency.com'},services),/different email/);
 for(const op of ['folders','list','read'])await assert.rejects(()=>profiledMailOperation({op,profile:'noreply'},services),/send-only/);
 await assert.rejects(()=>profiledMailOperation({op:'settings',profile:'other'},services),/Invalid/);
});
test('send-only SMTP verifies and sends with communication Reply-To, without any IMAP and with replay protection',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mail-profiles-'));let imapCalls=0,sends=0,raw='';
 const service=createWebmail({directory:dir,sendOnly:true,replyTo:()=> 'hello@aptechagency.com',makeImap:()=>{imapCalls++;throw Error('IMAP must never run');},makeSmtp:()=>({verify:async()=>true,close:()=>{},sendMail:async message=>{sends++;raw=message.raw.toString();return {accepted:['recipient@example.com']};}})});
 try{
 await service.operation({op:'settings.save',domain:'aptechagency.com',provider:'hostinger',username:'no-reply@aptechagency.com',password:'test-only-password'});const account=service.status('aptechagency.com');assert.equal(account.sendOnly,true);
 assert.equal('password' in account,false);await service.operation({op:'test',domain:'aptechagency.com',revision:account.revision});
 for(const op of ['folders','list','read'])await assert.rejects(()=>service.operation({op,domain:'aptechagency.com'}),/send-only/);
 const p={op:'send',domain:'aptechagency.com',revision:account.revision,confirmSend:true,requestKey:crypto.randomUUID(),to:'recipient@example.com',subject:'Test only',text:'Verification message'};
 assert.equal((await service.operation(p)).accepted,true);assert.equal((await service.operation(p)).accepted,true);assert.equal(sends,1);assert.equal(imapCalls,0);assert.match(raw,/Reply-To: hello@aptechagency.com/);assert.match(raw,/From: no-reply@aptechagency.com/);
 }finally{service.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('inbox opens in one connection and serialized requests reuse it, settings invalidate it',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mail-speed-'));let connects=0,lists=0,active=0,max=0;
 const service=createWebmail({directory:dir,makeImap:()=>({usable:false,on(){},async connect(){connects++;this.usable=true;},close(){this.usable=false;},async list(){lists++;return [{path:'INBOX',name:'Inbox'}];},async getMailboxLock(){active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));return {release(){active--;}};},async status(){return {messages:0,uidValidity:1};},async *fetch(){}})});
 try{const base={domain:'aptechagency.com'};await service.operation({...base,op:'settings.save',provider:'hostinger',username:'hello@aptechagency.com',password:'test-only'});const opened=await service.operation({...base,op:'open'});assert.equal(opened.account.configured,true);assert.equal(opened.folders.length,1);assert.deepEqual(opened.messages,[]);await Promise.all([service.operation({...base,op:'list'}),service.operation({...base,op:'list'})]);assert.equal(connects,1);assert.equal(lists,1);assert.equal(max,1);await assert.rejects(()=>service.operation({...base,op:'read',uid:1,validity:'2'}),/Mailbox changed/);await service.operation({...base,op:'settings.save',provider:'hostinger',username:'hello@aptechagency.com',password:'changed-test-only'});await service.operation({...base,op:'open'});assert.equal(connects,2);assert.equal(lists,2);}finally{service.close();fs.rmSync(dir,{recursive:true,force:true});}
});
