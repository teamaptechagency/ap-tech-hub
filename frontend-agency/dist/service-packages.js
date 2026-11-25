(() => {
 const tabs=[...document.querySelectorAll('[data-package-tab]')];
 const activate=tab=>{tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;const panel=document.getElementById(t.getAttribute('aria-controls'));if(panel)panel.hidden=!active;});};
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();activate(tabs[next]);tabs[next].focus();}});});
 const form=document.getElementById('project-form'),query=new URLSearchParams(location.search);
 if(!form||!query.get('package'))return;
 fetch('/service-packages.json?v=1',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(services=>{
  const s=services.find(s=>s.slug===query.get('service')),p=s?.packages?.find(p=>p.id===query.get('package'));if(!s||!p)return;
  const service=form.elements.service;if(![...service.options].some(o=>o.value===s.slug))return;
  service.value=s.slug;service.dispatchEvent(new Event('change',{bubbles:true}));
  const amount=Math.round(p.price*(1-Math.max(0,Math.min(20,Number(s.packageDiscountPercent)||0))/100)),price='$'+amount.toLocaleString('en-US')+(s.packageBilling==='monthly'?' / month':s.packageBilling==='setup'?' setup':' / project');
  const note=document.createElement('div');note.className='selected-package-note';const title=document.createElement('strong');title.textContent=s.shortTitle+' · '+p.name;const copy=document.createElement('span');copy.textContent='Starting at '+price+' USD. We’ll confirm your scope and final quote before work begins.';note.append(title,copy);form.prepend(note);
  const initial='I am interested in the '+p.name+' package for '+s.shortTitle+' (starting at '+price+' USD).\n\nMy project details: ';
  if(!form.elements.message.value.trim())form.elements.message.value=initial;
  service.addEventListener('change',()=>{if(service.value!==s.slug){note.remove();if(form.elements.message.value===initial)form.elements.message.value='';}});
 }).catch(()=>{});
})();
