// ui/history.js

function renderHistory(){
 const list=historyCourses();
 $('main').innerHTML=header('履修履歴','時間割に入れた科目の状態を、まとめて確認する。')+`<div class="notice">${icon('check')}<div>時間割に入れた科目だけを表示します。「修得済み」にすると時間割にも状態が反映され、卒業単位に加算されます。</div></div><div class="history-toolbar"><div class="search-wrap">${icon('search')}<input class="control" id="historySearch" value="${esc(ui.historyQ)}" placeholder="時間割に入れた科目を検索" aria-label="履歴の科目名を検索"></div><select id="historyFilter" class="control" style="width:auto" aria-label="履歴の状態で絞り込み">${[['','すべての状態'],['earned','修得済み'],['current','履修中'],['failed','未修得']].map(([v,t])=>`<option value="${v}" ${ui.historyFilter===v?'selected':''}>${t}</option>`).join('')}</select></div><section class="panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>科目</th><th>単位</th><th>履修状態</th><th></th></tr></thead><tbody id="historyRows">${historyRows(list)}</tbody></table></div></section>`+footer();
}

function historyRows(list){return list.map(c=>{const p=planByCourse(c.id),status=E.recordStatus(p,state);return `<tr><td><strong style="font-size:12px;font-weight:600">${esc(c.name)}</strong><br><span class="tiny muted">${esc(c.category)}</span></td><td>${creditText(c)}</td><td><span class="badge ${status==='earned'?'green':status==='current'?'blue':status==='failed'?'red':''}">${{planned:'履修中',earned:'修得済み',current:'履修中',failed:'未修得'}[status]}</span><br><span class="tiny muted">${p.year}年度 ${esc(p.term)}</span></td><td class="button-cell"><button class="btn secondary small-btn" data-history="${c.id}">状態を変更</button></td></tr>`;}).join('')||'<tr><td colspan="4"><div class="empty"><b>時間割に入れた科目がありません</b>時間割の枠、または科目一覧から授業を追加してください。</div></td></tr>';}

function renderHistoryRows(){$('historyRows').innerHTML=historyRows(historyCourses());}
