export const HUB_ORIGIN = "https://manage.aptechagency.com";
export function canonicalHubRedirect(value: string) {
  const source=new URL(value);
  if(source.hostname.toLowerCase()!=="portal.aptechagency.com")return null;
  const target=new URL(HUB_ORIGIN);target.pathname=source.pathname;target.search=source.search;
  return target.toString();
}
