export function hubFetch(input:RequestInfo|URL,options?:RequestInit){
  let url=String(input);
  if(url.startsWith('/api/v1/admin/'))url=url.replace('/api/v1/admin/','/api/wp-admin/workspace/');
  else if(url.startsWith('/api/'))url=url.replace('/api/','/api/wp-admin/legacy/');
  return fetch(url,{...options,credentials:'same-origin',cache:'no-store'});
}
