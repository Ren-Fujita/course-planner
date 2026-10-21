// app/selectors.js

function courseAt(id,year=ui.year){return E.courseFor(id,year,state);}

function visiblePlans(){return state.plans.filter(p=>p.year===ui.year&&compatible(p.term,ui.term));}

function remoteAmount(){return E.progress(state,ui.projected).ids.reduce((n,id)=>{const r=state.history.find(h=>h.courseId===id&&h.status==='earned')||state.plans.find(p=>p.courseId===id);return n+(r.remote===true||E.findOffer(r,state)?.remote===true?E.creditRange(courseAt(id,r.year)).min:0);},0);}

function historyCourses(){return state.plans.map(p=>courseAt(p.courseId,p.year)).filter(c=>E.normalize(c.name).includes(E.normalize(ui.historyQ))).filter(c=>!ui.historyFilter||E.recordStatus(planByCourse(c.id),state)===ui.historyFilter);}

function slotCandidates(){
 const year=academicYearFor(),q=E.normalize(slotModel.q);
 return E.catalogFor(ui.year,state).filter(c=>E.minimumYear(c)<=year&&E.normalize(c.name).includes(q)).flatMap(c=>{
  const os=E.getOffers(c,ui.year,state),matches=os.filter(o=>compatible(o.term,ui.term)&&(slotModel.kind==='onDemand'?o.delivery==='オンデマンド':o.delivery!=='オンデマンド'&&o.meetings?.some(m=>m.day===slotModel.day&&m.period===slotModel.period)));
  if(matches.length)return matches.map(o=>({c,o}));
  return slotModel.kind!=='onDemand'&&ui.year>2026&&!os.length&&compatible(E.allocTerm(c),ui.term)?[{c,o:null}]:[];
 });
}

function onDemandPlans(){return visiblePlans().filter(p=>E.findOffer(p,state)?.delivery==='オンデマンド');}

function catalogMatches(c){const os=E.getOffers(c,ui.year,state),q=E.normalize(ui.q);return (!ui.hideEarned||!state.history.some(h=>h.courseId===c.id&&h.status==='earned'))&&(!ui.filterYear||E.minimumYear(c)===Number(ui.filterYear))&&(!ui.filterTerm||(ui.filterTerm==='通年'?os.some(o=>o.term==='通年'):os.some(o=>compatible(o.term,ui.filterTerm))))&&(!q||E.normalize(c.name+' '+os.flatMap(o=>o.meetings?.map(m=>m.instructor_raw)||[]).join(' ')).includes(q))&&(!ui.category||(ui.category.startsWith('program:')?c.programs.includes(ui.category.split(':')[1]):c.category===ui.category))&&(!ui.delivery||(ui.delivery==='未確定'?os.every(o=>o.delivery==='未設定'):os.some(o=>o.delivery?.includes(ui.delivery))))&&(!ui.mandatory||c.required_for_all||c.required_in_programs.some(p=>state.programs.includes(p)))&&(!ui.termOnly||os.some(o=>compatible(o.term,ui.term)));}

function planById(id) {
  return state.plans.find(plan => plan.id === id);
}

function planByCourse(courseId) {
  return state.plans.find(plan => plan.courseId === courseId);
}

function academicYearFor(year = ui.year) {
  return Number(state.academicYears[year] || Math.min(4, year - 2025));
}
