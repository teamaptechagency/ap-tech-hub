import summary from '../app/reviews/review-summary.json';

export default function ReviewsHero(){
 return <header className="reviews-hero">
  <div className="reviews-hero-copy">
   <p className="reviews-hero-badge"><span aria-hidden="true"/>Client reviews</p>
   <h1 id="reviews-title"><span>Good work.</span><em className="reviews-hero-accent">In their words.</em></h1>
   <p className="lead">Real feedback from clients in the United States, Germany and beyond — on design and development work.</p>
   <div className="button-row">
    <a className="button outline" href={summary.upworkProfile} target="_blank" rel="noopener noreferrer">View our Upwork profile</a>
    <a className="button" href="/contact/">Start a project <span aria-hidden="true">→</span></a>
   </div>
  </div>
  <aside className="reviews-rating-card" aria-label={`Rated ${summary.rating} out of 5 across ${summary.total} Fiverr reviews`}>
   <strong className="reviews-rating-value">{summary.rating}</strong>
   <span className="reviews-rating-stars" aria-hidden="true">★★★★★</span>
   <p>{summary.total} customer reviews on Fiverr</p>
   <small>Two profiles · Five-member team</small>
   <small>Ratings checked <time dateTime={summary.checkedAt}>{summary.checkedLabel}</time></small>
  </aside>
 </header>;
}
