const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const {createEngine,initial,overlaps}=require('../src/domain/engine.js');
const data=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/courses.json'),'utf8'));
const E=createEngine(data);
const course=n=>E.courses.find(c=>c.name===n);
const make=(name,year=2026,term=null)=>{const c=course(name),o=E.getOffers(c,year,initial())[0];return {id:'p'+c.id,courseId:c.id,year,term:term||o?.term||E.allocTerm(c),offerId:o?.id||'',sessions:[],remote:null};};
test('時間の接触は重複ではなく、同日で重なる部分のみ禁止',()=>{
 const a={date:'2026-10-01',start:'09:00',end:'10:30'};
 assert.equal(overlaps(a,{...a,start:'10:30',end:'12:00'}),false);
 assert.equal(overlaps(a,{...a,start:'10:00',end:'11:00'}),true);
 assert.equal(overlaps(a,{...a,date:'2026-10-02'}),false);
});
test('2026年度の水曜振替を実日付へ展開し、試験日を除外',()=>{
 const s=initial(),p=make('実社会とデータ分析');
 const events=E.evaluate(p,s).events;
 assert(events.some(e=>e.date==='2026-05-08'));
 assert(!events.some(e=>e.date==='2026-06-04'));
 const q=make('教養ゼミ');q.offerId=E.getOffers(course('教養ゼミ'),2026,s)[0].id;
 const es=E.evaluate(q,s).events;
 assert(es.some(e=>e.date==='2026-04-30'));
 assert(!es.some(e=>e.date==='2026-08-05'));
});
test('オンデマンドは時間枠を占有しない',()=>{
 const s=initial(),p=make('VBAプログラミング');const r=E.evaluate(p,s);
 assert.equal(r.events.length,0);assert.equal(r.errors.length,0);
});
test('集中講義は土曜の実日付と複数時限で展開',()=>{
 const s=initial(),p=make('社会調査法');s.academicYears[2026]=3;
 const es=E.evaluate(p,s).events;
 assert.equal(es.length,15);assert.equal(es[0].date,'2026-04-11');
 assert.equal(es[0].start,'09:00');assert.equal(es[4].end,'17:50');
 const b=make('生体情報分析'),be=E.evaluate(b,s).events;
 assert.equal(be.filter(x=>x.date==='2026-04-15').length,1);
 assert.equal(be.find(x=>x.date==='2026-04-15').start,'10:40');
});
test('実日付の重複は禁止、異なる開催日は許容',()=>{
 const s=initial(),a=make('情報リテラシー'),b=make('Python入門');
 a.sessions=[{date:'2026-05-01',start:'09:00',end:'10:30'}];
 b.sessions=[{date:'2026-05-01',start:'10:00',end:'11:00'}];s.plans=[a];
 assert(E.evaluate(b,s).errors.some(e=>e.includes('重複')));
 b.sessions[0].date='2026-05-02';assert(!E.evaluate(b,s).errors.some(e=>e.includes('重複')));
});
test('登録済み・修得済み・上位年次の確定違反は禁止',()=>{
 const s=initial(),p=make('VBAプログラミング');s.plans=[{...p,id:'different'}];
 assert(E.evaluate(p,s).errors.some(e=>e.includes('すでに計画')));
 s.plans=[];s.history=[{...p,status:'earned'}];
 assert(E.evaluate(p,s).errors.some(e=>e.includes('修得済み')));
 assert(E.evaluate(make('AI・機械学習基礎'),initial()).errors.some(e=>e.includes('年次')));
});
test('半期24・年間48単位を別々に判定',()=>{
 const s=initial();s.academicYears[2027]=4;
 const cs=E.courses.filter(c=>c.credits===2&&!c.name.includes('ゼミ')).slice(0,25);
 s.plans=cs.slice(0,12).map((c,i)=>({...make(c.name,2027,'前期'),id:'n'+i}));
 const p=make(cs[12].name,2027,'前期');assert(E.evaluate(p,s).errors.some(e=>e.includes('標準上限24')));
 s.plans=cs.slice(0,24).map((c,i)=>({...make(c.name,2027,i<12?'前期':'後期'),id:'n'+i}));
 assert(E.evaluate(make(cs[24].name,2027,'後期'),s).errors.some(e=>e.includes('標準上限48')));
});
test('専門ゼミ・卒業研究の必須先修と未来計画の条件付き判定',()=>{
 let s=initial(),p=make('専門ゼミ1',2028,'前期');
 assert(E.evaluate(p,s).errors.some(e=>e.includes('学科基礎')));
 const required=E.courses.filter(c=>(c.category==='学科基礎科目'&&c.required_for_all)||c.required_in_programs.includes('DS'));
 s.history=required.map(c=>({...make(c.name,2027,'前期'),status:'earned'}));
 assert.equal(E.evaluate(p,s).errors.length,0);
 assert(E.evaluate(make('専門ゼミ2',2028,'後期'),s).errors.some(e=>e.includes('専門ゼミ1')));
 s.plans=[p];const r=E.evaluate(make('専門ゼミ2',2028,'後期'),s);
 assert.equal(r.errors.length,0);assert(r.notes.some(e=>e.includes('条件付き')));
 assert(E.evaluate(make('卒業研究',2029,'通年'),s).errors.some(e=>e.includes('専門ゼミ2')));
});
test('未来年度は通常計画として初期設定を持ち、実日付を繰り返さない',()=>{
 const p=make('VBAプログラミング',2027,'3Q'),r=E.evaluate(p,initial());
 assert.equal(r.events.length,0);assert(E.findOffer(p,initial()));assert.equal(r.errors.length,0);
});
test('金3・金4選択は片方の時間枠のみ',()=>{
 const s=initial();s.academicYears[2026]=2;const p=make('キャリア形成活動Ⅱ');p.chosenPeriod=4;
 const events=E.evaluate(p,s).events;
 assert(events.length>0);assert(events.every(e=>e.period===4));
});
test('総単位は同一科目・プログラム間で二重計上しない',()=>{
 const s=initial(),p=make('パターン認識',2027);s.history=[{...p,status:'earned'}];s.plans=[p];
 const r=E.progress(s,true);assert.equal(r.total,2);assert.equal(r.programs.find(x=>x.id==='DS').credits,2);assert.equal(r.programs.find(x=>x.id==='IE').credits,2);
});
test('卒業条件は総単位だけで達成にしない、単位数相違は幅で保持',()=>{
 const s=initial();s.history=E.courses.filter(c=>!c.required_for_all).map(c=>({...make(c.name,2029),status:'earned'}));
 const r=E.progress(s);assert(r.total>124);assert.equal(r.complete,false);
 const w=initial();w.history=[{...make('ビジネス英作文',2027),status:'earned'}];const p=E.progress(w);assert.equal(p.total,1);assert.equal(p.totalMax,2);
});
test('推奨のJavaだけを理由に禁止しない',()=>{
 const s=initial();const p=make('オブジェクト指向プログラミング',2028,'2Q');const r=E.evaluate(p,s);
 assert.equal(r.errors.length,0);assert(r.notes.some(x=>x.includes('推奨')));
});
test('バックアップの検証・復元、他年度・不正日時を拒否',()=>{
 const s=initial();s.plans=[make('VBAプログラミング')];s.programs=['DS','IE'];
 assert.deepEqual(E.validateState(JSON.parse(JSON.stringify(s))),s);
 assert.throws(()=>E.validateState({...s,cohort:2025}));
 const invalid=JSON.parse(JSON.stringify(s));invalid.plans[0].sessions=[{date:'2026-02-30',start:'09:00',end:'10:00'}];
 assert.throws(()=>E.validateState(invalid));
});
test('将来年度の開講情報を取り込み、実日付の判定へ切り替え',()=>{
 const s=initial(),p=make('VBAプログラミング',2027,'3Q');
 const pack={kind:'shunan-schedule',version:1,academicYear:2027,source:{title:'テスト資料'},calendar:[],offerings:[{id:'new1',courseId:p.courseId,term:'3Q',label:'VBA',delivery:'対面',minimumYear:1,credits:2,prerequisites:[],meetings:[],sessions:[{date:'2027-10-01',start:'09:00',end:'10:30'}]}]};
 E.validatePack(pack);s.packs=[pack];p.offerId='new1';assert.equal(E.evaluate(p,s).events.length,1);
 assert.throws(()=>E.validatePack({...pack,academicYear:2026}));
});
test('確認済み遠隔単位は60単位で禁止し、対象未確認は保留',()=>{
 const s=initial(),cs=E.courses.filter(c=>c.credits===2).slice(0,31);
 s.history=cs.slice(0,30).map(c=>({...make(c.name,2026),status:'earned',remote:true}));
 const p=make(cs[30].name,2030);p.remote=true;
 assert(E.evaluate(p,s).errors.some(x=>x.includes('遠隔対象科目')));
 const unknown=make('VBAプログラミング',2027);assert(E.evaluate(unknown,initial()).pending.some(x=>x.includes('遠隔授業')));
});
test('履修中の同期授業とも実日付の重複を判定',()=>{
 const s=initial(),p=make('VBAプログラミング'),h=make('Python入門');
 p.sessions=[{date:'2026-10-01',start:'09:00',end:'10:30'}];
 s.history=[{...h,status:'current',sessions:p.sessions}];
 assert(E.evaluate(p,s).errors.some(x=>x.includes('履修中')));
});
test('配当年次は下限とし、同じ年次とそれ以降に履修できる',()=>{
 for(const min of [1,2,3,4]){
  const c=E.courses.find(c=>E.minimumYear(c)===min&&!['専門ゼミ1','専門ゼミ2','卒業研究'].includes(c.name));
  for(const year of [1,2,3,4]){const s=initial();s.academicYears[2026]=year;const p=make(c.name);const errs=E.evaluate(p,s).errors.filter(x=>x.includes('年次'));assert.equal(errs.length>0,year<min,`${c.name}: ${year}年次`);}
 }
});
test('登録年度と配当年次が異なっても、より上の年次から下位科目を選べる',()=>{
 const s=initial();s.academicYears[2026]=4;
 for(const name of ['VBAプログラミング','AI・機械学習基礎','社会調査法'])assert(!E.evaluate(make(name),s).errors.some(x=>x.includes('年次')));
});
test('旧版の履歴だけの科目を時間割へ復元して単位を保持',()=>{
 const s=initial();s.history=[{...make('VBAプログラミング'),status:'earned'}];const migrated=E.validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(migrated.plans.length,1);assert.equal(migrated.history[0].id,migrated.plans[0].id);assert.equal(E.progress(migrated).total,2);
 assert(!E.evaluate(migrated.plans[0],migrated).errors.some(x=>x.includes('すでに修得')));
});
test('未修得にした時間割の科目は、先修条件と卒業見込みに含めない',()=>{
 const s=initial(),p=make('専門ゼミ1',2028,'前期');s.plans=[p];E.setRecordStatus(s,p,'failed');
 assert.equal(E.progress(s,true).total,0);assert(E.evaluate(make('専門ゼミ2',2028,'後期'),s).errors.some(x=>x.includes('専門ゼミ1')));
});
test('年度別に変更した単位を使って半期CAPを判定する',()=>{
 const s=initial();s.academicYears[2027]=4;const c=course('VBAプログラミング');
 E.upsertCourse(s,{...c,credits:5,userEdited:true},2027,{term:'3Q',delivery:'オンデマンド',meetings:[],sessions:[],prerequisites:[]});
 const cs=E.courses.filter(x=>x.id!==c.id&&x.credits===2&&!x.name.includes('ゼミ')).slice(0,11);s.plans=cs.map((c,i)=>({...make(c.name,2027,'3Q'),id:'cap-'+i}));
 const r=E.evaluate(make(c.name,2027,'3Q'),s);assert.equal(r.cap.semester,27);assert(r.errors.some(x=>x.includes('標準上限24')));assert.equal(E.courseFor(c.id,2026,s).credits,2);
});
test('追加科目を含むバックアップの検証で不正な曜限を拒否する',()=>{
 const s=initial(),c={...course('VBAプログラミング'),id:'U-example',name:'追加授業',fromYear:2027};
 E.upsertCourse(s,c,2027,{term:'3Q',delivery:'対面',meetings:[{day:'月',period:1}],sessions:[],prerequisites:[]});
 assert.equal(E.validateState(JSON.parse(JSON.stringify(s))).customCourses.length,1);
 const bad=JSON.parse(JSON.stringify(s));bad.courseVersions[0].offer.meetings[0].period=8;assert.throws(()=>E.validateState(bad));
});
test('2027年度以降も2026年度の全通常授業と同じ曜日・時限を保持',()=>{
 const s=initial();
 for(const source of E.offers.filter(o=>o.meetings.length))for(const year of [2027,2028,2029,2030]){
  const current=E.getOffers(E.byId.get(source.courseId),year,s).find(o=>o.id===source.id);assert(current);
  assert.deepEqual(current.meetings.map(m=>[m.day,m.period]),source.meetings.map(m=>[m.day,m.period]));assert.equal(current.term,source.term);
 }
});
test('旧版の2027年度のクラス未設定記録も2026年度と同じ曜限へ対応',()=>{
 const s=initial(),p=make('実社会とデータ分析',2027,'1Q');p.offerId='';s.plans=[p];
 assert.deepEqual(E.findOffer(p,s).meetings.map(m=>[m.day,m.period]),[['水',1],['水',2]]);assert.equal(E.evaluate(p,s).events.length,0);
 p.sessions=[{date:'2027-05-01',start:'09:00',end:'10:30'}];assert.equal(E.findOffer(p,s),null);assert.equal(E.evaluate(p,s).events[0].date,'2027-05-01');
});
