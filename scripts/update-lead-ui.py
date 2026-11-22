from pathlib import Path
p=Path('integrations/wpnazmul/ui/components/lead-workspace.jsx');s=p.read_text()
s=s.replace('Archive, CalendarDays, Eye, Folder, LayoutGrid, Mail, Search, Target, Users','Archive, BookmarkPlus, Check, Sparkles, Trash2, CalendarDays, Eye, Folder, LayoutGrid, Mail, Search, Target, Users')
s=s.replace("  const [sort, setSort]", "  const [businessAge,setBusinessAge]=useState('any');\n  const [cooldown,setCooldown]=useState(0);\n  const [removeTarget,setRemoveTarget]=useState(null);\n  const removeDialog=useRef(null);\n  useEffect(()=>{if(removeTarget&&!removeDialog.current.open)removeDialog.current.showModal();if(!removeTarget&&removeDialog.current?.open)removeDialog.current.close();},[removeTarget]);\n  useEffect(()=>{if(cooldown<=0)return;const t=setTimeout(()=>setCooldown(cooldown-1),1000);return()=>clearTimeout(t);},[cooldown]);\n  const [sort, setSort]")
s=s.replace("'Service: ' + service].filter", "'Service: ' + service, businessAge!=='any'&&'New business launch age: '+businessAge+' months; require dated launch evidence'].filter")
s=s.replace("{ query, next: isNext }", "{ query, next: isNext, business_age:businessAge }")
s=s.replace("} catch (problem) { setError(problem.message); }\n    finally { setBusy(false); }\n  }\n\n  async function removeLead", "} catch (problem) { setError(problem.message); if(problem.status===429)setCooldown(problem.retryAfter||60); }\n    finally { setBusy(false); }\n  }\n\n  async function removeLead",1)
s=s.replace("if (busy || !window.confirm('Remove '+lead.name+' from active leads? Email and conversation history will be kept.')) return;", "if (busy) return;")
s=s.replace("setLeads(result.leads);setDetailId(null);setNotice(lead.name+' removed", "setLeads(result.leads);setDetailId(null);setRemoveTarget(null);setNotice(lead.name+' removed",1)
marker='  async function save(lead) {'
extra='''  async function contactResearch(lead){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{const result=await api('/'+lead.id+'/research-contacts','POST',{});setLeads(result.leads);setDetailId(lead.id);setNotice(result.phone_found?'Published business contact found. Review its source.':'Research completed. No verified public business phone was found.');}catch(problem){setError(problem.message);}finally{setBusy(false);}
  }
  async function openEmail(lead){
    if(busy)return;setBusy(true);setError('');setReviewError('');
    try{
      if(!['discovered','ready'].includes(lead.status)){const thread=await api('/'+lead.id+'/mail-thread','POST',{});window.location.assign('/wpnazmul/messages?tab=enquiries&thread='+thread.thread_id);return;}
      if(lead.status==='discovered'){await api('/'+lead.id+'/save','POST',{});setLeads(items=>items.map(item=>item.id===lead.id?{...item,status:'ready'}:item));}
      const draft=await api('/'+lead.id+'/generate-draft','POST',{tone:draftTone});setSelected({...lead,...draft,status:'ready'});
    }catch(problem){setSelected({...lead,status:'ready'});setReviewError(problem.message+' You can edit and review the draft manually.');}finally{setBusy(false);}
  }
  function whatsappDraft(form){
    const phone=selected?.crm?.phone?.replace(/[^0-9]/g,'');if(!phone)return;
    const fields=new FormData(form);const text=fields.get('subject')+'\\n\\n'+fields.get('body')+(invite?.url?'\\n\\nStart live conversation:\\n'+invite.url:'');
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
  }
'''
s=s.replace(marker,extra+marker,1)
s=s.replace('const filters = {keywords,country,business,service,role};','const filters = {keywords,country,business,service,role,business_age:businessAge};')
s=s.replace("setKeywords(value.keywords??'');", "setBusinessAge(value.business_age??'any');setKeywords(value.keywords??'');")
s=s.replace('<label className="field">Business type<select', '<label className="field">Business age<select value={businessAge} onChange={event=>setBusinessAge(event.target.value)}><option value="any">Any age</option><option value="0-1">Started within 1 month</option><option value="1-3">Started 1–3 months ago</option><option value="3-6">Started 3–6 months ago</option></select><small>Dated public launch evidence is required for startup searches.</small></label>\n          <label className="field">Business type<select',1)
s=s.replace('disabled={busy||!country}><Search', 'disabled={busy||!country||cooldown>0}><Search',1)
s=s.replace("{busy?'Finding…':isNext?'Find next':'Find leads'}", "{busy?'Finding…':cooldown>0?'Try again in '+cooldown+'s':isNext?'Find next':'Find leads'}",1)
s=s.replace("setKeywords('');setCountry('');", "setBusinessAge('any');setKeywords('');setCountry('');",1)
marker='          <strong>Saved searches</strong>'
new='''          {[['US new startups',{country:'United States',business_age:'1-3',keywords:'newly launched businesses'}],['UK new businesses',{country:'United Kingdom',business_age:'1-3'}],['European startups',{country:'Germany',business_age:'1-3'}],['UK local services',{country:'United Kingdom',business:'Professional services'}],['US hospitality',{country:'United States',business:'Hospitality and tourism businesses'}],['EU online stores',{country:'Netherlands',business:'Ecommerce businesses'}]].map(([label,value])=><button key={label} type="button" className="btn btn-outline btn-sm" onClick={()=>applyFilters(value)}>{label}</button>)}
'''
s=s.replace(marker,new+marker,1)
start=s.index('<div className={"lead-row-actions"');end=s.index('</div>\n      </li>',start)
s=s[:start]+'''<div className="lead-row-actions lead-icon-actions">
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={'View details: '+lead.name} title="View details" data-tooltip="Details" onClick={()=>setDetailId(lead.id)}><Eye size={17}/></button>
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={lead.status==='discovered'?'Save lead: '+lead.name:'Lead saved'} title={lead.status==='discovered'?'Save lead':'Saved'} data-tooltip={lead.status==='discovered'?'Save':'Saved'} disabled={busy||lead.status!=='discovered'} onClick={()=>void save(lead)}>{lead.status==='discovered'?<BookmarkPlus size={17}/>:<Check size={17}/>}</button>
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={'Email '+lead.name} title="Personalised email" data-tooltip="Email" disabled={busy||lead.status==='sending'} onClick={()=>void openEmail(lead)}><Mail size={17}/></button>
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={'Research public contacts: '+lead.name} title="AI contact research" data-tooltip="Find contacts" disabled={busy} onClick={()=>void contactResearch(lead)}><Sparkles size={17}/></button>
          <button type="button" className="btn btn-outline lead-action-icon lead-action-remove" aria-label={'Remove lead: '+lead.name} title="Remove lead" data-tooltip="Remove" disabled={busy||lead.status==='sending'} onClick={()=>setRemoveTarget(lead)}><Trash2 size={17}/></button>
        '''+s[end:]
s=s.replace('        <p>From hello@wpnazmul.com · To {selected.email}</p>', '        <p className="lead-mail-recipient"><strong>{selected.name}</strong><br/>From hello@wpnazmul.com → {selected.email}</p>')
s=s.replace('        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setSelected(null)}>Close review</button>', '''        {selected.crm?.phone?<button type="button" className="btn btn-outline" disabled={busy} onClick={event=>whatsappDraft(event.currentTarget.form)}>Open same draft in WhatsApp</button>:<p className="small muted">Find a published business phone with the contacts icon to prepare a WhatsApp draft.</p>}
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setSelected(null)}>Close review</button>''')
s=s.replace('    </dialog>\n  </div>;', '''    </dialog>
    <dialog ref={removeDialog} className="lead-email-dialog lead-remove-dialog" aria-labelledby="remove-lead-title" onCancel={event=>{if(busy)event.preventDefault();}} onClose={()=>setRemoveTarget(null)}>{removeTarget&&<><div className="panel-head"><h2 id="remove-lead-title">Remove {removeTarget.name}?</h2></div><div className="panel-body stack"><p>This removes the lead from active lists. Email and conversation history will be kept.</p><div className="flex"><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>setRemoveTarget(null)}>Keep lead</button><button type="button" className="btn btn-dark" disabled={busy} onClick={()=>void removeLead(removeTarget)}>{busy?'Removing…':'Remove lead'}</button></div></div></>}</dialog>
  </div>;''',1)
p.write_text(s)
