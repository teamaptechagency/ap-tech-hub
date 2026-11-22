import { hubFetch } from './hub-fetch';
import 'server-only';
import { readFile } from 'node:fs/promises';

// Published content is read from the current local portfolio. The separate
// synthetic Laravel instance still handles forms, authentication and chat.
const publicPortfolio = new URL('/api/portfolio', process.env.WPN_PORTFOLIO_ORIGIN || process.env.WPN_BACKEND_ORIGIN || 'http://127.0.0.1:8020');

export async function getPortfolio() {
  if (process.env.WPN_PUBLIC_PORTFOLIO_FILE) {
    return JSON.parse(await readFile(process.env.WPN_PUBLIC_PORTFOLIO_FILE, 'utf8'));
  }
  const response = await hubFetch(publicPortfolio, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Published portfolio is unavailable.');
  return response.json();
}

export function published(content, kind) {
  return [...(content[kind] ?? [])].filter(row => row?.published === true && typeof row.slug === 'string' && row.data?.title)
    .sort((a, b) => a.sort_order - b.sort_order);
}

const external = {
  'dna-digital-consultancy': 'https://www.dnadigitalconsultancy.ai/',
  'dna-digital-consultancy-ui-bug-fixing': 'https://www.dnadigitalconsultancy.ai/',
  'lena-dugnus-photography-website': 'https://lena-dugnus-photography.com/en/',
  'hoffman-biotechnology-law-website': 'https://hoffmanbiotechlaw.com/',
  'bridge-the-gap-training-website': 'https://bridgethegap-training.com/',
  'flypharma-biotechnology-website': 'https://flypharma.bio/',
  'hudson-yacht-services-website': 'https://hudsonyachtservices.com/',
  'kleurplatenparadijs-educational-activity-website': 'https://www.kleurplatenparadijs.nl/',
  'mon-legs-end-of-life-planning-platform': 'https://www.monlegs.fr/',
  'daniels-rv-park-website': 'https://danielrvpark.com/',
  'franco-bangla-academy-learning-platform': 'https://www.francobanglaacademy.com/',
  'udonto-pathok-travel-journal-website': 'https://udontopathok.com/',
  'ap-tech-agency-client-management-application': 'https://aptechagency.com/',
};

export function media(value) {
  if (typeof value !== 'string' || !/^\/(?:uploads|media|images|assets)\//.test(value)) return;
  if (value.split('/').some(segment => !/^[a-zA-Z0-9_.-]*$/.test(segment) || segment === '..' || segment === '.')) return;
  return value;
}

export function safeWeb(value) {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {}
}

export function publicData({ profile, content }) {
  const projects = published(content,'projects').filter(({slug}) =>
    slug !== 'udonto-pathok-travel-journal-website' && slug !== 'franco-bangla-academy-learning-platform'
  ).map(({ slug, data }) => ({
    slug, title:data.title, tag:data.category || 'Selected work', description:data.description, contribution:data.contribution,
    cover:slug==='ap-tech-agency-client-management-application' ? '/images/ap-tech-homepage-20261121.webp' : media(data.image), outbound:Object.hasOwn(external,slug) ? external[slug] : safeWeb(data.live_url),
    filter:/wordpress|elementor/i.test([data.category,data.technologies].filter(Boolean).join(' ')) ? 'wordpress' : 'custom',
  }));
  const services = published(content,'services').map(({slug,data},index) => ({
    slug, title:data.title, short:data.title, copy:data.description, price:data.price, icon:['globe','store','code','bolt'][index%4],
  }));
  const reviews = published(content,'reviews').filter(({data})=>data.description?.trim()).map(({slug,data}) => ({
    slug, quote:data.description, author:data.author || data.title, location:data.location, service:data.category,
    rating:typeof data.rating==='number' && data.rating>=1 && data.rating<=5 ? data.rating : undefined,
  }));
  return { profile, projects, services, reviews };
}
