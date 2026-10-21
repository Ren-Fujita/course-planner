/* Shared by the portable HTML and the rule verification suite. */
(function(root){
'use strict';
const TERMS=['1Q','2Q','前期','3Q','4Q','後期','通年'];
const SEM=t=>['1Q','2Q','前期'].includes(t)?'前期':['3Q','4Q','後期'].includes(t)?'後期':'通年';
const normalize=s=>String(s||'').normalize('NFKC').replace(/[\s・、,（）()－-]/g,'');
const uniq=a=>[...new Set(a)];
const sum=a=>a.reduce((s,x)=>s+x,0);
const allocTerm=c=>c.allocation_raw.includes('Q1+Q2+Q3+Q4')||c.allocation_raw.includes('通')?'通年':c.allocation_raw.includes('Q1+Q2')?'前期':c.allocation_raw.includes('Q3+Q4')?'後期':c.allocation_raw.includes('Q')?(c.allocation_raw.match(/Q([1-4])/)?.[1]||'1')+'Q':c.allocation_raw.includes('前')?'前期':'後期';
const initial=()=>({kind:'shunan-course-plan',version:1,cohort:2026,plans:[],history:[],programs:[],academicYears:{},graduationYear:2029,thesisSubmitted:false,thesisPassed:false,residenceConfirmed:false,customCourses:[],courseVersions:[],catalogSettings:{hideEarned:true,term:'',year:''},requiredAutofill:{enabled:true,skipped:[]},packs:[],updatedAt:null});
const minutes=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);
const overlaps=(a,b)=>a.date===b.date&&minutes(a.start)<minutes(b.end)&&minutes(b.start)<minutes(a.end);
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const validTime=s=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
const validSession=s=>s&&validDate(s.date)&&validTime(s.start)&&validTime(s.end)&&minutes(s.start)<minutes(s.end);
const sessionKey=s=>s.date+' '+s.start+' '+s.end;
function createEngine(data,config={}){
 const courses=[...data.catalog,...(config.customCourses||[])], byId=new Map(courses.map(c=>[c.id,c])), byName=new Map(courses.map(c=>[normalize(c.name),c]));
 data.catalog.forEach(c=>byName.set(normalize(c.name),c));
 const details=new Map((data.syllabus_details_reviewed||[]).map(d=>[normalize(d.name),d]));
 const conflicts=data.web_conflicts||[], periods=data.class_periods;
 const offers=[];
 (data.regular_offerings||[]).forEach((o,i)=>{if(!byId.has(o.course_id))return; const detail=details.get(normalize(byId.get(o.course_id).name));
  offers.push({id:'R'+i,courseId:o.course_id,label:o.name_raw,term:o.term,year:2026,meetings:o.meetings,delivery:detail?.delivery||(o.meetings.some(m=>/オンライン/.test(m.room_raw))?'オンライン':'対面'),notes:o.note_refs,selection:o.meeting_selection,source:'T',minimumYear:o.timetable_year,conditionalMapping:o.mapping_status.includes('候補')});
 });
 (data.intensive_offerings||[]).forEach((o,i)=>{if(!byId.has(o.course_id))return;offers.push({id:'I'+i,courseId:o.course_id,label:o.name_raw,term:o.term,year:2026,meetings:[],delivery:o.delivery_raw,schedule:o.schedule_raw,notes:o.note_refs,source:'T',minimumYear:Number(o.timetable_year_raw)||null});});
 (data.practicum||[]).forEach((o,i)=>{const c=byName.get(normalize(o.name));if(c)offers.push({id:'P'+i,courseId:c.id,label:o.name,term:allocTerm(c),year:2026,meetings:[],delivery:'対面実習',schedule:o.dates_raw,source:'T',minimumYear:o.year});});
 function courseConflicts(c){return conflicts.filter(x=>normalize(x.course).includes(normalize(c.name))||normalize(c.name).includes(normalize(x.course))||(x.course==='コミュニケーション英語Ⅱ・Ⅲ'&&['コミュニケーション英語Ⅱ','コミュニケーション英語Ⅲ'].includes(c.name)));}
 function versionAt(id, year, state, includeDeleted = true) {
  return (state.courseVersions || [])
   .filter(version => version.courseId === id && version.fromYear <= year && (includeDeleted || !version.deleted))
   .sort((a, b) => b.fromYear - a.fromYear)[0];
 }
 function latestVersion(id, year, state) {
  return versionAt(id, year, state);
 }
 function courseFor(id, year, state) {
  return versionAt(id, year, state, false)?.course || byId.get(id);
 }
 function available(id,year,state){const c=byId.get(id);return !!c&&(!c.fromYear||c.fromYear<=year)&&!latestVersion(id,year,state)?.deleted;}
 function catalogFor(year,state){return courses.filter(c=>available(c.id,year,state)).map(c=>courseFor(c.id,year,state));}
 function getOffers(c,year,state){
  const version=latestVersion(c.id,year,state);
  if(version&&!version.deleted&&version.offer)return [{...version.offer,sessions:(version.offer.sessions||[]).filter(s=>Number(s.date.slice(0,4))===(Number(s.date.slice(5,7))<4?year+1:year)),id:'U-'+c.id,courseId:c.id,label:version.course.name,year,source:'手入力の年度別設定'}];
  const pack=state.packs.find(p=>p.academicYear===year);
  if(pack)return pack.offerings.filter(o=>o.courseId===c.id).map(o=>({...o,year,source:'取込資料'}));
  if(year===2026)return offers.filter(o=>o.courseId===c.id);
  const defaults=offers.filter(o=>o.courseId===c.id).map(o=>({...o,year,source:'時間割設定（2026年度を初期値）',schedule:'',scheduleReference:o.schedule||'',notes:[],conditionalMapping:false}));
  return defaults.length?defaults:[{id:'D-'+c.id,courseId:c.id,label:c.name,term:allocTerm(c),year,delivery:'未設定',meetings:[],source:'時間割設定',minimumYear:minimumYear(c)}];
 }
 function findOffer(p,state){
  if(!p||!byId.has(p.courseId))return null;
  if(p.requiredClassPending)return null;
  const choices=getOffers(byId.get(p.courseId),p.year,state),exact=choices.find(o=>o.id===p.offerId);
  if(exact)return exact;
  if(p.year<2027||p.sessions?.length)return null;
  const term=choices.filter(o=>o.term===p.term),half=choices.filter(o=>SEM(o.term)===SEM(p.term));
  if(term.length===1)return term[0];if(half.length===1)return half[0];return choices.length===1?choices[0]:null;
 }
 const minimumYear=c=>Number(c.allocation_raw.match(/^\d/)?.[0]||1);
 const recordStatus=(p,state)=>state.history.find(h=>h.courseId===p.courseId)?.status||'current';
 function setRecordStatus(state,p,status){
  if(!['planned','earned','current','failed'].includes(status)||!state.plans.some(x=>x.id===p.id&&x.courseId===p.courseId))throw Error('時間割に入れた科目の履修状態だけを変更できます。');
  state.history=state.history.filter(h=>h.courseId!==p.courseId);
  state.history.push({...p,status:status==='planned'?'current':status});
 }
 function syncTimeline(state){
  for(const h of state.history){
   const existing=state.plans.find(p=>p.courseId===h.courseId);
   const id=existing?.id||h.id||('history-'+h.courseId);
   const status=h.status;
   if(existing)Object.assign(h,existing,{id,status});else h.id=id;
   const rec={...(existing||h),id};delete rec.status;
   state.plans=state.plans.filter(p=>p.courseId!==h.courseId).concat(rec);
  }
  return state;
 }
 function calendarFor(o,p,state){
  const events=[],pending=[];
  const add=(date,m)=>{const t=periods.find(x=>x.period===m.period);if(t)events.push({date,start:t.start,end:t.end,period:m.period,day:m.day,room:m.room_raw||'',source:o?.source?.includes('手入力')?'設定した曜限・学事暦':'T・C'});};
  if(p.sessions?.length)return {events:p.sessions.map(s=>({...s,source:'手入力'})),pending:['実施日時は手入力の情報です。'],manual:true};
  if(!o&&p.requiredClassPending){
   const choices=getOffers(courseFor(p.courseId,p.year,state),p.year,state);
   if(choices.length){
    const calendars=choices.map(offer=>calendarFor(offer,{...p,requiredClassPending:false},state));
    const common=calendars[0].events.filter(event=>calendars.every(calendar=>calendar.events.some(other=>sessionKey(event)===sessionKey(other))));
    return {events:dedup(common),pending:['開講クラスが未選択のため、全クラスに共通する実施日時だけで重複判定しています。']};
   }
  }
  if(!o)return {events:[],pending:['曜限は時間割に保存しています。実日付の情報が未設定です。']};
  if(o.sessions?.length)return {events:o.sessions.map(s=>({...s,source:'取込資料'})),pending:[]};
  if(o.delivery==='オンデマンド')return {events:[],pending:[]};
  if(o.year!==2026){
   const pack=state.packs.find(x=>x.academicYear===o.year);
   if(!pack?.calendar.length)return {events:[],pending:['実日付の学事暦がありません。']};
   pack.calendar.filter(r=>r.term===o.term).forEach(r=>o.meetings.filter(m=>m.day===r.weekday).forEach(m=>add(r.date,m)));
   return {events:dedup(events),pending:events.length?[]:['実施日が見つかりません。']};
  }
  const c=courseFor(p.courseId,p.year,state);
  if(c.name==='オブジェクト指向プログラミング'&&!c.userEdited)return {events:[],pending:['時間割の固定枠とシラバスのオンデマンド表記が相違しています。']};
  if(o.schedule){
   const groups=o.schedule.split(/、(?=\d{1,2}\/\d{1,2})/);
   // Specific schedules are grouped so a trailing period range applies to all listed dates.
   const dateMatches=[...o.schedule.matchAll(/(\d{1,2})\/(\d{1,2})/g)];
   const range=o.schedule.match(/([1-5])\s*[～〜-]\s*([1-5])(?:時限|限)/);
   for(let i=0;i<dateMatches.length;i++){
    const d=dateMatches[i],month=Number(d[1]),date=`${month<4?2027:2026}-${d[1].padStart(2,'0')}-${d[2].padStart(2,'0')}`;
    const tail=o.schedule.slice(d.index,(dateMatches[i+1]?.index??o.schedule.length));
    const one=tail.match(/([1-5])限/);
    const nums=one?[Number(one[1])]:range?Array.from({length:Number(range[2])-Number(range[1])+1},(_,j)=>Number(range[1])+j):[];
    nums.forEach(period=>add(date,{period,day:'月火水木金土日'[(new Date(date+'T00:00:00Z').getUTCDay()+6)%7]}));
   }
   if(!events.length)pending.push('集中講義の時刻・開催日が未確定です。');
   if(o.delivery.includes('オンデマンド'))pending.push('対面日以外はオンデマンドです。');
   return {events:dedup(events),pending};
  }
  if(!o.meetings?.length)return {events:[],pending:['同期授業・実習の日時が未確定です。']};
  if(o.meetings.some(m=>m.weekday_period_raw?.includes('隔週')))return {events:[],pending:['隔週の実施日が未公表です。必要に応じて実施日を入力してください。']};
  let meetings=o.meetings;
  if(o.selection?.includes('または'))meetings=meetings.filter(m=>m.period===Number(p.chosenPeriod||3));
  for(const r of data.calendar_2026_raw_daily){
   const half=r.date<'2026-09-01'?'前期':'後期';
   if(o.term==='前期'||o.term==='後期'||o.term==='通年'){
    if(o.term!=='通年'&&o.term!==half)continue;
    const day=r.semester_raw.match(/([月火水木金])([①-⑮])/u)?.[1];
    if(day)meetings.filter(m=>m.day===day).forEach(m=>add(r.date,m));
   }else{
    const q=r.date<'2026-06-15'?'1Q':r.date<'2026-09-01'?'2Q':r.date<'2026-11-30'?'3Q':'4Q';
    if(q!==o.term)continue;
    const group=r.quarter_raw.match(/(月木|火金|水)\s*([①-⑯\s]+)/u);
    if(!group||!/[①-⑮]/u.test(group[2]))continue;
    let ms=meetings.filter(m=>group[1].includes(m.day));
    if(group[1]==='水'&&group[2].includes('⑯'))ms=ms.slice().sort((a,b)=>a.period-b.period).slice(0,1);
    ms.forEach(m=>add(r.date,m));
   }
  }
  if(o.term==='4Q'&&meetings.some(m=>'月木'.includes(m.day)))pending.push('2027年1月13日のクォーター授業は学事暦の記載が相違し、判定を保留しています。');
  if(o.notes?.includes('※1'))pending.push('追加の集中講義の日程が未確定です。');
  if(o.conditionalMapping)pending.push('クラスと科目の対応・割当を確認してください。');
  return {events:dedup(events),pending};
 }
 function dedup(events){return [...new Map(events.map(s=>[sessionKey(s),s])).values()].sort((a,b)=>sessionKey(a).localeCompare(sessionKey(b)));}
 function completedBefore(state,p){
  const rank=t=>({ '1Q':1,'2Q':2,'前期':2,'3Q':3,'4Q':4,'後期':4,'通年':4 }[t]||4);
  const start=t=>({ '1Q':1,'2Q':2,'前期':1,'3Q':3,'4Q':4,'後期':3,'通年':1 }[t]||1);
  const previous=r=>r.year<p.year||(r.year===p.year&&rank(r.term)<start(p.term));
  const actual=state.history.filter(h=>h.status==='earned'&&previous(h)).map(h=>h.courseId);
  const earlier=state.plans.filter(x=>x.id!==p.id&&previous(x)&&recordStatus(x,state)!=='failed').map(x=>x.courseId);
  return {actual:new Set(actual),projected:new Set([...actual,...earlier]),conditional:earlier.some(id=>!actual.includes(id))};
 }
 const creditRange=c=>c.name==='ビジネス英作文'&&!c.userEdited?{min:1,max:2}:{min:c.credits,max:c.credits};
 function cap(state,p){
  const plans=state.plans.filter(x=>x.id!==p.id&&x.year===p.year).concat(p);
  const histories=state.history.filter(h=>h.year===p.year&&!plans.some(p=>p.courseId===h.courseId));
  const records=[...plans,...histories];
  const annual=sum(uniq(records.map(r=>r.courseId)).map(id=>creditRange(courseFor(id,p.year,state)).min));
  const half=SEM(p.term),specific=records.filter(x=>SEM(x.term)===half&&half!=='通年');
  const semester=sum(uniq(specific.map(r=>r.courseId)).map(id=>creditRange(courseFor(id,p.year,state)).min));
  return {annual,semester,half,annualUnknown:records.some(r=>creditRange(courseFor(r.courseId,p.year,state)).min!==creditRange(courseFor(r.courseId,p.year,state)).max),annualCourses:records.some(r=>r.term==='通年')};
 }
 function evaluate(p,state){
  const c=courseFor(p.courseId,p.year,state), errors=[],pending=[],notes=[];
  if(!c)return {errors:['科目が見つかりません。'],pending:[],notes:[],events:[]};
  if(!available(c.id,p.year,state))errors.push('この年度の科目一覧から削除されている科目です。');
  const o=findOffer(p,state), dd=details.get(normalize(c.name));
  if(p.requiredClassPending)pending.push('複数の開講クラスがあります。所属クラスを選んでください。共通する曜限がある場合は仮置きしています。');
  const year=Number(state.academicYears[p.year]||Math.min(4,p.year-2025));
  const cs=courseConflicts(c),yearConflict=cs.some(x=>x.field==='年次');
  const minYear=minimumYear(c);
  if(year<minYear)errors.push(`履修上の年次が${year}年次です。この科目は${minYear}年次以降に履修できます。`);
  if(yearConflict)pending.push('配当年次に資料間の相違があります。');
  const editingLinkedRecord=state.plans.some(x=>x.id===p.id&&x.courseId===c.id);
  if(state.history.some(h=>h.courseId===c.id&&h.status==='earned'&&(!editingLinkedRecord||h.id!==p.id)))errors.push('すでに修得済みの科目です。');
  if(state.history.some(h=>h.courseId===c.id&&h.status==='current'&&(!editingLinkedRecord||h.id!==p.id)))errors.push('履修中として入力済みです。履歴を修正してから計画してください。');
  if(state.plans.some(x=>x.id!==p.id&&x.courseId===c.id))errors.push('すでに計画に含まれています。同じ科目は一度だけ配置できます。');
  const prior=completedBefore(state,p);
  const basicReq=courses.filter(x=>x.category==='学科基礎科目'&&x.required_for_all).map(x=>x.id);
  const checkIDs=(ids,label)=>{const missing=ids.filter(id=>!prior.projected.has(id)); if(missing.length)errors.push(label+'：'+missing.map(id=>byId.get(id)?.name||id).join('、'));else if(ids.some(id=>!prior.actual.has(id)))notes.push('先修条件は以前の計画の修得を仮定した、条件付きの見込みです。');};
  if(c.id===byName.get(normalize('専門ゼミ1'))?.id){
   checkIDs(basicReq,'学科基礎の必修科目が不足しています');
   const programs=['DS','IE','BA'].map(pr=>courses.filter(x=>x.required_in_programs.includes(pr)).map(x=>x.id));
   const ok=programs.find(ids=>ids.every(id=>prior.projected.has(id)));
   if(!ok)errors.push('いずれか一つのプログラムの必修8単位を先に修得する必要があります。');
   else if(ok.some(id=>!prior.actual.has(id)))notes.push('プログラム必修は、以前の計画の修得を仮定しています。');
  }
  if(c.id===byName.get(normalize('専門ゼミ2'))?.id)checkIDs([byName.get(normalize('専門ゼミ1')).id],'必須先修科目が不足しています');
  if(c.id===byName.get(normalize('卒業研究'))?.id)checkIDs(['専門ゼミ1','専門ゼミ2'].map(n=>byName.get(normalize(n)).id),'必須先修科目が不足しています');
  if(o?.prerequisites?.length)checkIDs(o.prerequisites,'取込資料の必須先修科目が不足しています');
  if(dd?.recommended_prerequisites?.length)notes.push('推奨先修科目：'+dd.recommended_prerequisites.join('、')+'（未修得だけでは禁止しません）');
  if(!dd&&!o?.prerequisites&&!['専門ゼミ1','専門ゼミ2','卒業研究'].includes(c.name))pending.push('この科目のシラバス詳細の先修条件は未確認です。');
  if(p.year===2026)cs.forEach(x=>pending.push(`${x.field}に資料間の相違があります。`));
  if(p.year===2026)pending.push('時間割ファイル名と紙面の更新日に相違があり、使用版の確認が必要です。');
  if(p.remote==null&&o?.remote==null)pending.push('遠隔授業60単位上限の対象かどうかは未確認です。');
  const k=cap(state,p);
  if(k.annual>48)errors.push(`年間の履修計画が${k.annual}単位です。標準上限48単位を超えています。`);
  if(k.semester>24)errors.push(`${k.half}の履修計画が${k.semester}単位です。標準上限24単位を超えています。`);
  if(k.annualCourses)pending.push('通年科目の半期CAP算入時期は未確認です。年間CAPには一度だけ算入します。');
  if(k.annualUnknown)pending.push('単位数の相違を含むため、上限の厳密な判定は保留です。');
  const schedule=calendarFor(o,p,state);pending.push(...schedule.pending);
  for(const other of state.plans.filter(x=>x.id!==p.id&&x.year===p.year)){
   const oe=calendarFor(findOffer(other,state),other,state).events;
   const hit=schedule.events.flatMap(e=>oe.filter(x=>overlaps(e,x)).map(x=>({e,x})))[0];
   if(hit)errors.push(`${byId.get(other.courseId).name}と${hit.e.date} ${hit.e.start}〜${hit.e.end}の授業が重複しています。`);
  }
  for(const h of state.history.filter(h=>h.status==='current'&&h.year===p.year&&h.courseId!==p.courseId&&!state.plans.some(x=>x.courseId===h.courseId))){
   const oe=calendarFor(findOffer(h,state),h,state).events;
   const hit=schedule.events.find(e=>oe.some(x=>overlaps(e,x)));
   if(hit)errors.push(`履修中の${byId.get(h.courseId).name}と${hit.date} ${hit.start}の授業が重複しています。`);
  }
  const remoteIds=uniq([...state.history.filter(h=>h.status==='earned').map(h=>h.courseId),...state.plans.filter(x=>x.id!==p.id).map(x=>x.courseId),p.courseId]);
  const remoteConfirmed=remoteIds.filter(id=>{const rec=state.plans.find(x=>x.courseId===id)||state.history.find(x=>x.courseId===id)||(id===p.courseId?p:null);return rec?.remote===true||findOffer(rec,state)?.remote===true;});
  const rc=sum(remoteConfirmed.map(id=>{const r=state.plans.find(x=>x.courseId===id)||state.history.find(x=>x.courseId===id)||p;return creditRange(courseFor(id,r.year,state)).min;}));
  if(rc>60)errors.push(`確認済みの遠隔対象科目が${rc}単位で、算入上限60単位を超えています。`);
  return {errors:uniq(errors),pending:uniq(pending),notes:uniq(notes),events:schedule.events,cap:k,status:errors.length?'invalid':pending.length?'pending':notes.length?'conditional':'checked'};
 }
 function progress(state,projected=false){
  const ids=uniq([...state.history.filter(h=>h.status==='earned').map(h=>h.courseId),...(projected?state.plans.filter(p=>recordStatus(p,state)!=='failed').map(p=>p.courseId):[])]);
  const chosen=ids.map(id=>{const r=state.history.find(h=>h.courseId===id&&h.status==='earned')||state.plans.find(p=>p.courseId===id);return courseFor(id,r?.year||2026,state);}).filter(Boolean);
  const total=sum(chosen.map(c=>creditRange(c).min)),totalMax=sum(chosen.map(c=>creditRange(c).max));
  const amount=fn=>sum(chosen.filter(fn).map(c=>creditRange(c).min));
  const have=new Set(ids),missing=fn=>courses.filter(fn).filter(c=>!have.has(c.id));
  const programs=['DS','IE','BA'].map(pr=>({id:pr,credits:amount(c=>c.programs.includes(pr)),required:amount(c=>c.required_in_programs.includes(pr)),missing:missing(c=>c.required_in_programs.includes(pr))}));
  const rows=[
   {name:'総修得単位',current:total,max:totalMax,need:124,missing:[]},
   {name:'総合科目の必修',current:amount(c=>c.category==='総合科目'&&c.required_for_all),need:19,strictRequired:true,missing:missing(c=>c.category==='総合科目'&&c.required_for_all)},
   {name:'学科基礎＋プログラム',current:amount(c=>c.category==='学科基礎科目'||c.category.includes('プログラム')),need:80,missing:[]},
   {name:'学科基礎の必修',current:amount(c=>c.category==='学科基礎科目'&&c.required_for_all),need:16,strictRequired:true,missing:missing(c=>c.category==='学科基礎科目'&&c.required_for_all)},
   {name:'実践英語グループ',current:amount(c=>c.group_minimum_credits===4),need:4,missing:missing(c=>c.group_minimum_credits===4)},
   {name:'演習の必修',current:amount(c=>c.category==='演習科目'&&c.required_for_all),need:8,strictRequired:true,missing:missing(c=>c.category==='演習科目'&&c.required_for_all)},
   {name:'他学科専門',current:amount(c=>c.category==='他学科専門科目'),need:4,missing:[]}
  ];
  return {ids,total,totalMax,rows,programs,complete:rows.every(r=>r.current>=r.need&&(!r.strictRequired||!r.missing.length))&&programs.some(p=>p.credits>=22&&p.required>=8&&!p.missing.length),missingMandatory:missing(c=>c.required_for_all)};
 }
 function validateState(x){
  if(!x||x.kind!=='shunan-course-plan'||x.version!==1||x.cohort!==2026||!Array.isArray(x.plans)||!Array.isArray(x.history)||!Array.isArray(x.packs))throw Error('2026年度入学生用の計画ファイルではありません。');
  x={...initial(),...x};
  const known=validateCustomizations(x);
  if(x.plans.length>300||x.history.length>300||x.packs.length>15)throw Error('データ件数が多すぎます。');
  const verify=(r)=>{if(!known.has(r.courseId)||!Number.isInteger(r.year)||r.year<2026||r.year>2040||!TERMS.includes(r.term)||!Array.isArray(r.sessions||[])||(r.sessions||[]).length>500||(r.sessions||[]).some(s=>!validSession(s)||Number(s.date.slice(0,4))!==(Number(s.date.slice(5,7))<4?r.year+1:r.year))||(r.remote!=null&&typeof r.remote!=='boolean'))throw Error('科目・年度・日時の形式が不正です。');};
  x.plans.forEach(verify);x.history.forEach(h=>{verify(h);if(!['earned','current','failed'].includes(h.status))throw Error('履歴の状態が不正です。');});
  for(const p of x.plans)if(p.tentativeMeetings!=null&&(!Array.isArray(p.tentativeMeetings)||p.tentativeMeetings.length>10||p.tentativeMeetings.some(m=>!['月','火','水','木','金'].includes(m.day)||!Number.isInteger(m.period)||m.period<1||m.period>5)))throw Error('仮の曜限が不正です。');
  if(x.plans.some(p=>typeof p.id!=='string')||uniq(x.plans.map(p=>p.id)).length!==x.plans.length||uniq(x.plans.map(p=>p.courseId)).length!==x.plans.length)throw Error('計画に重複があります。');
  if(uniq(x.history.map(h=>h.courseId)).length!==x.history.length)throw Error('履歴に重複があります。');
  if(!Array.isArray(x.programs)||x.programs.some(p=>!['DS','IE','BA'].includes(p)))throw Error('プログラムが不正です。');
  if(!x.academicYears||Object.values(x.academicYears).some(y=>!Number.isInteger(y)||y<1||y>4)||!Number.isInteger(x.graduationYear)||x.graduationYear<2029||x.graduationYear>2040)throw Error('年次・卒業予定年度が不正です。');
  if(!x.catalogSettings||typeof x.catalogSettings.hideEarned!=='boolean'||!['',...TERMS].includes(x.catalogSettings.term)||!['','1','2','3','4'].includes(String(x.catalogSettings.year)))throw Error('検索設定が不正です。');
  const autofill=x.requiredAutofill;
  if(!autofill||typeof autofill.enabled!=='boolean'||!Array.isArray(autofill.skipped)||autofill.skipped.length>3000||autofill.skipped.some(key=>{if(typeof key!=='string')return true;const [year,id,...extra]=key.split(':');return extra.length||!/^\d{4}$/.test(year)||Number(year)<2026||Number(year)>2040||!known.has(id);}))throw Error('必修の自動追加設定が不正です。');
  if(x.plans.some(p=>p.requiredClassPending!=null&&typeof p.requiredClassPending!=='boolean'))throw Error('開講クラスの選択状態が不正です。');
  x.packs.forEach(p=>validatePack(p,known,x));return syncTimeline(x);
 }

 function isRequired(c,state){return c.required_for_all||c.required_in_programs.some(program=>state.programs.includes(program));}

 function autofillRequired(state,year){
  const result={added:[],blocked:[]};
  if(!state.requiredAutofill?.enabled)return result;
  const grade=Number(state.academicYears[year]||Math.min(4,year-2025));
  const skipped=new Set(state.requiredAutofill.skipped);
  for(const c of catalogFor(year,state).filter(c=>isRequired(c,state)&&minimumYear(c)===grade)){
   if(skipped.has(year+':'+c.id)||state.plans.some(p=>p.courseId===c.id)||state.history.some(h=>h.courseId===c.id))continue;
   const choices=getOffers(c,year,state);
   if(!choices.length){result.blocked.push({courseId:c.id,reasons:['開講情報が未設定です。科目情報で学期・曜限を設定してください。']});continue;}
   const first=choices[0],multiple=choices.length>1;
   // Keep only meetings shared by every class; never pick a class on the user's behalf.
   const common=(first.meetings||[]).filter(m=>['月','火','水','木','金'].includes(m.day)&&choices.every(o=>o.term===first.term&&(o.meetings||[]).some(n=>n.day===m.day&&n.period===m.period))).map(m=>({day:m.day,period:m.period}));
   let id='required-'+year+'-'+c.id;
   while(state.plans.some(p=>p.id===id))id+='-auto';
   const record={id,courseId:c.id,year,term:multiple?allocTerm(c):first.term,offerId:multiple?'':first.id,chosenPeriod:3,sessions:[],tentativeMeetings:multiple?common:[],remote:null};
   if(multiple)record.requiredClassPending=true;
   if(multiple){
    const alternatives=choices.map(offer=>evaluate({...record,term:offer.term,offerId:offer.id,requiredClassPending:false},state));
    if(alternatives.every(check=>check.errors.length)){result.blocked.push({courseId:c.id,reasons:uniq(alternatives.flatMap(check=>check.errors))});continue;}
   }
   const checked=evaluate(record,state);
   if(checked.errors.length){result.blocked.push({courseId:c.id,reasons:checked.errors});continue;}
   state.plans.push(record);setRecordStatus(state,record,'current');result.added.push(record);
  }
  return result;
 }
 function validatePack(x,known=byId,settings=config){
  if(!x||x.kind!=='shunan-schedule'||x.version!==1||!Number.isInteger(x.academicYear)||x.academicYear<2027||x.academicYear>2040||!x.source?.title||!Array.isArray(x.offerings)||!Array.isArray(x.calendar))throw Error('開講情報の形式が不正です。2027年度以降の指定形式を使用してください。');
  if(x.offerings.length>500||x.calendar.length>1500)throw Error('件数が多すぎます。');
  if(uniq(x.offerings.map(o=>o.id)).length!==x.offerings.length)throw Error('開講クラスのIDが重複しています。');
  const inYear=s=>Number(s.slice(0,4))===(Number(s.slice(5,7))<4?x.academicYear+1:x.academicYear);
  for(const o of x.offerings){
   if(!known.has(o.courseId)||!TERMS.includes(o.term)||typeof o.id!=='string'||typeof o.label!=='string'||typeof o.delivery!=='string'||(o.remote!=null&&typeof o.remote!=='boolean')||!Array.isArray(o.meetings)||!Array.isArray(o.sessions)||o.sessions.some(s=>!validSession(s)||!inYear(s.date))||o.meetings.some(m=>!['月','火','水','木','金','土','日'].includes(m.day)||!Number.isInteger(m.period)||m.period<1||m.period>5)||!Array.isArray(o.prerequisites)||o.prerequisites.some(id=>!known.has(id)))throw Error('開講情報の科目・曜限・先修条件・日時が不正です。');
   if(o.minimumYear!=null&&(!Number.isInteger(o.minimumYear)||o.minimumYear<1||o.minimumYear>4))throw Error('配当年次が不正です。');
   const revision=versionAt(o.courseId,x.academicYear,settings,false);
   if(o.credits!=null&&o.credits!==(revision?.course?.credits??known.get(o.courseId).credits))throw Error('科目情報と単位数が異なります。科目情報を先に編集してください。');
  }
  for(const r of x.calendar)if(!validDate(r.date)||!inYear(r.date)||!TERMS.includes(r.term)||!['月','火','水','木','金','土','日'].includes(r.weekday))throw Error('学事暦の日付・授業曜日が不正です。');
  return x;
 }
 function validateCourse(c){
  if(!c||typeof c.id!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>150||typeof c.category!=='string'||!['総合科目','学科基礎科目','DSプログラム科目','IEプログラム科目','BAプログラム科目','演習科目','他学科専門科目'].includes(c.category)||!Number.isFinite(c.credits)||c.credits<0||c.credits>24||typeof c.allocation_raw!=='string'||!/^([1-4])/.test(c.allocation_raw)||typeof c.required_for_all!=='boolean'||!Array.isArray(c.programs)||!Array.isArray(c.required_in_programs)||[...c.programs,...c.required_in_programs].some(p=>!['DS','IE','BA'].includes(p)))throw Error('科目名・単位数・区分・年次・プログラムの入力を確認してください。');
 }
 function validateCustomizations(x){
  if(!Array.isArray(x.customCourses)||!Array.isArray(x.courseVersions)||x.customCourses.length>300||x.courseVersions.length>1000)throw Error('科目の編集データが不正です。');
  const known=new Map(data.catalog.map(c=>[c.id,c]));
  for(const c of x.customCourses){validateCourse(c);if(known.has(c.id)||!Number.isInteger(c.fromYear)||c.fromYear<2026||c.fromYear>2040)throw Error('追加科目のID・適用年度が不正です。');known.set(c.id,c);}
  if(uniq(x.courseVersions.map(v=>v.courseId+'-'+v.fromYear)).length!==x.courseVersions.length)throw Error('科目の適用年度が重複しています。');
  for(const v of x.courseVersions){
   if(v.deleted!=null&&typeof v.deleted!=='boolean')throw Error('科目の削除状態が不正です。');
   if(!known.has(v.courseId)||!Number.isInteger(v.fromYear)||v.fromYear<2026||v.fromYear>2040)throw Error('科目の適用年度が不正です。');
   if(v.deleted)continue;validateCourse(v.course);if(v.course.id!==v.courseId)throw Error('科目IDが一致しません。');
   const o=v.offer;if(!o||!TERMS.includes(o.term)||typeof o.delivery!=='string'||!Array.isArray(o.meetings)||o.meetings.length>20||o.meetings.some(m=>!['月','火','水','木','金','土','日'].includes(m.day)||!Number.isInteger(m.period)||m.period<1||m.period>5)||!Array.isArray(o.prerequisites)||o.prerequisites.some(id=>!known.has(id))||!Array.isArray(o.sessions)||o.sessions.some(s=>!validSession(s)||Number(s.date.slice(0,4))!==(Number(s.date.slice(5,7))<4?v.fromYear+1:v.fromYear)))throw Error('授業の学期・曜限・実施日時・先修条件が不正です。');
  }
  return known;
 }
 function upsertCourse(state,course,fromYear,offer){
  const next={...state,customCourses:[...(state.customCourses||[])],courseVersions:[...(state.courseVersions||[])]};
  if(!byId.has(course.id)&&!next.customCourses.some(c=>c.id===course.id))next.customCourses.push({...course,fromYear});
  next.courseVersions=next.courseVersions.filter(v=>!(v.courseId===course.id&&v.fromYear===fromYear)).concat({courseId:course.id,fromYear,course:{...course,userEdited:true,source_id:'U'},offer});
  validateCustomizations(next);state.customCourses=next.customCourses;state.courseVersions=next.courseVersions;
 }
 function deleteCourse(state,id,fromYear){
  const next={...state,customCourses:state.customCourses||[],courseVersions:(state.courseVersions||[]).filter(v=>!(v.courseId===id&&v.fromYear===fromYear)).concat({courseId:id,fromYear,deleted:true})};
  validateCustomizations(next);state.courseVersions=next.courseVersions;
 }
 return {data,courses,byId,byName,offers,courseFor,available,catalogFor,latestVersion,upsertCourse,deleteCourse,getOffers,findOffer,minimumYear,recordStatus,setRecordStatus,syncTimeline,calendarFor,evaluate,progress,cap,creditRange,courseConflicts,validateState,validatePack,initial,allocTerm,SEM,TERMS,overlaps,validSession,normalize,completedBefore,isRequired,autofillRequired};
}
root.Planner={createEngine,initial,overlaps,validSession,TERMS,allocTerm,SEM};
if(typeof module!=='undefined')module.exports=root.Planner;
})(typeof globalThis!=='undefined'?globalThis:this);
