const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadRuntime } = require('./helpers/runtime.cjs');
const { captureScenarios } = require('./helpers/scenarios.cjs');

test('手動モードの22通りの既存操作・表示を保持する（新設欄と自動追加設定を除く）', async () => {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/ui-before.json'), 'utf8'));
  const after = await captureScenarios(loadRuntime());
  for (const name of Object.keys(before)) {
    after[name].main=after[name].main.replace(/<!--planning-addition:start-->[\s\S]*?<!--planning-addition:end-->/g,'');
    delete after[name].state.requiredAutofill;
    assert.deepEqual(after[name], before[name], name);
  }
});
