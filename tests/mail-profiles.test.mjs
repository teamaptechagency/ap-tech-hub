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
