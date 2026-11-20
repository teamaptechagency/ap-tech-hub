import test from "node:test";
import assert from "node:assert/strict";
import {defaultApteePolicy,validateApteePolicy,evaluateApteeOffer} from "../lib/aptee-policy";
test("Aptee never accepts an unconfigured price or mismatched currency",()=>{
  const rule={...defaultApteePolicy.prices[0]};
  assert.equal(evaluateApteeOffer(rule,1000,"USD").eligible,false);
  assert.equal(evaluateApteeOffer({...rule,minimum:100,scope:"Five page website"},100,"BDT").eligible,false);
});
test("discount boundary is deterministic and currency rounded",()=>{
  const rule={...defaultApteePolicy.prices[0],minimum:100,maxDiscountPercent:20,scope:"Five pages"};
  assert.equal(evaluateApteeOffer(rule,80,"USD").eligible,true);
  assert.equal(evaluateApteeOffer(rule,79.99,"USD").eligible,false);
  assert.equal(evaluateApteeOffer({...rule,minimum:100.01},80,"USD").eligible,false);
});
test("saved configuration cannot enable auto orders or exceed discount authority",()=>{
  const policy=validateApteePolicy({...defaultApteePolicy,orderMode:"AUTO",leadMode:"AUTO_SEND"});
  assert.equal(policy.orderMode,"REVIEW_REQUIRED");assert.equal(policy.leadMode,"DRAFT_ONLY");
  assert.throws(()=>validateApteePolicy({...policy,prices:[{...policy.prices[0],maxDiscountPercent:21}]}));
});
