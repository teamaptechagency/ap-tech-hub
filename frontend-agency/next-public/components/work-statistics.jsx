import summary from '../app/work/work-summary.json';
export default function WorkStatistics(){
 const totals=[[summary.projects.length,'projects'],[summary.services.length,'services'],[summary.reviews.length,'client reviews']];
 return <dl className="work-totals" aria-label="Our work in numbers">{totals.map(([total,label])=><div key={label}><dt>{label}</dt><dd>{total}</dd></div>)}</dl>;
}
