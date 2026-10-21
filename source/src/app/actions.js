// app/actions.js

function switchPlanningYear(year){ui.year=year;const month=PLANNING_MONTHS[ui.term];ui.week=`${year}-${month}-01`;renderPlan();}

function saveCourse(){
 try{dialogModel.sessions=parseSessions($('dSessions')?.value||'',dialogModel.year);const r=dialogEvaluation();if(r.errors.length){renderDialogResult();return;}const rec=JSON.parse(JSON.stringify(dialogModel)),status=rec.status;delete rec.mode;delete rec.status;
 putTimelineRecord(rec,status);save();$('courseDialog').close();render();toast(status==='earned'?'修得済みに設定し、卒業単位を更新しました。':'時間割と履修履歴を更新しました。');}catch(e){toast(e.message,true);}
}

function saveCatalogSettings(){state.catalogSettings={hideEarned:ui.hideEarned,term:ui.filterTerm,year:ui.filterYear};save();renderCatalog();}

function deleteCatalogCourse(id){const c=courseAt(id,ui.year),year=ui.year;confirm('科目を一覧から削除',`<p>${esc(c.name)}を${year}年度以降の科目一覧から外します。</p><p style="margin-top:10px">過去年度の時間割・修得履歴は保持します。配置済みの科目は時間割に残し、再登録の対象から外します。</p>`,()=>{E.deleteCourse(state,id,year);save();render();toast('選択年度以降の科目一覧から削除しました。');});}

function openTimetableEditor(id){const p=state.plans.find(p=>p.id===id);if(!p)return;$('courseDialog').close();openEditor(p.courseId,p.year,p.offerId);}

function removeFromTimetable(id){
 const p=state.plans.find(p=>p.id===id);if(!p)return;const name=courseAt(p.courseId,p.year).name;
 $('courseDialog').close();confirm('時間割から削除',`<p>${esc(name)}を${p.year}年度 ${esc(p.term)}の時間割から削除します。</p><p style="margin-top:10px">この科目の全曜限と履修履歴を外し、単位の集計にも反映します。科目一覧には残ります。</p>`,()=>{removeTimelineRecord(p);save();render();toast('科目を時間割から削除しました。');});
}
