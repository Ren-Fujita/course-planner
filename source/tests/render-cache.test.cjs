const test = require('node:test');
const assert = require('node:assert/strict');
const { loadRuntime } = require('./helpers/runtime.cjs');
const { createManualHarness: createHarness } = require('./helpers/manual.cjs');

test('同じ描画内では判定を再利用し、登録状態変更後は再計算する', async () => {
  const app = createHarness(loadRuntime());
  await app.click('', { course: 'C055' });
  await app.click('saveCourse');
  app.read(`let evaluations = 0; const originalEvaluation = E.evaluate;
    E.evaluate = (...args) => { evaluations++; return originalEvaluation(...args); };
    renderPlan();`);
  assert.equal(app.read('evaluations'), 1);
  const id = app.read('state.plans[0].id');
  await app.click('', { toggleEarned: id });
  assert.equal(app.read('E.progress(state).total'), 2);
  assert(app.get('main').innerHTML.includes('修得済み'));
});
