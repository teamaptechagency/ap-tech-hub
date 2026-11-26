import profiles from '../app/reviews/review-profiles.json';

export default function ReviewProfiles(){
 return <section className="ratings-by-service" aria-labelledby="service-ratings-title">
  <div className="section-head"><div><p className="eyebrow">Two profiles. Five-member team.</p><h2 id="service-ratings-title">Ratings by service.</h2></div></div>
  <div className="ratings-profile-grid">{profiles.map(profile=><article className="review-profile rating-profile-card" key={profile.id}>
   <div className="rating-profile-person"><span className="rating-profile-avatar" aria-hidden="true">{profile.initials}</span><div><strong>{profile.name}</strong><span>{profile.specialty} · Fiverr</span></div></div>
   <div className="rating-profile-score"><b className="reviews-rating-value">{profile.rating}</b><span>/ 5 from {profile.reviewCount} reviews</span></div>
   <div className="rating-profile-track" role="img" aria-label={`${profile.rating} out of 5`}><span style={{width:`${profile.rating/5*100}%`}}/></div>
   <a className="text-link" href={profile.url} target="_blank" rel="noopener noreferrer">Read on Fiverr <span aria-hidden="true">→</span></a>
  </article>)}</div>
 </section>;
}
