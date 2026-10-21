const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(a,b)=>Math.min(100,Math.max(0,a/b*100));
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const navItems=[['plan','calendar','履修計画'],['roadmap','route','卒業までの計画'],['progress','chart','卒業要件・比較'],['history','check','履修履歴'],['manage','book','科目管理'],['data','book','資料・データ']];
const compatible=(t,selected)=>selected==='通年'||t==='通年'||t===selected||(E.SEM(t)===selected)||(t===E.SEM(selected));
const courseColor=c=>c.category.startsWith('DS')?'ds':c.category.startsWith('IE')?'ie':c.category.startsWith('BA')?'ba':'';
const creditText=c=>c.name==='ビジネス英作文'&&!c.userEdited?'1〜2単位（未確定）':`${c.credits}単位`;
const PLANNING_MONTHS = {"1Q":"04","2Q":"06","前期":"04","3Q":"10","4Q":"12","後期":"10","通年":"04"};

// ui/common.js

function icon(name){const paths={calendar:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',route:'M5 4v14a3 3 0 0 0 3 3h8a3 3 0 0 0 0-6H9m0 0 3-3m-3 3 3 3M5 4h.01',chart:'M4 19V9m8 10V4m8 15v-7M2 22h20',check:'M8 3h10v18H4V3h4m1 0v4h8V3M8 13l2 2 5-5',book:'M3 4h7a2 2 0 0 1 2 2v15a3 3 0 0 0-3-2H3V4zm18 0h-7a2 2 0 0 0-2 2v15a3 3 0 0 1 3-2h6V4z',search:'M21 21l-6-6m2-6a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',info:'M12 10v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',close:'M6 6l12 12M6 18 18 6',download:'M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5',plus:'M12 5v14M5 12h14',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'};return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;}

function toast(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}

function updateSide(){const p=E.progress(state);$('sideCredits').textContent=p.total;$('sideBar').style.width=pct(p.total,124)+'%';$('sideProgram').textContent=state.programs.length?'目標：'+state.programs.join(' / '):'プログラム未選択';}

function renderNav(){for(const [el,mobile]of[['nav',false],['mobileNav',true]])$(el).innerHTML=navItems.map(([id,ic,label])=>`<button data-view="${id}" class="${mobile?'':'nav-btn '}${ui.view===id?'active':''}" ${ui.view===id?'aria-current="page"':''}>${mobile?'':icon(ic)}${label}</button>`).join('');$('crumb').textContent=navItems.find(x=>x[0]===ui.view)[2];updateSide();}

function header(title,text,tag='2026年度入学生'){return `<div class="page-head"><div><h1>${title}</h1><p>${text}</p></div><span class="head-tag">${tag}</span></div>`;}

function footer(){return `<footer class="footer"><span>周南公立大学 情報科学部 · 2026年度入学生のカリキュラム</span><span>資料確認日 2026.10.09 · 大学への正式登録は別途行ってください</span></footer>`;}

function empty(title,text,ic='calendar',long=false){return `<div class="empty ${long?'long-empty':''}"><div class="empty-mark">${icon(ic)}</div><b>${title}</b><div>${text}</div></div>`;}

function statusTag(r){return r.errors.length?'<span class="badge red">要修正</span>':r.pending.length?'<span class="badge amber">判定保留</span>':r.notes.length?'<span class="badge blue">条件付き見込み</span>':'<span class="badge green">確認済み条件OK</span>';}

function yearOptions(selected,minimum=2026){const end=Math.max(2031,ui.year,selected,state.graduationYear,...state.plans.map(p=>p.year));return Array.from({length:end-minimum+1},(_,i)=>minimum+i).map(y=>`<option value="${y}" ${y===selected?'selected':''}>${y}年度</option>`).join('');}

function displayYearOptions(){const end=Math.max(4,ui.year-2025,state.graduationYear-2025,...state.plans.map(p=>p.year-2025));return Array.from({length:end},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===ui.year-2025?'selected':''}>${n<=4?n+'年次':n+'年目（4年次以降）'}</option>`).join('');}

function termOptions(t){return E.TERMS.map(x=>`<option ${x===t?'selected':''}>${x}</option>`).join('');}

function recordTag(p){const s=E.recordStatus(p,state);return s==='earned'?'<span class="badge green">✓ 修得済み</span>':s==='current'?'<span class="badge blue">履修中</span>':s==='failed'?'<span class="badge red">未修得</span>':statusTag(evaluationFor(p));}

function earnedButton(p,compact=false){const earned=E.recordStatus(p,state)==='earned';return `<button class="${compact?'lesson-state-btn':'btn secondary small-btn'}" data-toggle-earned="${esc(p.id)}" aria-label="${esc(courseAt(p.courseId,p.year).name)}を${earned?'履修中に戻す':'修得済みにする'}">${earned?'✓ 修得済み（戻す）':'修得済みにする'}</button>`;}

function planRow(p){const c=courseAt(p.courseId,p.year),r=evaluationFor(p),o=E.findOffer(p,state);return `<div class="plan-row"><span class="status-mark ${E.recordStatus(p,state)==='earned'?'checked':r.status}" aria-hidden="true"></span><div class="plan-title"><button data-edit="${esc(p.id)}">${esc(c.name)}</button><div class="small muted">${esc(p.term)} · ${esc(p.requiredClassPending?'クラス未選択':o?.label||'日時未確定')} · ${creditText(c)}</div></div><div class="record-actions">${recordTag(p)}${earnedButton(p)}<button class="btn secondary small-btn" data-edit-definition="${esc(p.id)}">科目編集</button><button class="btn danger small-btn" data-delete="${esc(p.id)}">削除</button></div></div>`;}

function safeUrl(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?esc(u.href):'#';}catch{return '#';}}

function render(){beginRender();renderNav();({plan:renderPlan,roadmap:renderRoadmap,progress:renderProgress,history:renderHistory,data:renderData,manage:renderManagement}[ui.view])();if(storageError){const el=document.createElement('div');el.className='notice red';el.textContent=storageError;$('main').prepend(el);} }

function confirm(title,html,action){$('confirmTitle').textContent=title;$('confirmMessage').innerHTML=html;confirmAction=action;$('confirmDialog').showModal();}
