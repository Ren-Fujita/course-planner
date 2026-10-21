const { createManualHarness: createHarness } = require('./manual.cjs');

async function captureScenarios(runtime) {
  const snapshots = {};
  const capture = (name, app) => {
    snapshots[name] = {
      main: app.get('main').innerHTML,
      nav: app.get('nav').innerHTML,
      dialog: app.get('dialogContent').innerHTML,
      editor: app.get('editorContent').innerHTML,
      slot: app.get('slotContent').innerHTML,
      confirmation: app.get('confirmMessage').innerHTML,
      state: JSON.parse(app.read('JSON.stringify(state)')),
      storageError: app.read('storageError'),
      credits: app.get('sideCredits').textContent,
    };
  };

  const app = createHarness(runtime);
  capture('initial', app);
  for (const view of ['roadmap', 'progress', 'history', 'manage', 'data', 'plan']) {
    await app.click('', { view });
    capture('view-' + view, app);
  }
  await app.click('', { course: 'C055' });
  capture('course-dialog', app);
  await app.click('saveCourse');
  capture('enrolled', app);
  const id = app.read('state.plans[0].id');
  await app.click('', { toggleEarned: id });
  capture('earned', app);
  await app.change('hideEarned', '', false);
  await app.change('catalogTerm', '3Q');
  await app.change('catalogYear', '1');
  capture('filtered', app);
  await app.change('planYear', '2027');
  await app.click('', { editCatalog: 'C055' });
  capture('editor', app);
  await app.input('eName', 'VBA新版');
  await app.input('eCredits', '3');
  await app.click('saveEditor');
  capture('edited', app);
  await app.click('', { deleteCatalog: 'C055' });
  capture('delete-confirmation', app);
  await app.click('acceptConfirm');
  capture('catalog-deleted', app);
  await app.click('', { view: 'manage' });
  capture('management-after-delete', app);

  const restored = createHarness(runtime, app.saved);
  await restored.change('planYear', '2027');
  capture('restored', restored);

  const timetable = createHarness(runtime);
  await timetable.change('planTerm', '1Q');
  await timetable.click('', { slotDay: '水', slotPeriod: '1' });
  capture('slot-choices', timetable);
  const offer = timetable.read("E.getOffers(courseAt('C050'),2026,state)[0].id");
  await timetable.click('', { slotCourse: 'C050', slotOffer: offer });
  await timetable.click('saveCourse');
  capture('weekly-enrolled', timetable);
  await timetable.click('', { calendar: 'date' });
  capture('date-calendar', timetable);
  await timetable.click('', { delete: timetable.read('state.plans[0].id') });
  await timetable.click('cancelConfirm');
  capture('delete-cancelled', timetable);

  const badStorage = new Map([['shunan-course-planner-2026-v1', '{invalid']]);
  capture('invalid-storage', createHarness(runtime, badStorage));
  return snapshots;
}

module.exports = { captureScenarios };
