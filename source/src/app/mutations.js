// All enrollment writes go through the same rule-engine operation.
function updateEnrollmentStatus(plan, status) {
  E.setRecordStatus(state, plan, status);
}

function putTimelineRecord(record, status) {
  state.plans = state.plans.filter(plan => plan.id !== record.id).concat(record);
  updateEnrollmentStatus(record, status);
}

function removeTimelineRecord(plan) {
  const key=plan.year+':'+plan.courseId;
  if(E.isRequired(courseAt(plan.courseId,plan.year),state)&&!state.requiredAutofill.skipped.includes(key))state.requiredAutofill.skipped.push(key);
  state.plans = state.plans.filter(record => record.id !== plan.id);
  state.history = state.history.filter(record => record.courseId !== plan.courseId);
}

function setRequiredAutofill(enabled){state.requiredAutofill.enabled=enabled;save();render();}

function restoreRequiredCourses(){state.requiredAutofill.skipped=state.requiredAutofill.skipped.filter(key=>!key.startsWith(ui.year+':'));state.requiredAutofill.enabled=true;save();render();toast('この年度で削除した必修科目を自動追加の対象に戻しました。');}

function toggleEarnedStatus(id) {
  const plan = planById(id);
  if (!plan) return;
  updateEnrollmentStatus(plan, E.recordStatus(plan, state) === 'earned' ? 'current' : 'earned');
  save();
  render();
  toast(E.recordStatus(plan, state) === 'earned' ? '修得済みに設定しました。' : '履修中に戻しました。');
}

function resetEnrollmentStatus() {
  const plan = planById(dialogModel.id);
  updateEnrollmentStatus(plan, 'current');
  save();
  $('courseDialog').close();
  render();
  toast('科目を時間割に残し、履修中に戻しました。');
}

function setProgramGoal(program, checked) {
  state.programs = state.programs.filter(item => item !== program);
  if (checked) state.programs.push(program);
  save();
  render();
}

function setProfileField(field, checked) {
  state[field] = checked;
  if (field === 'thesisPassed' && checked) state.thesisSubmitted = true;
  if (field === 'thesisSubmitted' && !checked) state.thesisPassed = false;
  save();
  render();
}

function setGraduationYear(year) {
  state.graduationYear = year;
  save();
  render();
}

function extendGraduationYear() {
  if (state.graduationYear >= 2040) {
    toast('設定できる年度は2040年度までです。', true);
    return;
  }
  setGraduationYear(state.graduationYear + 1);
}

function setCatalogFilter(field, value, persist = false) {
  ui[field] = value;
  ui.limit = 18;
  if (persist) saveCatalogSettings();
  else renderCatalog();
}

function updateDialogField(field, value) {
  const model = dialogModel;
  try {
    model.sessions = parseSessions($('dSessions')?.value || '', model.year);
  } catch (error) {
    toast(error.message, true);
    return;
  }

  if (field === 'dYear') {
    model.year = Number(value);
    model.sessions = [];
    const offers = E.getOffers(courseAt(model.courseId, model.year), model.year, state);
    const offer = offers.find(item => item.term === model.term) || offers[0];
    model.offerId = offer?.id || '';
    if (offer) model.term = offer.term;
    delete model.requiredClassPending;
  }
  if (field === 'dTerm') {
    model.term = value;
    const offers = E.getOffers(courseAt(model.courseId, model.year), model.year, state);
    model.offerId = offers.find(offer => offer.term === model.term)?.id || '';
    delete model.requiredClassPending;
  }
  if (field === 'dOffer') {
    model.offerId = value;
    if(value)delete model.requiredClassPending;
    const offer = E.findOffer(model, state);
    if (offer) {
      model.term = offer.term;
      model.tentativeMeetings = [];
    }
  }
  if (field === 'dPeriod') model.chosenPeriod = Number(value);
  if (field === 'dRemote') model.remote = value === 'unknown' ? null : value === 'yes';
  if (field === 'dStatus') model.status = value;
  renderDialog();
}

function applySchedulePack(pack) {
  state.packs = state.packs.filter(item => item.academicYear !== pack.academicYear).concat(pack);
  for (const plan of state.plans.filter(item => item.year === pack.academicYear)) {
    const existing = pack.offerings.find(offer => offer.id === plan.offerId && offer.courseId === plan.courseId);
    if (existing) continue;
    const choices = pack.offerings.filter(offer => offer.courseId === plan.courseId && offer.term === plan.term);
    plan.offerId = choices.length === 1 ? choices[0].id : '';
  }
}
