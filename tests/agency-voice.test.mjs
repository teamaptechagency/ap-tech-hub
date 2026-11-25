import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createVoiceService,voiceConfig} from '../integrations/agency-voice.mjs';

test('server owns model, voices and language behavior',()=>{
 assert.equal(voiceConfig('female').audio.output.voice,'marin');
 assert.equal(voiceConfig('male').audio.output.voice,'cedar');
 assert.throws(()=>voiceConfig('custom'));
 assert.match(voiceConfig('female').instructions,/Never act as an English translator/);
 assert.equal(voiceConfig('female').audio.input.transcription.language,undefined);
});
function fixture(verified=true){
 let upstream=0,recorded=[],socket,mode='ai',code; const store={'visitor@example.com':verified?{verifiedCid:'conversation',verifiedUntil:Date.now()+3600000}:{}};
 class Socket extends EventEmitter{constructor(){super();socket=this;queueMicrotask(()=>this.emit('open'));}close(){}}
 const chat={visitor:(id,token)=>{if(token!=='own-token')throw Object.assign(Error('Forbidden'),{status:403});return {id,email:'visitor@example.com',status:'open',mode};},details:()=>({messages:[]}),voiceTranscript:(...a)=>recorded.push(a)};
 const handle=createVoiceService({chat,store,sendCode:async(email,value)=>{code=value;},keys:async()=>['private-test-key'],WebSocket:Socket,request:async(url,opts)=>{upstream++;if(url.endsWith('/hangup'))return new Response('{}');assert.equal(opts.headers.Authorization,'Bearer private-test-key');return new Response('v=0\r\nanswer',{headers:{location:'/v1/realtime/calls/rtc_test'}});}});
 const invoke=async(p,token='own-token')=>{let result;await handle({headers:{authorization:'Bearer '+token}},{},{body:async()=>({id:'conversation',...p}),send:(_,status,value)=>{result={status,value};}});return result;};
 return {invoke,code:()=>code,store,upstream:()=>upstream,recorded:()=>recorded,socket:()=>socket,human:()=>mode='human'};
}
const offer={op:'start',assistant:'female',sdp:'v=0\r\nm=audio 9 RTP/AVP 111'};
test('unauthorized requests never reach OpenAI',async()=>{const f=fixture();await assert.rejects(f.invoke(offer,'someone-else'),{status:403});assert.equal(f.upstream(),0);});
test('human handoff blocks voice',async()=>{const f=fixture();f.human();await assert.rejects(f.invoke(offer),{status:409});assert.equal(f.upstream(),0);});
test('invalid assistant and SDP never reach OpenAI',async()=>{const f=fixture();await assert.rejects(f.invoke({...offer,assistant:'other'}));await assert.rejects(f.invoke({...offer,sdp:'not an offer'}));assert.equal(f.upstream(),0);});
test('one call per conversation, private credentials, provider-only transcripts, hangup',async()=>{
 const f=fixture();const result=await f.invoke(offer);
 try{
 assert.equal(result.status,200);assert.equal(result.value.maxSeconds,300);assert.equal(JSON.stringify(result).includes('private-test-key'),false);
 await assert.rejects(f.invoke(offer),{status:429});
 const event={type:'response.output_audio_transcript.done',event_id:'event_123',transcript:'Hello there'};
 f.socket().emit('message',Buffer.from(JSON.stringify(event)));f.socket().emit('message',Buffer.from(JSON.stringify(event)));
 assert.equal(f.recorded().length,1);assert.equal(f.recorded()[0][2],'ai');assert.match(f.recorded()[0][1].requestKey,/^[a-f0-9]{64}$/);
 assert.equal(f.upstream(),1);
 }finally{await f.invoke({op:'end'});}
 assert.equal(f.upstream(),2);
});

test('voice requires inbox verification and rejects incorrect codes',async()=>{const f=fixture(false);await assert.rejects(f.invoke(offer),{status:403});assert.equal(f.upstream(),0);await f.invoke({op:'verify-send'});await assert.rejects(f.invoke({op:'verify-code',code:'wrong'}),{status:400});await f.invoke({op:'verify-code',code:f.code()});await f.invoke(offer);await f.invoke({op:'end'});await assert.rejects(f.invoke(offer),{status:429});assert.ok(f.store['visitor@example.com'].cooldownUntil>Date.now()+290000);});
