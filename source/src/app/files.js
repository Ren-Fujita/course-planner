// app/files.js

function download(name,value,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}

function exportPlan(){download(`履修計画_2026入学_${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date())}.json`,state);toast('計画と履修履歴を書き出しました。');}

async function readFile(file){if(!file)return null;if(file.size>5_000_000)throw Error('5MB以下のファイルを選んでください。');return JSON.parse(await file.text());}

function scheduleTemplate(){download('開講情報_ひな形.json',{kind:'shunan-schedule',version:1,academicYear:2027,source:{title:'公式資料名を入力',url:'',checkedOn:''},calendar:[],offerings:[{id:'example-C055',courseId:'C055',label:'VBAプログラミング',term:'3Q',delivery:'オンデマンド',minimumYear:1,credits:2,remote:null,prerequisites:[],meetings:[],sessions:[]}],instructions:'例の科目・日時・先修条件を公式資料で確認して置き換えてください。calendarは{date:"2027-04-12",term:"前期",weekday:"月"}、sessionsは{date:"2027-04-12",start:"09:00",end:"10:30"}。空配列は授業なしの証明ではありません。'});}

function parseSessions(text,year){if(!text.trim())return [];const events=text.trim().split(/\n+/).map(line=>{const parts=line.trim().split(/[\s,]+/);if(parts.length!==3)throw Error('実施日は「2026-10-01 09:00 10:30」の形式で1行ずつ入力してください。');const s={date:parts[0],start:parts[1],end:parts[2]};if(!E.validSession(s))throw Error('日付・時刻が正しくありません。');const y=Number(s.date.slice(0,4)),m=Number(s.date.slice(5,7));if(y!==(m<4?year+1:year))throw Error('実施日が選択した年度に属していません。');return s;});return events;}
