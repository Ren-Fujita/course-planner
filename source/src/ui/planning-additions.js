// Additions are delimited so the unchanged legacy UI can still be regression checked.
function planningAddition(html){return '<!--planning-addition:start-->'+html+'<!--planning-addition:end-->';}

function onDemandSection(){
 const records=onDemandPlans();
 return planningAddition(`<section class="on-demand-section" id="onDemandSection" aria-labelledby="onDemandTitle"><div class="row-split"><div><h3 id="onDemandTitle">オンデマンド</h3><p class="tiny muted">固定の曜日・時限なし · ${records.length}科目</p></div><button class="btn secondary small-btn" id="addOnDemand">＋ 授業を選ぶ</button></div>${records.length?`<div class="on-demand-list">${records.map(p=>{const c=courseAt(p.courseId,p.year),r=evaluationFor(p),status=E.recordStatus(p,state);return `<div class="lesson-wrap ${status==='earned'?'earned':''}"><button class="lesson ${courseColor(c)} ${r.errors.length&&status!=='earned'?'invalid':''}" data-edit="${esc(p.id)}"><b>${esc(c.name)}</b><span>${esc(p.term)} · ${creditText(c)}${E.isRequired(c,state)?' · 必修':''}</span><span>${status==='earned'?'✓ 修得済み':status==='failed'?'未修得':'履修中'}</span></button>${earnedButton(p,true)}<div class="lesson-actions"><button data-edit-definition="${esc(p.id)}">科目編集</button><button data-delete="${esc(p.id)}">削除</button></div></div>`;}).join('')}</div>`:'<p class="small muted on-demand-empty">「授業を選ぶ」から、この学期のオンデマンド授業を追加できます。</p>'}</section>`);
}

function openOnDemandSlot(){
 slotModel={kind:'onDemand',q:''};
 $('slotContent').innerHTML=`<div class="dialog-header"><div><div class="eyebrow">ON-DEMAND COURSES</div><h2 id="slotTitle">オンデマンド授業を選ぶ</h2><p class="small muted">${ui.year}年度 ${esc(ui.term)} · ${academicYearFor()}年次で履修できる科目</p></div><button class="delete-btn" id="closeSlot" aria-label="授業選択を閉じる">${icon('close')}</button></div><div class="dialog-body"><div class="search-wrap">${icon('search')}<input id="slotSearch" class="control" placeholder="科目名を検索" aria-label="オンデマンド科目を検索"></div><p class="info-line">曜日・時限の枠を使わない授業を選べます。登録後は下のオンデマンド欄から編集できます。</p><div class="row-split" style="margin:14px 0"><h3>選択できる授業</h3><span class="small muted" id="slotCount"></span></div><div id="slotChoices"></div></div>`;
 renderSlotChoices();$('slotDialog').showModal();
}

function requiredControls(){
 const skipped=state.requiredAutofill.skipped.some(key=>key.startsWith(ui.year+':'));
 return planningAddition(`<div class="required-controls"><label class="check-label"><input id="autoRequiredEnabled" type="checkbox" ${state.requiredAutofill.enabled?'checked':''}>必修を自動追加</label><span class="tiny muted">全員必修・目標プログラムの必修を配当年次に合わせて配置します。</span>${skipped?'<button class="link-btn" id="restoreRequiredCourses">削除した必修を戻す</button>':''}</div>`);
}

function requiredNotice(result){
 const blocked=result.blocked.filter(item=>compatible(E.allocTerm(courseAt(item.courseId)),ui.term));
 const pending=visiblePlans().filter(p=>p.requiredClassPending);
 if(!blocked.length&&!pending.length)return '';
 return planningAddition(`<div class="notice amber required-notice"><div>${pending.length?`<p>${pending.length}科目の必修はクラス未選択です。時間割または科目一覧から開き、開講クラスを選んでください。</p>`:''}${blocked.length?`<details><summary>自動追加できない必修が${blocked.length}科目あります</summary>${blocked.map(item=>`<div class="required-issue"><button class="link-btn" data-course="${item.courseId}">${esc(courseAt(item.courseId).name)}</button><button class="link-btn" data-edit-catalog="${item.courseId}">開講情報を編集</button><p>${item.reasons.map(esc).join('<br>')}</p></div>`).join('')}</details>`:''}</div></div>`);
}

function ensureRequiredCourses(){
 if(persistence.initializationFailed&&storageError)return {added:[],blocked:[]};
 const result=E.autofillRequired(state,ui.year);
 if(result.added.length)save();
 return result;
}
