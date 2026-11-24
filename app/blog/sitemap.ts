import type {MetadataRoute} from 'next';
import {prisma} from '@/lib/prisma';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const posts=await prisma.blogPost.findMany({where:{status:'PUBLISHED',visibility:'PUBLIC',noIndex:false,publishedAt:{lte:new Date()}},select:{slug:true,updatedAt:true}});
 return [{url:'https://aptechagency.com/blog',lastModified:new Date()},...posts.map(p=>({url:'https://aptechagency.com/blog/'+p.slug,lastModified:p.updatedAt}))];
}
