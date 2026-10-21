const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createEngine } = require('../src/domain/engine.js');
const { createStore } = require('../src/core/persistence.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/courses.json'), 'utf8'));
const key = 'shunan-course-planner-2026-v1';
const now = () => '2026-10-11T10:00:00.000Z';
const engineFactory = createEngine;

test('従来と同じキー・保存形式で履修履歴と計画を復元する', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const store = createStore(data, { storage, key, now, engineFactory });
  store.state.plans.push({ id: 'saved', courseId: 'C055', year: 2026, term: '3Q', sessions: [], offerId: '' });
  store.engine.setRecordStatus(store.state, store.state.plans[0], 'earned');
  assert.equal(store.save().ok, true);
  const restored = createStore(data, { storage, key, now, engineFactory });
  assert.equal(restored.state.plans.length, 1);
  assert.equal(restored.engine.progress(restored.state).total, 2);
  assert.equal(restored.state.version, 1);
  assert.equal(restored.state.updatedAt, now());
});

test('保存容量エラーでもメモリ上の計画を保持し、書き出し可能にする', () => {
  const storage = { getItem: () => null, setItem: () => { throw Error('quota'); } };
  const store = createStore(data, { storage, key, now, engineFactory });
  store.state.programs = ['DS'];
  const result = store.save();
  assert.equal(result.ok, false);
  assert.deepEqual(JSON.parse(JSON.stringify(result.state)).programs, ['DS']);
});

test('不正な保存内容を復元できなくても元の保存文字列を上書きしない', () => {
  let raw = '{invalid';
  const storage = { getItem: () => raw, setItem: (key, value) => { raw = value; } };
  const store = createStore(data, { storage, key, now, engineFactory });
  assert.equal(store.initializationFailed, true);
  assert.equal(store.state.plans.length, 0);
  assert.equal(raw, '{invalid');
});

test('ブラウザの保存領域そのものへアクセスできなくても起動を続けられる', () => {
  const store = createStore(data, { getStorage: () => { throw Error('security'); }, key, now, engineFactory });
  assert.equal(store.initializationFailed, true);
  assert.equal(store.save().ok, false);
  assert.equal(store.state.cohort, 2026);
});
