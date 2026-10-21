async function importPlan(input) {
  try {
    const candidate = E.validateState(await readFile(input.files[0]));
    confirm('計画ファイルを読み込む', `<p>計画 ${candidate.plans.length}科目、履歴 ${candidate.history.length}科目、開講情報 ${candidate.packs.length}年度分を読み込みます。</p><p style="margin-top:10px">現在の端末内データを置き換えます。必要なら先に書き出してください。</p>`, () => {
      state = candidate;
      save();
      render();
      toast('計画を読み込み、再判定しました。');
    });
  } catch (error) {
    toast('読み込めません：' + error.message, true);
  } finally {
    input.value = '';
  }
}

async function importSchedule(input) {
  try {
    const pack = E.validatePack(await readFile(input.files[0]));
    confirm('開講情報を取り込む', `<p>${pack.academicYear}年度・${pack.offerings.length}クラスを取り込みます。</p><p>資料：${esc(pack.source.title)}</p><p style="margin-top:10px">同じ年度の取込情報を置き換え、計画を再判定します。科目とクラスの対応が不明な計画は保留になります。</p>`, () => {
      applySchedulePack(pack);
      save();
      render();
      toast('開講情報を取り込み、履修計画を再判定しました。');
    });
  } catch (error) {
    toast('取り込めません：' + error.message, true);
  } finally {
    input.value = '';
  }
}
