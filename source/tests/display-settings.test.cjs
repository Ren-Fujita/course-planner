const test=require('node:test'),assert=require('node:assert/strict');
const {loadRuntime}=require('./helpers/runtime.cjs');
const {createHarness}=require('./helpers/dom.cjs');
const {createEngine}=require('../src/domain/engine.js');
const data=require('../data/courses.json');
const runtime=loadRuntime(),KEY='shunan-course-planner-2026-v1';

test('操作ボタンは初期非表示で、オン・オフの設定を保存・再起動で保持する',async()=>{
 const a=createHarness(runtime);assert.equal(a.read('state.displaySettings.showCourseActions'),false);
 await a.click('addRequiredCourses');const before=a.read('JSON.stringify([state.plans,state.history])');
 await a.change('showCourseActions','',true);assert(a.get('main').innerHTML.includes('workspace show-course-actions'));
 assert.equal(a.read('JSON.stringify([state.plans,state.history])'),before);
 const b=createHarness(runtime,a.saved);assert.equal(b.read('state.displaySettings.showCourseActions'),true);
 await b.change('showCourseActions','',false);
 const c=createHarness(runtime,b.saved);assert.equal(c.read('state.displaySettings.showCourseActions'),false);
 assert.equal(c.read('state.plans.length'),15);
});

test('旧バックアップは非表示で読み込め、設定のJSON保存・検証ができる',()=>{
 const e=createEngine(data),state=e.initial(),old=JSON.parse(JSON.stringify(state));delete old.displaySettings;
 assert.equal(e.validateState(old).displaySettings.showCourseActions,false);
 state.displaySettings.showCourseActions=true;
 assert.equal(e.validateState(JSON.parse(JSON.stringify(state))).displaySettings.showCourseActions,true);
 for(const invalid of [null,{showCourseActions:'yes'},{}])assert.throws(()=>e.validateState({...state,displaySettings:invalid}),/表示設定/);
});

test('保存データの復元失敗時に表示を切り替えても元データを上書きしない',async()=>{
 const saved=new Map([[KEY,'{invalid']]),a=createHarness(runtime,saved);
 await a.change('showCourseActions','',true);
 assert.equal(saved.get(KEY),'{invalid');assert(a.get('main').innerHTML.includes('workspace show-course-actions'));
});
