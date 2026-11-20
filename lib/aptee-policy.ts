export type ApteePriceRule = { service: string; currency: "USD" | "BDT"; minimum: number; maxDiscountPercent: number; scope: string };
export type ApteePolicy = { name: "Aptee"; prices: ApteePriceRule[]; alertMobile: string; alertEmail: string; senderEmail: string; leadQueries: string; leadRegion: string; leadMode: "DRAFT_ONLY"; orderMode: "REVIEW_REQUIRED" };
export const defaultApteePolicy: ApteePolicy = {
  name: "Aptee", prices: ["UI/UX Design", "Website Development", "Web App Development", "Mobile App Development"].map(service => ({service,currency:"USD",minimum:0,maxDiscountPercent:10,scope:""})),
  alertMobile: "", alertEmail: "", senderEmail: "", leadQueries: "", leadRegion: "", leadMode: "DRAFT_ONLY", orderMode: "REVIEW_REQUIRED",
};
export function validateApteePolicy(input: unknown): ApteePolicy {
  const p = input as ApteePolicy;
  if (!p || !Array.isArray(p.prices) || p.prices.length < 1 || p.prices.length > 20) throw Error("Add 1–20 service pricing rules.");
  const prices = p.prices.map(rule => {
    if (!rule || typeof rule.service !== "string" || !rule.service.trim() || rule.service.length > 100 || !["USD","BDT"].includes(rule.currency) || !Number.isFinite(rule.minimum) || rule.minimum < 0 || rule.minimum > 10000000 || !Number.isFinite(rule.maxDiscountPercent) || rule.maxDiscountPercent < 0 || rule.maxDiscountPercent > 20 || typeof rule.scope !== "string" || rule.scope.length > 3000) throw Error("Check service, currency, minimum price, scope and discount (0–20%).");
    return {...rule, service:rule.service.trim(), minimum:Math.round(rule.minimum*100)/100};
  });
  const clean = (value: unknown, max: number) => { if(typeof value !== "string" || value.length > max) throw Error("Check the integration fields."); return value.trim(); };
  const email = (value: unknown) => { const next=clean(value,254);if(next&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next))throw Error("Use a valid email address.");return next; };
  const alertMobile=clean(p.alertMobile,25);if(alertMobile&&!/^\+?[0-9]{8,15}$/.test(alertMobile))throw Error("Use an international mobile number.");
  return {name:"Aptee",prices,alertMobile,alertEmail:email(p.alertEmail),senderEmail:email(p.senderEmail),leadQueries:clean(p.leadQueries,3000),leadRegion:clean(p.leadRegion,150),leadMode:"DRAFT_ONLY",orderMode:"REVIEW_REQUIRED"};
}

// Money boundaries are evaluated by application code, never by the model.
export function evaluateApteeOffer(rule: ApteePriceRule, offer: number, currency: string) {
  if (!(rule.minimum > 0) || !rule.scope.trim()) return {eligible:false,reason:"Pricing and scope need configuration",floor:null};
  if (currency !== rule.currency || !Number.isFinite(offer) || offer <= 0) return {eligible:false,reason:"Check amount and currency",floor:null};
  const floorCents=Math.ceil(Math.round(rule.minimum*100)*(100-rule.maxDiscountPercent)/100);
  return {eligible:Math.round(offer*100)>=floorCents,reason:Math.round(offer*100)>=floorCents?"Within configured price boundary; review required":"Below the allowed price boundary",floor:floorCents/100};
}
