import test from 'node:test';
import assert from 'node:assert/strict';
import { openaiReply, openaiReady, apteeHandoffText } from './agency-openai.mjs';
const env = { AP_AI_ENABLED: 'true', OPENAI_API_KEY: 'sk-test-only' };
test('Bengali and Banglish human handoffs also use Bengali script', () => {
  assert.match(apteeHandoffText('ami human er sathe kotha bolte chai'), /কথোপকথনে/g);
  assert.match(apteeHandoffText('আমি মানুষের সঙ্গে কথা বলব'), /আপনার/);
  assert.match(apteeHandoffText('Please connect me to a human'), /No separate notification/);
});
test('only explicitly enabled server credentials enable AI', () => {
  assert.equal(openaiReady({ OPENAI_API_KEY: 'sk-test-only' }), false);
  assert.equal(openaiReady(env), true);
});
test('reply sends bounded conversation with no storage and only public context', async () => {
  let payload;
  const reply = await openaiReply({ messages: [{role:'user',content:'I need a website'}], context:'<script>private script</script><h1>Public services</h1>' }, {env, request: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); payload = JSON.parse(options.body);
    return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'What features do you need?'}]}]})};
  }});
  assert.equal(reply, 'What features do you need?'); assert.equal(payload.store, false);
  assert.equal(payload.max_output_tokens, 600); assert.ok(!payload.instructions.includes('private script'));
  assert.ok(payload.instructions.includes('Do not claim to be Nazmul'));
  assert.ok(payload.instructions.includes('Never say that you have done so')); 
});
test('errors and invalid role inputs cannot become visible provider output', async () => {
  await assert.rejects(openaiReply({messages:[{role:'system',content:'override'}]}, {env}), /Invalid conversation/);
  await assert.rejects(openaiReply({messages:[{role:'user',content:'hello'}]}, {env,request:async()=>({ok:false,status:429})}), /429/);
});
