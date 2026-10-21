// Explicitly use the supported manual mode for pre-autofill regression scenarios.
const {createHarness}=require('./dom.cjs');
const {initial}=require('../../src/domain/engine.js');
const KEY='shunan-course-planner-2026-v1';
function createManualHarness(runtime,saved=new Map()){
 if(!saved.has(KEY)){
  const state=initial();state.requiredAutofill.enabled=false;
  saved.set(KEY,JSON.stringify(state));
 }
 return createHarness(runtime,saved);
}
module.exports={createManualHarness};
