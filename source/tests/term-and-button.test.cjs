const test=require('node:test'),assert=require('node:assert/strict');
const {loadRuntime}=require('./helpers/runtime.cjs');
const {createHarness}=require('./helpers/dom.cjs');
const runtime=loadRuntime(),KEY='shunan-course-planner-2026-v1';
const app=(saved=new Map())=>createHarness(runtime,saved);
const terms=['1Q','2Q','前期','3Q','4Q','後期','通年'];
async function add(a,course){await a.click('',{course});assert.equal(a.get('saveCourse').disabled,false,course);await a.click('saveCourse');}

test('起動・画面切替・年次切替では追加せず、チェックではなくボタンを表示する',async()=>{
 const a=app();assert.equal(a.read('state.plans.length'),0);
 assert(a.get('main').innerHTML.includes('<button class="btn secondary small-btn" id="addRequiredCourses">'));
 assert(!a.get('main').innerHTML.includes('autoRequiredEnabled'));
 for(const term of terms)await a.change('planTerm',term);
 await a.change('academicYear','2');await a.click('',{view:'progress'});await a.click('',{view:'plan'});
 assert.equal(a.read('state.plans.length'),0);
 await a.click('addRequiredCourses');assert(a.read("state.plans.some(p=>p.courseId==='C061'&&p.year===2027)"));
});

test('旧設定がオン・オフのどちらでも自動実行せず、押したときだけ追加する',async()=>{
 for(const enabled of [true,false]){
  const first=app();const raw=JSON.parse(first.read('JSON.stringify(state)'));raw.requiredAutofill.enabled=enabled;
  const a=app(new Map([[KEY,JSON.stringify(raw)]]));assert.equal(a.read('state.plans.length'),0);
  await a.click('addRequiredCourses');assert.equal(a.read('state.plans.length'),15);
  const before=a.read('JSON.stringify(state.plans)');await a.click('addRequiredCourses');assert.equal(a.read('JSON.stringify(state.plans)'),before);
 }
});

test('削除した必修は再起動しても戻らず、ボタンを再度押した場合だけ戻る',async()=>{
 const a=app();await a.click('addRequiredCourses');const id=a.read("state.plans.find(p=>p.courseId==='C055').id");
 await a.click('',{delete:id});await a.click('acceptConfirm');
 const b=app(a.saved);assert(!b.read("state.plans.some(p=>p.courseId==='C055')"));
 await b.click('addRequiredCourses');assert.equal(b.read("state.plans.filter(p=>p.courseId==='C055').length"),1);
});

test('通年の時間割を全7学期で表示し、元の計画と単位を重複させない',async()=>{
 const a=app();await add(a,'C035');
 for(const term of terms){
  await a.change('planTerm',term);
  assert(a.read("visiblePlans().some(p=>p.courseId==='C035')"),term);
  assert(a.read("weekly().includes('キャリア形成活動Ⅰ')"),term);
  assert.equal(a.read('state.plans.length'),1);
  assert.equal(a.read('E.progress(state,true).total'),2);
 }
});

test('前期・後期はその学期と通年だけを表示し、クォーター科目を混ぜない',async()=>{
 const a=app();for(const id of ['C035','C033','C037','C049','C055'])await add(a,id);
 await a.change('planTerm','前期');
 assert.deepEqual(JSON.parse(a.read('JSON.stringify(visiblePlans().map(p=>p.courseId).sort())')),['C033','C035']);
 await a.change('planTerm','後期');
 assert.deepEqual(JSON.parse(a.read('JSON.stringify(visiblePlans().map(p=>p.courseId).sort())')),['C035','C037']);
 await a.change('planTerm','通年');
 assert.deepEqual(JSON.parse(a.read('JSON.stringify(visiblePlans().map(p=>p.courseId))')),['C035']);
 await a.change('planTerm','1Q');assert(a.read("visiblePlans().some(p=>p.courseId==='C049')"));
 await a.change('planTerm','3Q');assert(a.read("visiblePlans().some(p=>p.courseId==='C055')"));
});

test('授業選択と科目一覧の学期検索にも前期・後期・通年の区別を適用する',async()=>{
 const a=app();await a.change('planTerm','前期');await a.click('addOnDemand');
 assert(a.get('slotChoices').innerHTML.includes('Python入門'));
 assert(!a.get('slotChoices').innerHTML.includes('Python応用'));
 assert(!a.get('slotChoices').innerHTML.includes('VBAプログラミング'));
 await a.click('closeSlot');await a.change('planTerm','後期');await a.click('addOnDemand');
 assert(a.get('slotChoices').innerHTML.includes('コミュニケーション英語Ⅱ'));
 assert(!a.get('slotChoices').innerHTML.includes('VBAプログラミング'));
 await a.click('closeSlot');await a.change('catalogTerm','前期');
 assert(a.read("catalogMatches(courseAt('C033'))"));
 assert(a.read("catalogMatches(courseAt('C035'))"));
 assert(!a.read("catalogMatches(courseAt('C050'))"));
 await a.change('planTerm','前期');await a.click('',{slotDay:'水',slotPeriod:'1'});
 assert(!a.get('slotChoices').innerHTML.includes('実社会とデータ分析'));
});

test('通年のオンデマンド科目もすべての学期に表示する',async()=>{
 const a=app();await add(a,'C055');const id=a.read('state.plans[0].id');
 await a.click('',{editDefinition:id});a.get('eTerm').value='通年';await a.click('saveEditor');
 for(const term of terms){await a.change('planTerm',term);assert(a.read("onDemandPlans().some(p=>p.courseId==='C055')"),term);}
 assert.equal(a.read('state.plans.length'),1);
});

test('週表示・実日付・オンデマンド・科目一覧に正しい科目区分を表示する',async()=>{
 const a=app();await add(a,'C050');await add(a,'C055');await a.change('planTerm','1Q');
 assert(a.read("weekly().includes('<span class=\"lesson-category\">学科基礎科目</span>')"));
 assert(a.read("planRow(state.plans[0]).includes('<span class=\"lesson-category\">学科基礎科目</span>')"));
 const firstDate=a.read('E.calendarFor(E.findOffer(state.plans[0],state),state.plans[0],state).events[0].date');
 await a.change('weekInput',firstDate);
 assert(a.read("dateCalendar().includes('<span class=\"lesson-category\">学科基礎科目</span>')"));
 await a.change('planTerm','3Q');
 assert(a.read("onDemandSection().includes('<span class=\"lesson-category\">学科基礎科目</span>')"));
 await add(a,'C075');await a.change('planTerm','4Q');assert(a.read("weekly().includes('DSプログラム科目')"));
});

test('ボタンでも不正な保存データを上書きしない',async()=>{
 const saved=new Map([[KEY,'{invalid']]);const a=app(saved);await a.click('addRequiredCourses');
 assert.equal(saved.get(KEY),'{invalid');assert.equal(a.read('state.plans.length'),0);
});
