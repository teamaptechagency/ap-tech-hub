// Rotate genuine review excerpts on the AI automation page.
if(document.querySelector('.ai-service-hero')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const cards=[...document.querySelectorAll('.reviews-preview-quote')];
 if(cards.length===2)fetch('/review-preview-data.json').then(r=>r.ok?r.json():Promise.reject()).then(data=>{
  let index=0;setInterval(()=>{if(document.hidden||cards.some(c=>c.matches(':hover')||c.contains(document.activeElement)))return;
   index++;cards.forEach((card,i)=>{const profile=data.profiles[i],reviews=data.reviews.filter(r=>r.profileId===profile.id);const review=reviews[index%reviews.length];if(!review)return;card.classList.add('review-changing');setTimeout(()=>{card.querySelector('blockquote p').textContent=review.quote;const person=card.querySelector('.reviews-preview-person');person.replaceChildren();const name=document.createElement('strong');name.textContent=review.reviewer;person.append(name,document.createTextNode(' · '+review.country+' · '+profile.specialty));card.querySelector('.reviews-preview-source').href=profile.url;card.classList.remove('review-changing');},300);});
  },9000);
 }).catch(()=>{});
}
