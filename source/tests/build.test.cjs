const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { root } = require('./helpers/runtime.cjs');
const { createManualHarness: createHarness } = require('./helpers/manual.cjs');
const html = fs.readFileSync(path.resolve(root, '../index.html'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(script => !/\bsrc=/.test(script[1]));

test('アプリのデータ・CSS・処理をHTMLに保持し、PWAの依存を同じフォルダに限定する', () => {
  assert.equal(scripts.length, 4);
  const references = [...html.matchAll(/<(?:script|link|img|iframe)\b[^>]*(?:src|href)="([^"]+)"/gi)].map(match => match[1]);
  assert(references.length > 0);
  for (const reference of references) {
    assert(reference.startsWith('./'));
    assert(fs.existsSync(path.resolve(root, '..', reference)));
  }
  assert(!/__DATA__|__APP__|__ENGINE__|__PERSISTENCE__|__STYLES__/.test(html));
  assert.deepEqual(JSON.parse(scripts[0][2]), JSON.parse(fs.readFileSync(path.join(root, 'data/courses.json'), 'utf8')));
});

test('PWAに相対スコープ・通常とマスク対応のアイコンを設定する', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(root, '../manifest.webmanifest'), 'utf8'));
  for (const field of ['id', 'scope', 'start_url']) assert.equal(manifest[field], './');
  assert.equal(manifest.display, 'standalone');
  assert(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  assert(!fs.readFileSync(path.resolve(root, '../sw.js'), 'utf8').includes('__PWA_CACHE_REVISION__'));
});

test('CSSの内容をリファクタリング前から変更しない', () => {
  const styles = html.match(/<style>([\s\S]*?)<\/style>/)[1].trim();
  assert.equal(styles, fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8').trim());
  assert.equal(createHash('sha256').update(styles.replace(/\r\n/g, '\n')).digest('hex'), fs.readFileSync(path.join(__dirname, 'fixtures/css-before.sha256'), 'utf8').trim());
});

test('生成したHTMLの処理で科目を保存でき、アプリ状態をグローバルに公開しない', async () => {
  const app = createHarness({ data: scripts[0][2], engineSource: scripts[1][2], persistenceSource: scripts[2][2], applicationSource: scripts[3][2] });
  assert(app.get('main').innerHTML.includes('時間割'));
  assert.equal(app.read('typeof state'), 'undefined');
  await app.click('', { course: 'C055' });
  await app.click('saveCourse');
  const saved = JSON.parse(app.saved.get('shunan-course-planner-2026-v1'));
  assert.equal(saved.plans.length, 1);
  assert.equal(saved.history[0].status, 'current');
});
