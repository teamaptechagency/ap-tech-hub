import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPortfolio, media, published, safeWeb } from '../lib/portfolio';
import { PublicHeader, PublicFooter } from './public-preview';

async function lookup(kind,slug){
  const {content}=await getPortfolio();
  const result=published(content,kind+'s').find(item=>item.slug===slug);
  if(!result)notFound();
  return result;
}
export async function detailMetadata(kind,slug){
  const {data}=await lookup(kind,slug);
  const canonical='/'+kind+'/'+encodeURIComponent(slug);
  const image=media(data.image);
  return {title:data.title,description:data.description,alternates:{canonical},openGraph:{title:data.title,description:data.description,url:canonical,
    type:kind==='project'?'article':'website',...(image?{images:[{url:image,alt:data.title+' preview'}]}:{})}};
}
export async function Alias({kind,slug}){
  await lookup(kind,slug);
  permanentRedirect('/'+kind+'/'+encodeURIComponent(slug));
}
export async function Detail({kind,slug}){
  const {data}=await lookup(kind,slug);
  const cover=media(data.image);
  const outbound=safeWeb(data.url);
  const gallery=(data.gallery??[]).flatMap(item=>{const src=media(item.image_path);return src?[{src,alt:item.alt_text || data.title}]:[];});
  const schema={'@context':'https://schema.org','@type':kind==='project'?'CreativeWork':'Service',name:data.title,description:data.description,image:cover};
  return <><PublicHeader/><main className="container section page-fade" id="main">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>
    <Link className="back-link" href={kind==='project'?'/projects':'/#services'}>{kind==='project'?'Back to projects':'Back to services'}</Link>
    <div className="section-head"><div><p className="eyebrow">{data.category || (kind==='project'?'Selected work':'Services')}</p><h1>{data.title}</h1>{data.description&&<p>{data.description}</p>}</div></div>
    {cover?<img className="work-modal-image" src={cover} alt={data.title+' preview'}/>:kind==='project'&&<p>No project cover is available.</p>}
    {data.contribution&&<section className="panel"><div className="panel-head"><h2>My contribution</h2></div><div className="panel-body"><p>{data.contribution}</p></div></section>}
    {data.technologies&&<p>{data.technologies}</p>}{data.price&&<p>{data.price}</p>}
    {gallery.length>0&&<section className="section"><h2>Project gallery</h2><div className="work-grid">{gallery.map(({src,alt},index)=><img key={index} src={src} alt={alt} loading="lazy"/>)}</div></section>}
    <div className="hero-actions"><Link className="btn btn-dark" href={kind==='service'?'/request?service='+encodeURIComponent(slug):'/request'}>Start a project</Link>
    {outbound&&<a className="btn btn-outline" href={outbound} rel="noopener noreferrer" target="_blank">View live website ↗</a>}</div>
  </main><PublicFooter/></>;
}