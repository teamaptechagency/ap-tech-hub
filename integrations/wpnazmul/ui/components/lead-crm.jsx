'use client';

import { useEffect, useRef, useState } from 'react';

export const leadStages = ['New', 'Qualified', 'Contact planned', 'Contacted', 'Interested', 'Won', 'Not a fit'];
export const leadPriorities = ['Low', 'Normal', 'High'];
export const csvFields = ['company','contact_name','role','country','industry','service','website','email','stage','priority','follow_up_date','follow_up_task'];

function download(name, rows) {
  const csv = rows.map(row=>row.map(value=>{
    const text=String(value??'');
    return '"'+(/^[\s]*[=+@-]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';
  }).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function exportLeads(leads) {
  download('wpnazmul-leads.csv',[csvFields,...leads.map(lead=>csvFields.map(field=>field==='company'?lead.name:field==='website'?lead.source:field==='email'?lead.email:lead.crm?.[field]??''))]);
}

export function LeadTools({api, panel, onClose, onSaved, countries, industries, services}) {
  const dialog=useRef(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    setError('');
    if(panel&&!dialog.current.open)dialog.current.showModal();
    if(!panel&&dialog.current.open)dialog.current.close();
  },[panel]);
  const lead=panel?.lead;
  const meta=lead?.crm??{};
  const draft=(lead?.body??'').replace(/\s*Best regards,[\s\S]*$/i,'').trim();
  async function submit(event) {
    event.preventDefault();
    if(busy)return;
    const fields=new FormData(event.currentTarget);
    setBusy(true);setError('');
    try {
      let result;
      if(panel.type==='csv'){
        const file=fields.get('csv');
        if(!file?.size||file.size>1048576)throw new Error('Choose a CSV file up to 1 MB.');
        result=await api('/import','POST',{csv:await file.text()});
      }else{
        result=await api(lead?'/'+lead.id+'/details':'/manual','POST',Object.fromEntries(fields));
      }
      onSaved(result);
    }catch(problem){setError(problem.message);}
    finally{setBusy(false);}
  }
  const select=(key,label,options,fallback='')=><label className="field">{label}<select name={key} defaultValue={meta[key]||fallback}>
    {!fallback&&<option value="">Select {label.toLowerCase()}</option>}{options.map(option=><option key={option}>{option}</option>)}
  </select></label>;
  return <dialog ref={dialog} className="lead-email-dialog lead-management-dialog" aria-labelledby="lead-management-title" onCancel={event=>{if(busy)event.preventDefault();}} onClose={()=>{if(!dialog.current?.open)onClose();}}>
    {panel&&<><div className="panel-head"><h2 id="lead-management-title">{panel.type==='csv'?'Import CSV':lead?lead.name:'Add a lead'}</h2></div>
      <div className="panel-body"><form key={lead?.id??panel.type} className="stack" onSubmit={submit}>
        {error&&<p role="alert">{error}</p>}
        {panel.type==='csv'?<>
          <p>Import up to 200 rows. Existing email addresses are skipped.</p>
          <button type="button" className="btn btn-outline" onClick={()=>download('wpnazmul-lead-template.csv',[csvFields])}>Download CSV template</button>
          <label className="field">CSV file<input type="file" name="csv" accept=".csv,text/csv" required/></label>
        </>:<>
          {!lead&&<>
            <label className="field">Company<input name="company" required maxLength={160}/></label>
            <label className="field">Business email<input type="email" name="email" required maxLength={254}/></label>
            <label className="field">Website<input type="url" name="website" placeholder="https://" required maxLength={2048}/></label>
          </>}
          <div className="lead-form-grid">
            <label className="field">Contact name<input name="contact_name" defaultValue={meta.contact_name} maxLength={120}/></label>
            <label className="field">Role<input name="role" defaultValue={meta.role} maxLength={100}/></label>
            {select('country','Country',countries)}{select('industry','Business type',industries)}{select('service','Service',services)}
            {select('stage','Stage',leadStages,lead?.status==='accepted'?'Contacted':'New')}{select('priority','Priority',leadPriorities,'Normal')}
            <label className="field">Follow-up date<input type="date" name="follow_up_date" defaultValue={meta.follow_up_date}/></label>
          </div>
          <label className="field">Follow-up task<input name="follow_up_task" defaultValue={meta.follow_up_task} maxLength={240}/></label>
          {meta.follow_up_date&&<label><input type="checkbox" name="follow_up_done" value="1" defaultChecked={Boolean(meta.follow_up_done)}/> Mark follow-up complete</label>}
          <label className="field">Notes<textarea name="notes" defaultValue={meta.notes} rows={3} maxLength={4000}/></label>
          <label className="field">LinkedIn InMail draft<textarea name="inmail" defaultValue={meta.inmail??draft} rows={4} maxLength={4000}/></label>
          <button type="button" className="btn btn-outline" onClick={event=>navigator.clipboard.writeText(event.currentTarget.form.elements.inmail.value).catch(()=>setError('Could not copy the draft.'))}>Copy InMail draft</button>
        </>}
        <div className="lead-tool-actions"><button className="btn btn-dark" disabled={busy}>{busy?'Saving…':panel.type==='csv'?'Import CSV':'Save lead details'}</button>
        <button className="btn btn-outline" type="button" disabled={busy} onClick={onClose}>Close</button></div>
      </form></div></>}
  </dialog>;
}
