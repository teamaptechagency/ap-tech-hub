export async function profiledMailOperation(input,{communication,noreply}){
 const profile=input.profile||'communication';
 if(!['communication','noreply'].includes(profile))throw Object.assign(Error('Invalid mail account profile.'),{status:400});
 const selected=profile==='noreply'?noreply:communication;
 const other=profile==='noreply'?communication:noreply;
 if(profile==='noreply'&&!['settings','settings.save','test','send'].includes(input.op))throw Object.assign(Error('No-reply is send-only. Incoming mail belongs to Client Communication.'),{status:400});
 if(input.op==='settings.save'&&String(input.username||'').trim().toLowerCase()===String(other.status(input.domain).username||'').toLowerCase())throw Object.assign(Error('Use different email addresses for Client Communication and No-reply.'),{status:400});
 const result=await selected.operation(input);
 return input.op==='settings'?{...result,profile,replyTo:profile==='noreply'?communication.status(input.domain).username||'':'',incoming:profile==='noreply'?'disabled-in-hub; provider-rejection-required':'imap'}:result;
}
