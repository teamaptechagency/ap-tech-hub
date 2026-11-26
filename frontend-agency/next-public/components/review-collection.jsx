'use client';
import {Children,cloneElement,useState} from 'react';
import summary from '../app/reviews/review-summary.json';

export default function ReviewCollection({children}){
 const cards=Children.toArray(children).map(card=>cloneElement(card,{hidden:false}));
 const [visible,setVisible]=useState(9);
 const shown=Math.min(visible,cards.length);
 return <section className="recent-reviews" aria-labelledby="recent-reviews-title">
  <div className="section-head"><div><p className="eyebrow">What clients say</p><h2 id="recent-reviews-title">Recent reviews.</h2></div></div>
  <div className="review-grid" id="reviews-grid">{cards.slice(0,shown)}</div>
  <div className="recent-reviews-more">
   <p className="muted" aria-live="polite">Showing {shown} of {cards.length} reviews</p>
   {shown<cards.length&&<button type="button" className="button outline" aria-controls="reviews-grid" onClick={()=>setVisible(n=>n+3)}>Show more reviews ({cards.length-shown} remaining)</button>}
  </div>
  <p className="review-source-note">Reviews from our team’s Fiverr profiles. Read the originals on Fiverr.</p>
  <aside className="review-upwork recent-reviews-upwork" aria-label="Our Upwork profile">
   <p><strong>Prefer to work through Upwork?</strong><span>Visit our profile and tell us about your project.</span></p>
   <a className="button" href={summary.upworkProfile} target="_blank" rel="noopener noreferrer">View our Upwork profile <span aria-hidden="true">→</span></a>
  </aside>
 </section>;
}
