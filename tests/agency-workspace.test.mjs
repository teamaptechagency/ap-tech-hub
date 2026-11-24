import test from 'node:test';
import assert from 'node:assert/strict';
import {hubWorkspace} from '../integrations/agency-workspace.mjs';

async function request({authorized=true,method='POST',query='route=cms',payload={op:'state'}}={}) {
  const prior=process.env.AP_HUB_CHAT_TOKEN;
  process.env.AP_HUB_CHAT_TOKEN='x'.repeat(48);
  const output={};
  try {
    await hubWorkspace({url:'/internal/hub-workspace?'+query,method,headers:{authorization:authorized?'Bearer '+'x'.repeat(48):''},socket:{remoteAddress:'127.0.0.1'}},{}, {
      body:async()=>payload,send:(_,status,data)=>Object.assign(output,{status,data}),
      agency:{operation:p=>({received:p.op})},audit:()=>{},
    });
    return output;
  } finally {if(prior===undefined)delete process.env.AP_HUB_CHAT_TOKEN;else process.env.AP_HUB_CHAT_TOKEN=prior;}
}
test('private workspace rejects a missing server credential',async()=>assert.equal((await request({authorized:false})).status,403));
test('authenticated CMS state uses the existing agency data service',async()=>assert.deepEqual(await request(),{status:200,data:{received:'state'}}));
test('legacy passwords are not exposed through the unified workspace',async()=>assert.equal((await request({query:'route=password'})).status,400));
test('asset paths cannot traverse the filesystem',async()=>assert.equal((await request({method:'GET',query:'asset=../../.env'})).status,404));
