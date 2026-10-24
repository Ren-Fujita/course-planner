'use strict';

const DATA = JSON.parse(document.getElementById('courseData').textContent);
// Keep the key and version unchanged for all existing browser data and backups.
const KEY = 'shunan-course-planner-2026-v1';
const persistence = PlannerPersistence.createStore(DATA, {
  getStorage: () => localStorage,
  key: KEY,
  engineFactory: Planner.createEngine,
});

let state = persistence.state;
let E = persistence.engine;
let storageError = persistence.initializationFailed
  ? '保存データを復元できませんでした。読み込み・書き出しを確認してください。'
  : '';

let ui = {
  view: 'plan',
  year: 2026,
  term: '3Q',
  calendar: 'week',
  week: '2026-10-05',
  q: '',
  category: '',
  delivery: '',
  mandatory: false,
  termOnly: false,
  limit: 18,
  historyQ: '',
  historyFilter: '',
  projected: false,
  hideEarned: state.catalogSettings?.hideEarned ?? true,
  filterTerm: state.catalogSettings?.term || '',
  filterYear: state.catalogSettings?.year || '',
};

let dialogModel = null;
let slotModel = null;
let editorModel = null;
let confirmAction = null;
let toastTimer;
const requiredAdditionResults=new Map();

function refreshEngine() {
  E = persistence.refresh(state);
}

function save() {
  const result = persistence.save(state);
  E = result.engine;
  if (result.ok) {
    storageError = '';
    $('saveState').innerHTML = '<i class="dot"></i>端末に保存済み';
  } else {
    storageError = 'ブラウザ内に保存できません。書き出して計画を保管してください。';
    $('saveState').textContent = '保存できません';
    toast(storageError, true);
  }
  updateSide();
}
