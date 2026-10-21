// ui/management.js

function renderManagement(){
 $('main').innerHTML=header('科目管理','科目名・単位数・学期・曜日時限を編集し、年度ごとの変更を反映する。')+`<div class="notice">${icon('book')}<div>登録済み・修得済みの科目も編集できます。科目一覧からの削除は選択年度以降に適用し、過去年度の履歴を保持します。</div></div><div class="history-toolbar"><label class="field">対象年度<select id="manageYear" class="control">${yearOptions(ui.year)}</select></label><div class="search-wrap" style="align-self:end">${icon('search')}<input id="manageSearch" class="control" value="${esc(ui.manageQ||'')}" placeholder="管理する科目を検索" aria-label="管理する科目を検索"></div><button class="btn" id="addCatalogCourse" style="align-self:end">${icon('plus')}科目を追加</button></div><section class="panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>科目名</th><th>単位</th><th>学期・年次</th><th>操作</th></tr></thead><tbody id="manageRows"></tbody></table></div></section>`+footer();renderManagementRows();
}

function renderManagementRows(){
 const courses=E.catalogFor(ui.year,state).filter(c=>E.normalize(c.name).includes(E.normalize(ui.manageQ||'')));
 $('manageRows').innerHTML=courses.map(c=>{const p=planByCourse(c.id),terms=[...new Set(E.getOffers(c,ui.year,state).map(o=>o.term))];return `<tr><td><strong>${esc(c.name)}</strong><div class="tiny muted">${esc(c.category)}${p?' · 時間割に登録済み':''}</div></td><td>${creditText(c)}</td><td>${esc(terms.join('・')||E.allocTerm(c))}<br><span class="tiny muted">${E.minimumYear(c)}年次以降</span></td><td class="button-cell"><button class="btn secondary small-btn" data-edit-catalog="${c.id}">編集</button> <button class="btn danger small-btn" data-delete-catalog="${c.id}">削除</button></td></tr>`;}).join('')||'<tr><td colspan="4">該当する科目がありません。</td></tr>';
}
