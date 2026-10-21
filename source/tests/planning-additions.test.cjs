const test=require('node:test');
const assert=require('node:assert/strict');
const {loadRuntime}=require('./helpers/runtime.cjs');
const {createHarness}=require('./helpers/dom.cjs');
const {createManualHarness}=require('./helpers/manual.cjs');
const {createEngine}=require('../src/domain/engine.js');
const data=require('../data/courses.json');
const runtime=loadRuntime();
const KEY='shunan-course-planner-2026-v1';
const app=(saved=new Map())=>createHarness(runtime,saved);

test('初回は全員必修を配当年次の年度へ配置し、単位は修得済みにしない',()=>{
 const a=app();
 assert.equal(a.read('state.requiredAutofill.enabled'),true);
 assert.equal(a.read('state.plans.length'),15);
 for(const id of ['C033','C037','C049','C055','C059'])assert(a.read(`state.plans.some(p=>p.courseId==='${id}'&&p.year===2026)`));
 assert(!a.read("state.plans.some(p=>p.courseId==='C061')"));
 assert.equal(a.read('E.progress(state).total'),0);
 assert.equal(a.read('new Set(state.plans.map(p=>p.courseId)).size'),a.read('state.plans.length'));
 assert(a.get('main').innerHTML.includes('id="onDemandSection"'));
});

test('必修の重複を作らず、既存の年度・クラス・修得状態を保持して再起動する',async()=>{
 const manual=createManualHarness(runtime);
 await manual.click('',{course:'C055'});await manual.click('saveCourse');
 await manual.click('',{toggleEarned:manual.read('state.plans[0].id')});
 const saved=JSON.parse(manual.saved.get(KEY));
 delete saved.requiredAutofill;
 const a=app(new Map([[KEY,JSON.stringify(saved)]]));
 assert.equal(a.read("state.plans.filter(p=>p.courseId==='C055').length"),1);
 assert.equal(a.read("state.history.find(h=>h.courseId==='C055').status"),'earned');
 assert.equal(a.read('E.progress(state).total'),2);
 const count=a.read('state.plans.length');
 const b=app(a.saved);assert.equal(b.read('state.plans.length'),count);
 assert.equal(b.read("state.history.find(h=>h.courseId==='C055').status"),'earned');
});

test('表示年次を変えると対応する必修を追加し、以前の年度を保持する',async()=>{
 const a=app();const count=a.read('state.plans.length');
 await a.change('academicYear','2');
 assert(a.read("state.plans.some(p=>p.courseId==='C061'&&p.year===2027)"));
 assert.equal(a.read('state.plans.filter(p=>p.year===2026).length'),count);
 await a.change('academicYear','1');await a.change('academicYear','2');
 assert.equal(a.read("state.plans.filter(p=>p.courseId==='C061').length"),1);
});

test('選択したプログラムだけの必修を配当年次で追加する',async()=>{
 const a=app();const input=a.get('goal');input.dataset={program:'DS'};
 await a.change('goal','',true);
 assert(a.read("state.plans.some(p=>p.courseId==='C075'&&p.year===2026)"));
 assert(!a.read("state.plans.some(p=>p.courseId==='C089'||p.courseId==='C102')"));
 await a.change('academicYear','2');
 for(const id of ['C076','C077','C078'])assert(a.read(`state.plans.some(p=>p.courseId==='${id}'&&p.year===2027)`));
});

test('削除した必修は再起動しても戻らず、戻す操作で再配置できる',async()=>{
 const a=app();const id=a.read("state.plans.find(p=>p.courseId==='C055').id");
 await a.click('',{delete:id});await a.click('acceptConfirm');
 assert(!a.read("state.plans.some(p=>p.courseId==='C055')"));
 const b=app(a.saved);assert(!b.read("state.plans.some(p=>p.courseId==='C055')"));
 await b.click('restoreRequiredCourses');
 assert.equal(b.read("state.plans.filter(p=>p.courseId==='C055').length"),1);
});

test('自動追加をオフにしても既存の計画を残し、次の年度は自動追加しない',async()=>{
 const a=app();const count=a.read('state.plans.length');
 await a.change('autoRequiredEnabled','',false);
 await a.change('academicYear','2');
 assert.equal(a.read('state.plans.length'),count);
 assert(!a.read('state.plans.some(p=>p.year===2027)'));
 const b=app(a.saved);assert.equal(b.read('state.requiredAutofill.enabled'),false);
});

test('複数クラスの必修は共通枠を仮置きし、クラス選択後に確定する',async()=>{
 const a=app();const id=a.read("state.plans.find(p=>p.courseId==='C030').id");
 assert.equal(a.read(`state.plans.find(p=>p.id==='${id}').offerId`),'');
 assert.equal(a.read(`state.plans.find(p=>p.id==='${id}').requiredClassPending`),true);
 assert(a.read(`state.plans.find(p=>p.id==='${id}').tentativeMeetings.some(m=>m.day==='水'&&m.period===3)`));
 await a.change('planTerm','1Q');await a.click('',{edit:id});
 assert.equal(a.get('saveCourse').disabled,true);
 const offer=a.read("E.getOffers(courseAt('C030'),2026,state)[2].id");
 await a.change('dOffer',offer);await a.click('saveCourse');
 assert.equal(a.read(`state.plans.find(p=>p.id==='${id}').offerId`),offer);
 assert(!a.read(`state.plans.find(p=>p.id==='${id}').requiredClassPending`));
});

test('先修条件を満たさない必修は自動登録せず、理由を表示する',async()=>{
 const a=app();await a.change('academicYear','3');await a.change('planTerm','1Q');
 assert(!a.read("state.plans.some(p=>p.courseId==='C117')"));
 assert(a.get('main').innerHTML.includes('自動追加できない必修'));
 assert(a.get('main').innerHTML.includes('プログラムの必修'));
});

test('オンデマンド欄の候補は表示学期・年次・授業形態に一致する',async()=>{
 const a=createManualHarness(runtime);await a.click('addOnDemand');
 assert.equal(a.get('slotDialog').open,true);
 assert(a.get('slotChoices').innerHTML.includes('VBAプログラミング'));
 assert(!a.get('slotChoices').innerHTML.includes('Python入門'));
 assert(!a.get('slotChoices').innerHTML.includes('地方創生とDX'));
 await a.input('slotSearch','VBA');assert(a.get('slotChoices').innerHTML.includes('VBAプログラミング'));
 await a.click('closeSlot');await a.change('planTerm','1Q');await a.click('addOnDemand');
 assert(a.get('slotChoices').innerHTML.includes('Python入門'));
 assert(!a.get('slotChoices').innerHTML.includes('VBAプログラミング'));
});

test('オンデマンド欄から追加・修得済みへの変更・削除ができ、固定枠に置かない',async()=>{
 const a=createManualHarness(runtime);await a.click('addOnDemand');
 const offer=a.read("E.getOffers(courseAt('C055'),2026,state)[0].id");
 await a.click('',{slotCourse:'C055',slotOffer:offer});await a.click('saveCourse');
 const id=a.read('state.plans[0].id');
 assert(a.read('onDemandPlans().some(p=>p.courseId==="C055")'));
 assert(!a.read('weekly().includes("VBAプログラミング")'));
 await a.click('',{toggleEarned:id});assert.equal(a.read('E.progress(state).total'),2);
 await a.click('',{delete:id});await a.click('acceptConfirm');
 assert.equal(a.read('onDemandPlans().length'),0);
});

test('必修オンデマンドは自動で新設欄に入り、重複追加の候補を無効にする',async()=>{
 const a=app();assert(a.read('onDemandPlans().some(p=>p.courseId==="C055")'));
 await a.click('addOnDemand');
 assert(a.get('slotChoices').innerHTML.includes('disabled title="時間割に登録済みです"'));
 const count=a.read('state.plans.length');
 await a.click('',{slotCourse:'C055',slotOffer:'I25'});
 assert.equal(a.read('state.plans.length'),count);
});

test('不正な保存データがある場合、自動追加で元データを上書きしない',()=>{
 const saved=new Map([[KEY,'{invalid']]);const a=app(saved);
 assert.equal(saved.get(KEY),'{invalid');assert.equal(a.read('state.plans.length'),0);
});

test('JSONは自動追加の設定と除外を復元し、不正な設定を拒否する',()=>{
 const e=createEngine(data),s=e.initial();s.requiredAutofill.skipped=['2026:C055'];
 assert.equal(e.validateState(JSON.parse(JSON.stringify(s))).requiredAutofill.skipped[0],'2026:C055');
 for(const invalid of [{enabled:'yes',skipped:[]},{enabled:true,skipped:['oops']},{enabled:true,skipped:['2026:missing']},null]){
  assert.throws(()=>e.validateState({...s,requiredAutofill:invalid}),/自動追加設定/);
 }
 const old={...s};delete old.requiredAutofill;assert.equal(e.validateState(old).requiredAutofill.enabled,true);
});

test('単位上限を超える自動追加は既存の計画を保持して保留する',()=>{
 const e=createEngine(data),s=e.initial();
 const c=e.byId.get('C055');e.upsertCourse(s,{...c,credits:24},2026,{term:'3Q',delivery:'オンデマンド',meetings:[],sessions:[],prerequisites:[],remote:null});
 const updated=createEngine(data,s);const result=updated.autofillRequired(s,2026);
 assert(result.blocked.some(item=>item.reasons.some(reason=>reason.includes('上限'))));
 assert(s.plans.every(p=>updated.evaluate(p,s).cap.annual<=48));
});

test('全クラスが既存の予定と衝突する必修は自動追加せず通知対象にする',()=>{
 const e=createEngine(data),s=e.initial();
 const c=e.byId.get('C003'),offer=e.getOffers(c,2026,s)[0];
 const sessions=e.calendarFor(offer,{courseId:c.id,year:2026,term:offer.term},s).events.map(({date,start,end})=>({date,start,end}));
 s.plans.push({id:'existing',courseId:'C032',year:2026,term:'前期',offerId:'',sessions,remote:null});
 e.setRecordStatus(s,s.plans[0],'current');
 const result=e.autofillRequired(s,2026);
 assert(!s.plans.some(p=>p.courseId==='C003'));
 assert(result.blocked.some(item=>item.courseId==='C003'&&item.reasons.some(reason=>reason.includes('重複'))));
});

test('クラス未選択の必修でも共通する実施日との衝突を禁止する',()=>{
 const e=createEngine(data),s=e.initial();e.autofillRequired(s,2026);
 const required=s.plans.find(p=>p.courseId==='C003');
 const events=e.calendarFor(e.findOffer(required,s),required,s).events;
 assert(events.length>0);
 const candidate={id:'later',courseId:'C032',year:2026,term:'前期',offerId:'',sessions:events.map(({date,start,end})=>({date,start,end})),remote:null};
 assert(e.evaluate(candidate,s).errors.some(reason=>reason.includes('重複')));
});

test('クラス未選択の必修を科目編集でオンデマンドに変えると新設欄へ移る',async()=>{
 const a=app();await a.change('planTerm','1Q');
 const id=a.read("state.plans.find(p=>p.courseId==='C030').id");
 await a.click('',{editDefinition:id});a.get('eDelivery').value='オンデマンド';
 await a.click('saveEditor');
 assert(!a.read(`state.plans.find(p=>p.id==='${id}').requiredClassPending`));
 assert(a.read("onDemandPlans().some(p=>p.courseId==='C030')"));
 assert(!a.read("weekly().includes('教養ゼミ')"));
});
