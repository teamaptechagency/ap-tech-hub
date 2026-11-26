const steps = [
  ['Understand', 'Done'],
  ['Shape the plan', 'Done'],
  ['Build together', 'In review'],
  ['Launch & hand over', 'Next'],
];

export default function ApproachHero() {
  return <section className="page-hero approach-page-hero">
    <div className="wrap approach-hero-layout">
      <div className="approach-hero-copy">
        <p className="eyebrow">Our approach</p>
        <h1>Know what <em>happens next.</em></h1>
        <p className="lead">Working together should feel clear. You always know the scope, the price, the next review — and who does what.</p>
        <div className="button-row">
          <a className="button" href="/contact/">Start a project <span aria-hidden="true">→</span></a>
          <a className="button outline" href="#prepare-your-brief">Prepare your brief</a>
        </div>
      </div>
      <div className="approach-progress-card" aria-label="Example project progress">
        <ol className="approach-progress-list">
          {steps.map(([title, status], index) => <li key={title} className={`approach-progress-step${index === 2 ? ' is-current' : ''}${index < 2 ? ' is-done' : ''}`}>
            <span className="approach-progress-number" aria-hidden="true">{index < 2 ? '✓' : index + 1}</span>
            <strong>{title}</strong><span className="approach-progress-status">{status}</span>
          </li>)}
        </ol>
      </div>
    </div>
  </section>;
}
