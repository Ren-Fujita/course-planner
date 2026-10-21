const test=require('node:test'),assert=require('node:assert/strict');
const {loadRuntime}=require('./helpers/runtime.cjs');
const {createManualHarness:createHarness}=require('./helpers/manual.cjs');
const runtime=loadRuntime();
const app=(saved=new Map())=>createHarness(runtime,saved);

test('未登録の入力項目は操作対象として扱わず、状態を変更しない', async () => {
 const a=app();const before=a.read('JSON.stringify(state)');
 await a.input('__proto__','ignored');await a.input('unknownField','ignored');
 assert.equal(a.read('JSON.stringify(state)'),before);
});

test('全5画面を生成し、科目検索で絞り込む',async()=>{
 const a=app();assert(a.get('main').innerHTML.includes('時間割'));
 for(const view of ['roadmap','progress','history','data','plan']){await a.click('',{view});assert(a.get('main').innerHTML.length>300);}
 await a.input('courseSearch','VBA');assert(a.get('courseList').innerHTML.includes('VBAプログラミング'));assert(!a.get('courseList').innerHTML.includes('計算機概論'));
});
test('計画追加、上位年次の禁止、2027年度以降の通常保存',async()=>{
 const a=app();await a.click('',{course:'C055'});assert.equal(a.get('saveCourse').disabled,false);await a.click('saveCourse');assert.equal(a.read('state.plans.length'),1);
 await a.click('',{course:'C061'});assert.equal(a.get('saveCourse').disabled,true);await a.click('saveCourse');assert.equal(a.read('state.plans.length'),1);
 await a.click('closeCourse');await a.click('',{course:'C052'});await a.change('dYear','2027');assert.equal(a.get('saveCourse').disabled,false);await a.click('saveCourse');assert.equal(a.read('state.plans.length'),2);assert.equal(a.read('state.plans[1].year'),2027);assert.equal(a.read('E.recordStatus(state.plans[1],state)'),'current');
});
test('履歴・目標プログラムを保存し、再起動で復元',async()=>{
 const a=app();await a.click('',{course:'C032'});await a.click('saveCourse');await a.click('',{history:'C032'});await a.change('dStatus','earned');await a.click('saveCourse');assert.equal(a.read('state.history[0].status'),'earned');
 const checkbox=a.get('pr');checkbox.dataset={program:'DS'};await a.change('pr','',true);assert.equal(a.read('state.programs[0]'),'DS');
 const b=app(a.saved);assert.equal(b.read('state.history[0].courseId'),'C032');assert.equal(b.read('state.programs[0]'),'DS');assert.equal(b.read('E.progress(state).total'),2);
});
test('空き枠から該当授業を選び、選択したクラスの全曜限を配置する',async()=>{
 const a=app();await a.change('planTerm','1Q');await a.click('',{slotDay:'水',slotPeriod:'1'});
 assert.equal(a.get('slotDialog').open,true);assert(a.get('slotChoices').innerHTML.includes('実社会とデータ分析'));
 const offer=a.read("E.getOffers(E.byId.get('C050'),2026,state)[0].id");
 await a.click('',{slotCourse:'C050',slotOffer:offer});await a.click('saveCourse');
 assert.equal(a.read('state.plans.length'),1);assert.equal(a.read('state.plans[0].offerId'),offer);
 assert(a.get('main').innerHTML.includes('data-slot-period="2"'));assert(a.get('main').innerHTML.includes('実社会とデータ分析'));
});
test('履修履歴には時間割に入れた科目だけを表示する',async()=>{
 const a=app();await a.click('',{view:'history'});assert(a.get('main').innerHTML.includes('時間割に入れた科目がありません'));assert(!a.get('main').innerHTML.includes('VBAプログラミング'));
 await a.click('',{view:'plan'});await a.click('',{course:'C055'});await a.click('saveCourse');await a.click('',{view:'history'});
 assert(a.get('main').innerHTML.includes('VBAプログラミング'));assert(!a.get('main').innerHTML.includes('計算機概論'));assert(a.get('main').innerHTML.includes('履修中'));
});
test('時間割で修得済みに設定し、履歴・卒業単位と同期して時間割に残す',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');const id=a.read('state.plans[0].id');
 await a.click('',{toggleEarned:id});assert.equal(a.read('state.plans.length'),1);assert.equal(a.read('state.history[0].status'),'earned');assert.equal(a.read('E.progress(state).total'),2);
 assert(a.get('main').innerHTML.includes('✓ 修得済み'));await a.click('',{view:'history'});assert(a.get('main').innerHTML.includes('修得済み'));
 await a.click('',{toggleEarned:id});assert.equal(a.read('state.plans.length'),1);assert.equal(a.read('E.progress(state).total'),0);
});
test('時間割の科目詳細で修得済みを保存・再編集できる',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');const id=a.read('state.plans[0].id');
 await a.click('',{edit:id});await a.change('dStatus','earned');await a.click('saveCourse');assert.equal(a.read('state.history[0].status'),'earned');
 await a.click('',{edit:id});assert.equal(a.get('saveCourse').disabled,false);await a.change('dStatus','current');await a.click('saveCourse');assert.equal(a.read('state.history[0].status'),'current');assert.equal(a.read('state.plans.length'),1);
});
test('2027年度は初期曜限から通常の授業を選択し、実日付を捏造しない',async()=>{
 const a=app();await a.change('planYear','2027');await a.change('planTerm','1Q');await a.click('',{slotDay:'水',slotPeriod:'1'});
 assert(a.get('slotChoices').innerHTML.includes('実社会とデータ分析'));const offer=a.read("E.getOffers(E.byId.get('C050'),2027,state)[0].id");await a.click('',{slotCourse:'C050',slotOffer:offer});await a.click('saveCourse');
 assert.equal(a.read('state.plans[0].year'),2027);assert.equal(a.read('E.evaluate(state.plans[0],state).events.length'),0);assert(a.get('main').innerHTML.includes('実社会とデータ分析'));assert(!a.get('main').innerHTML.includes('仮計画'));
});
test('時間割から外すと履歴と単位も更新し、計画中へ戻す場合は配置を保持',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');const id=a.read('state.plans[0].id');await a.click('',{toggleEarned:id});
 await a.click('',{history:'C055'});await a.click('removeHistory');assert.equal(a.read('state.plans.length'),1);assert.equal(a.read('state.history[0].status'),'current');
 await a.click('',{toggleEarned:id});await a.click('',{delete:id});assert.equal(a.read('state.plans.length'),1);await a.click('acceptConfirm');
 assert.equal(a.read('state.plans.length'),0);assert.equal(a.read('state.history.length'),0);assert.equal(a.read('E.progress(state).total'),0);
});
test('日時入力のエラーを表示し、正しい形式へ修正できる',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.input('dSessions','2026-02-30 09:00 10:30');assert(a.get('dialogResult').innerHTML.includes('正しくありません'));assert.equal(a.get('saveCourse').disabled,true);
 await a.input('dSessions','2026-10-01 09:00 10:30');assert.equal(a.get('saveCourse').disabled,false);await a.click('saveCourse');assert.equal(a.read('state.plans[0].sessions.length'),1);
});
test('計画の書き出しと、確認後のバックアップ読み込み',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');await a.click('exportBtn');const raw=JSON.parse(await a.downloads[0].text());assert.equal(raw.kind,'shunan-course-plan');assert.equal(raw.plans.length,1);
 const b=app();b.get('importFile').files=[{size:1000,text:async()=>JSON.stringify(raw)}];await b.change('importFile','test.json');assert.equal(b.get('confirmDialog').open,true);assert.equal(b.read('state.plans.length'),0);await b.click('acceptConfirm');assert.equal(b.read('state.plans.length'),1);
});
test('表示年次を変えると対応する年度の時間割へ切り替え、前年度の配置は保持する',async()=>{
 const a=app();await a.change('planTerm','1Q');await a.click('',{course:'C050'});await a.click('saveCourse');
 assert.equal(a.read('visiblePlans().length'),1);await a.change('academicYear','2');
 assert.equal(a.read('ui.year'),2027);assert.equal(a.read('visiblePlans().length'),0);assert.equal(a.read('state.plans.length'),1);assert.equal(a.read('state.plans[0].year'),2026);
 await a.change('academicYear','1');assert.equal(a.read('ui.year'),2026);assert.equal(a.read('visiblePlans()[0].courseId'),'C050');
});
test('2年次に1年次配当科目を追加しても、1年次の時間割とは混ざらない',async()=>{
 const a=app();await a.change('planTerm','1Q');await a.click('',{course:'C050'});await a.click('saveCourse');await a.change('academicYear','2');
 await a.click('',{course:'C033'});await a.click('saveCourse');assert.equal(a.read("state.plans.find(p=>p.courseId==='C033').year"),2027);
 assert(!a.read('visiblePlans().some(p=>p.courseId==="C050")'));await a.change('academicYear','1');assert(!a.read('visiblePlans().some(p=>p.courseId==="C033")'));
});
test('年度と表示年次が双方向に連動し、日付も切り替わる',async()=>{
 const a=app();await a.change('planYear','2028');assert(a.get('main').innerHTML.includes('<option value="3" selected>3年次</option>'));assert(a.read('ui.week').startsWith('2028-'));
 await a.change('academicYear','1');assert(a.get('main').innerHTML.includes('<option value="2026" selected>2026年度</option>'));assert(a.read('ui.week').startsWith('2026-'));assert.equal(a.read('state.academicYears[2026]'),undefined);
});
test('追加した科目は時間割・履修履歴で履修中と表示される',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');assert.equal(a.read('state.history[0].status'),'current');assert(a.get('main').innerHTML.includes('履修中'));await a.click('',{view:'history'});assert(a.get('main').innerHTML.includes('履修中'));
});
test('修得済みの除外を切り替え、設定を再起動後も保持する',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');await a.click('',{toggleEarned:a.read('state.plans[0].id')});await a.input('courseSearch','VBA');assert(!a.get('courseList').innerHTML.includes('VBAプログラミング'));
 await a.change('hideEarned','',false);assert(a.get('courseList').innerHTML.includes('VBAプログラミング'));assert(a.get('courseList').innerHTML.includes('修得済み'));const b=app(a.saved);assert.equal(b.read('ui.hideEarned'),false);assert.equal(b.read('E.progress(state).total'),2);
});
test('学期と配当年次を同時に絞り込む',async()=>{
 const a=app();await a.change('catalogTerm','1Q');await a.change('catalogYear','1');assert(a.get('courseList').innerHTML.includes('実社会とデータ分析'));assert(!a.get('courseList').innerHTML.includes('VBAプログラミング'));assert(!a.get('courseList').innerHTML.includes('AI・機械学習基礎'));
 const b=app(a.saved);assert.equal(b.read('ui.filterTerm'),'1Q');assert.equal(b.read('ui.filterYear'),'1');
});
test('新しい科目を追加して時間割へ配置し、バックアップから復元する',async()=>{
 const a=app();await a.change('planYear','2027');await a.change('planTerm','1Q');await a.click('addCatalogCourse');assert.equal(a.get('editorDialog').open,true);
 await a.input('eName','追加データ分析');await a.input('eCredits','3');await a.change('eMinimumYear','2');await a.change('eTerm','1Q');await a.change('eDelivery','対面');await a.input('eMeetings','月1, 木1');await a.click('saveEditor');
 assert.equal(a.get('editorError').textContent,'');assert.equal(a.read('state.customCourses.length'),1);const id=a.read('state.customCourses[0].id');assert(a.get('courseList').innerHTML.includes('追加データ分析'));
 await a.click('',{course:id});assert.equal(a.get('saveCourse').disabled,false);await a.click('saveCourse');assert(a.get('main').innerHTML.includes('追加データ分析'));assert.equal(a.read('state.plans[0].year'),2027);assert.equal(a.read('state.history[0].status'),'current');
 const b=app(a.saved);await b.change('planYear','2027');await b.change('planTerm','1Q');assert(b.get('main').innerHTML.includes('追加データ分析'));assert.equal(b.read(`courseAt('${id}',2027).credits`),3);
 await a.click('exportBtn');const raw=JSON.parse(await a.downloads[0].text()),c=app();c.get('importFile').files=[{size:2000,text:async()=>JSON.stringify(raw)}];await c.change('importFile','custom.json');await c.click('acceptConfirm');assert.equal(c.read('state.customCourses[0].id'),id);
});
test('年度別の編集と削除は過去年度の情報・修得単位を保持する',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');await a.click('',{toggleEarned:a.read('state.plans[0].id')});await a.change('planYear','2027');await a.click('',{editCatalog:'C055'});await a.input('eName','VBA応用');await a.input('eCredits','3');await a.click('saveEditor');
 assert.equal(a.read("courseAt('C055',2026).name"),'VBAプログラミング');assert.equal(a.read("courseAt('C055',2027).name"),'VBA応用');assert.equal(a.read('E.progress(state).total'),2);
 await a.click('',{deleteCatalog:'C055'});await a.click('acceptConfirm');assert(!a.read("E.catalogFor(2027,state).some(c=>c.id==='C055')"));assert(a.read("E.catalogFor(2026,state).some(c=>c.id==='C055')"));assert.equal(a.read('state.history[0].status'),'earned');assert.equal(a.read('E.progress(state).total'),2);
});
test('不正な新規科目は追加せず入力エラーを表示する',async()=>{
 const a=app();await a.click('addCatalogCourse');await a.input('eName','');await a.click('saveEditor');assert(a.get('editorError').textContent.includes('入力'));assert.equal(a.read('state.customCourses.length'),0);assert.equal(a.get('editorDialog').open,true);
});
test('編集後の単位数を修得単位と遠隔単位の両方に反映する',async()=>{
 const a=app();await a.change('planYear','2027');await a.click('',{editCatalog:'C055'});await a.input('eCredits','3');await a.click('saveEditor');await a.click('',{course:'C055'});await a.change('dRemote','yes');await a.change('dStatus','earned');await a.click('saveCourse');assert.equal(a.read('E.progress(state).total'),3);assert.equal(a.read('remoteAmount()'),3);
});
test('科目一覧の登録済み科目は追加不可で、時間割からの編集は可能',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');const id=a.read('state.plans[0].id');await a.input('courseSearch','VBA');
 assert.match(a.get('courseList').innerHTML,/data-course="C055" disabled/);assert(a.get('courseList').innerHTML.includes('登録済み・追加不可'));
 await a.click('',{course:'C055'});assert.equal(a.get('courseDialog').open,false);assert.equal(a.read('state.plans.length'),1);assert(a.get('toast').textContent.includes('登録済み'));
 await a.click('',{edit:id});assert.equal(a.get('courseDialog').open,true);assert.equal(a.get('saveCourse').disabled,false);await a.click('saveCourse');assert.equal(a.read('state.plans.length'),1);
});
test('時限の授業選択でも、他年度に登録済みの科目を重複追加できない',async()=>{
 const a=app();await a.change('planTerm','1Q');await a.click('',{course:'C050'});await a.click('saveCourse');await a.change('planYear','2027');await a.click('',{slotDay:'水',slotPeriod:'1'});
 assert.match(a.get('slotChoices').innerHTML,/data-slot-course="C050"[^>]*disabled/);assert(a.get('slotChoices').innerHTML.includes('登録済み・追加不可'));
 const offer=a.read("E.getOffers(courseAt('C050'),2027,state)[0].id");await a.click('',{slotCourse:'C050',slotOffer:offer});assert.equal(a.get('courseDialog').open,false);assert.equal(a.read('state.plans.length'),1);assert.equal(a.read('state.plans[0].year'),2026);
});
test('科目管理は修得済みの非表示設定にかかわらず編集・削除できる',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');await a.click('',{toggleEarned:a.read('state.plans[0].id')});await a.click('',{view:'manage'});
 assert(a.get('main').innerHTML.includes('科目管理'));await a.input('manageSearch','VBA');assert(a.get('manageRows').innerHTML.includes('VBAプログラミング'));assert.match(a.get('manageRows').innerHTML,/data-edit-catalog="C055"/);assert.match(a.get('manageRows').innerHTML,/data-delete-catalog="C055"/);
 await a.change('manageYear','2027');await a.click('',{editCatalog:'C055'});await a.input('eName','VBA新版');await a.click('saveEditor');assert(a.get('manageRows').innerHTML.includes('VBA新版'));
 await a.click('',{deleteCatalog:'C055'});await a.click('acceptConfirm');assert(!a.get('manageRows').innerHTML.includes('VBA新版'));assert.equal(a.read('E.progress(state).total'),2);
});
test('時間割から科目情報を編集すると登録した年度の曜限を更新する',async()=>{
 const a=app();await a.change('planYear','2027');await a.change('planTerm','1Q');await a.click('',{course:'C050'});await a.click('saveCourse');const id=a.read('state.plans[0].id');
 assert(a.get('main').innerHTML.includes(`data-edit-definition="${id}"`));assert(a.get('main').innerHTML.includes(`data-delete="${id}"`));
 await a.change('planYear','2026');await a.click('',{view:'roadmap'});await a.click('',{editDefinition:id});assert.equal(a.get('editorDialog').open,true);assert.equal(a.get('eYear').value,'2027');
 await a.input('eName','実社会データ演習');await a.input('eMeetings','火1, 金1');await a.click('saveEditor');assert.equal(a.read("courseAt('C050',2026).name"),'実社会とデータ分析');assert.equal(a.read("E.findOffer(state.plans[0],state).meetings.map(m=>m.day+m.period).join(',')"),'火1,金1');
 await a.click('',{view:'plan'});await a.change('planYear','2027');assert(a.get('main').innerHTML.includes('実社会データ演習'));
});
test('科目詳細から時間割を削除でき、キャンセル時は科目を保持する',async()=>{
 const a=app();await a.click('',{course:'C055'});await a.click('saveCourse');const id=a.read('state.plans[0].id');await a.click('',{edit:id});assert(a.get('dialogContent').innerHTML.includes('時間割から削除'));
 await a.click('',{delete:id});assert.equal(a.get('courseDialog').open,false);assert.equal(a.get('confirmDialog').open,true);await a.click('cancelConfirm');assert.equal(a.read('state.plans.length'),1);
 await a.click('',{delete:id});await a.click('acceptConfirm');assert.equal(a.read('state.plans.length'),0);assert.equal(a.read('state.history.length'),0);assert(a.read("E.catalogFor(2026,state).some(c=>c.id==='C055')"));
});
