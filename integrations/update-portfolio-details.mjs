// Narrow content correction shared by repository seeds and the live CMS draft.
export function updatePortfolio(projects) {
  const footstep=projects.find(p=>p.slug==='footstep-online');
  const dna=projects.find(p=>p.slug==='dna-digital-consultancy');
  if(!footstep||!dna)throw Error('Expected portfolio projects not found.');
  footstep.summary='One store, two regional shopping experiences. A Next.js frontend and PHP/Laravel backend power Bangladesh and international storefronts selected by IP address and location.';
  footstep.role='Next.js frontend and PHP/Laravel backend development, regional storefront implementation, maintenance and performance improvements.';
  footstep.work=footstep.work.map(text=>text.replace('React frontend','Next.js frontend'));
  footstep.stack=['Next.js','PHP','Laravel'];
  dna.category='UI/UX & website development';
  dna.summary='UI/UX design and Astro website development for a digital consultancy, with GoHighLevel AI, live chat and forms.';
  dna.role='UI/UX design, Astro website development and GoHighLevel integration for AI, live chat and forms.';
  dna.work=['Designed responsive website layouts for desktop and mobile.','Developed the website using Astro.','Integrated GoHighLevel for AI, live chat and forms.'];
  dna.outcome='A responsive consultancy website brings the UI/UX design together with Astro and GoHighLevel-powered AI, live chat and forms.';
  dna.stack=['UI/UX','Astro','GoHighLevel','AI','Live chat','Forms'];
  if(dna.cover.src!=='/assets/portfolio/dna-desktop-website.webp')dna.gallery=[dna.cover,...(dna.gallery||[])];
  dna.cover={src:'/assets/portfolio/dna-desktop-website.webp',fullSrc:'/assets/portfolio/dna-desktop-website.webp',width:1421,height:800,fullWidth:1421,fullHeight:800,sourceWidth:1421,sourceHeight:800,label:'Desktop website',group:'Website',device:'desktop',previewType:'website',objectPosition:'50% 50%',alt:'DNA Digital Consultancy desktop website on a laptop, with a mobile preview and Astro and AI CRM integration highlights.',pageType:'homepage'};
  return projects;
}
