export function updateRealWebsites(draft,manifest,assets){
 const all=[...draft.projects,...draft.designs];
 const hoffman=all.find(p=>p.slug==='hoffman-biotechnology-law');
 if(hoffman){hoffman.deliveryStatus='delivered';hoffman.websiteStatus='available';delete hoffman.websiteNote;}
 const monleg=all.find(p=>p.slug==='monlegs');
 if(monleg){
  monleg.deliveryStatus='design-review';monleg.websiteStatus='review';
  monleg.summary='UI/UX refinement for MonLegs. The client is reviewing the remaining design updates before a fresh development phase begins.';
  monleg.role='UI/UX design refinements and preparation for renewed website development.';
  monleg.challenge='The client returned to our team after a separate development handover did not meet their expectations. Remaining interface work needs client approval before development restarts.';
  monleg.work=['Refining the remaining homepage and dashboard interfaces.','Reviewing design updates with the client.','Preparing the approved UI for the next development phase.'];
  monleg.outcome='Design updates are under client review. The new development phase has not started.';
  monleg.websiteNote='Current stage: client design review. Development will restart after the remaining UI is approved.';
 }
 const snazy=all.find(p=>p.slug==='snazy-wear');
 if(snazy){snazy.website='https://snazywear.com/';snazy.websiteStatus='expired';snazy.websiteNote='The original website has expired. The design preview is retained here.';}
 for(const item of manifest){
  const screens=assets[item.host];if(!screens?.desktop)throw Error('Desktop screenshot missing: '+item.host);
  const prior=all.find(p=>p.slug===item.slug);
  const project=prior||{slug:item.slug};
  const wordpress=item.stack.includes('WordPress');
  Object.assign(project,{name:item.name,factualOverview:true,category:wordpress?'WordPress website':'Consultancy website',scope:'development',workTypes:wordpress?['development','wordpress']:['development'],summary:item.summary,role:wordpress?'WordPress website development.':'Website project using an Nginx web server.',challenge:item.summary,work:[wordpress?'WordPress website development.':'Website implementation.'],outcome:item.summary,stack:item.stack,website:item.website,websiteStatus:'available',cover:screens.desktop,gallery:screens.mobile?[screens.mobile]:[]});
  if(!prior)draft.projects.push(project);
 }
 return draft;
}
