// Ordered routes preserve precedence without one large if/else controller.
function dispatch(routes, target) {
  const route = routes.find(candidate => candidate.matches(target));
  if (route) return route.run(target);
}

const clickRoutes = [
  {matches:target=>target.id==='addOnDemand',run:()=>openOnDemandSlot()},
  {matches:target=>target.id==='addRequiredCourses',run:()=>addRequiredCourses()},
  {
    matches: target => target.id==='addCatalogCourse',
    run: function onAddCatalogCourse(target) {
      openEditor();
    },
  },
  {
    matches: target => target.dataset.editDefinition,
    run: function onEditDefinition(target) {
      openTimetableEditor(target.dataset.editDefinition);
    },
  },
  {
    matches: target => target.dataset.editCatalog,
    run: function onEditCatalog(target) {
      openEditor(target.dataset.editCatalog);
    },
  },
  {
    matches: target => target.dataset.deleteCatalog,
    run: function onDeleteCatalog(target) {
      deleteCatalogCourse(target.dataset.deleteCatalog);
    },
  },
  {
    matches: target => target.id==='closeEditor',
    run: function onCloseEditor(target) {
      $('editorDialog').close();
    },
  },
  {
    matches: target => target.id==='saveEditor',
    run: function onSaveEditor(target) {
      saveEditor();
    },
  },
  {
    matches: target => target.dataset.view,
    run: function onView(target) {
      ui.view=target.dataset.view;render();window.scrollTo(0,0);
    },
  },
  {
    matches: target => target.dataset.calendar,
    run: function onCalendar(target) {
      ui.calendar=target.dataset.calendar;renderPlan();
    },
  },
  {
    matches: target => target.dataset.slotDay,
    run: function onSlotDay(target) {
      openSlot(target.dataset.slotDay,Number(target.dataset.slotPeriod));
    },
  },
  {
    matches: target => target.dataset.slotCourse,
    run: function onSlotCourse(target) {
      const slot={...slotModel,offerId:target.dataset.slotOffer,tentative:!target.dataset.slotOffer};$('slotDialog').close();openCourse(target.dataset.slotCourse,'plan',null,slot);
    },
  },
  {
    matches: target => target.dataset.toggleEarned,
    run: function onToggleEarned(target) {
      toggleEarnedStatus(target.dataset.toggleEarned);
    },
  },
  {
    matches: target => target.id==='closeSlot',
    run: function onCloseSlot(target) {
      $('slotDialog').close();
    },
  },
  {
    matches: target => target.dataset.course,
    run: function onCourse(target) {
      openCourse(target.dataset.course);
    },
  },
  {
    matches: target => target.dataset.edit,
    run: function onEdit(target) {
      const p=state.plans.find(x=>x.id===target.dataset.edit);if(p)openCourse(p.courseId,'plan',p.id);
    },
  },
  {
    matches: target => target.dataset.history,
    run: function onHistory(target) {
      openCourse(target.dataset.history,'history');
    },
  },
  {
    matches: target => target.dataset.delete,
    run: function onDelete(target) {
      removeFromTimetable(target.dataset.delete);
    },
  },
  {
    matches: target => target.dataset.yearOpen,
    run: function onYearOpen(target) {
      ui.year=Number(target.dataset.yearOpen);ui.view='plan';ui.term='前期';ui.week=`${ui.year}-04-06`;render();window.scrollTo(0,0);
    },
  },
  {
    matches: target => target.dataset.progress,
    run: function onProgress(target) {
      ui.projected=target.dataset.progress==='projected';renderProgress();
    },
  },
  {
    matches: target => target.id==='moreCourses',
    run: function onMoreCourses(target) {
      ui.limit+=25;renderCatalog();
    },
  },
  {
    matches: target => target.id==='closeCourse',
    run: function onCloseCourse(target) {
      $('courseDialog').close();
    },
  },
  {
    matches: target => target.id==='saveCourse',
    run: function onSaveCourse(target) {
      saveCourse();
    },
  },
  {
    matches: target => target.id==='removeHistory',
    run: function onRemoveHistory(target) {
      resetEnrollmentStatus();
    },
  },
  {
    matches: target => target.id==='cancelConfirm',
    run: function onCancelConfirm(target) {
      $('confirmDialog').close();confirmAction=null;
    },
  },
  {
    matches: target => target.id==='acceptConfirm',
    run: function onAcceptConfirm(target) {
      const action=confirmAction;confirmAction=null;$('confirmDialog').close();if(action)action();
    },
  },
  {
    matches: target => target.id==='exportBtn'||target.dataset.action==='export',
    run: function onExportBtn(target) {
      exportPlan();
    },
  },
  {
    matches: target => target.id==='importBtn'||target.dataset.action==='import',
    run: function onImportBtn(target) {
      $('importFile').click();
    },
  },
  {
    matches: target => target.id==='loadSchedule',
    run: function onLoadSchedule(target) {
      $('scheduleFile').click();
    },
  },
  {
    matches: target => target.id==='schemaDownload',
    run: function onSchemaDownload(target) {
      scheduleTemplate();
    },
  },
  {
    matches: target => target.id==='extendYears',
    run: function onExtendYears(target) {
      extendGraduationYear();
    },
  },
];

const changeRoutes = [
  {matches:target=>target.id==='showCourseActions',run:target=>setCourseActionsVisibility(target.checked)},
  {
    matches: target => target.id==='manageYear',
    run: async function onManageYear(target) {
      ui.year=Number(target.value);renderManagement();
    },
  },
  {
    matches: target => target.id==='planYear',
    run: async function onPlanYear(target) {
      switchPlanningYear(Number(target.value));
    },
  },
  {
    matches: target => target.id==='planTerm',
    run: async function onPlanTerm(target) {
      ui.term=target.value;const month=PLANNING_MONTHS[ui.term];ui.week=`${ui.year}-${month}-01`;renderPlan();
    },
  },
  {
    matches: target => target.id==='academicYear',
    run: async function onAcademicYear(target) {
      switchPlanningYear(2025+Number(target.value));
    },
  },
  {
    matches: target => target.id==='weekInput',
    run: async function onWeekInput(target) {
      if(target.value){ui.week=target.value;renderPlan();}
    },
  },
  {
    matches: target => target.id==='hideEarned',
    run: async function onHideEarned(target) {
      setCatalogFilter('hideEarned', target.checked, true);
    },
  },
  {
    matches: target => target.id==='catalogTerm',
    run: async function onCatalogTerm(target) {
      setCatalogFilter('filterTerm', target.value, true);
    },
  },
  {
    matches: target => target.id==='catalogYear',
    run: async function onCatalogYear(target) {
      setCatalogFilter('filterYear', target.value, true);
    },
  },
  {
    matches: target => target.id==='categoryFilter',
    run: async function onCategoryFilter(target) {
      setCatalogFilter('category', target.value, false);
    },
  },
  {
    matches: target => target.id==='deliveryFilter',
    run: async function onDeliveryFilter(target) {
      setCatalogFilter('delivery', target.value, false);
    },
  },
  {
    matches: target => target.id==='mandatoryFilter',
    run: async function onMandatoryFilter(target) {
      setCatalogFilter('mandatory', !!target.value, false);
    },
  },
  {
    matches: target => target.id==='termOnly',
    run: async function onTermOnly(target) {
      setCatalogFilter('termOnly', target.checked, false);
    },
  },
  {
    matches: target => target.id==='historyFilter',
    run: async function onHistoryFilter(target) {
      ui.historyFilter=target.value;renderHistoryRows();
    },
  },
  {
    matches: target => target.dataset.program,
    run: async function onProgram(target) {
      setProgramGoal(target.dataset.program, target.checked);
    },
  },
  {
    matches: target => target.dataset.profile,
    run: async function onProfile(target) {
      setProfileField(target.dataset.profile, target.checked);
    },
  },
  {
    matches: target => target.id==='graduationYear',
    run: async function onGraduationYear(target) {
      setGraduationYear(Number(target.value));
    },
  },
  {
    matches: target => ['dYear','dTerm','dOffer','dPeriod','dRemote','dStatus'].includes(target.id),
    run: async function onChange16(target) {
      updateDialogField(target.id, target.value);
    },
  },
  {
    matches: target => target.id==='importFile',
    run: async function onImportFile(target) {
      await importPlan(target);
    },
  },
  {
    matches: target => target.id==='scheduleFile',
    run: async function onScheduleFile(target) {
      await importSchedule(target);
    },
  },
];

const inputRoutes = {
  courseSearch(target) { ui.q = target.value; ui.limit = 18; renderCatalog(); },
  manageSearch(target) { ui.manageQ = target.value; renderManagementRows(); },
  historySearch(target) { ui.historyQ = target.value; renderHistoryRows(); },
  slotSearch(target) { slotModel.q = target.value; renderSlotChoices(); },
  dSessions() { renderDialogResult(); },
};

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) return dispatch(clickRoutes, button);
});

document.addEventListener('input', event => {
  const id = event.target.id;
  if (Object.hasOwn(inputRoutes, id)) return inputRoutes[id](event.target);
});

document.addEventListener('change', async event => dispatch(changeRoutes, event.target));
