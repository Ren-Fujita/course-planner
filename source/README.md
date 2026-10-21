# 履修登録シミュレーター PWA 1.1.0のソース

2026年10月11日の整理版を元に、2026年10月20日にPWA対応、10月21日にオンデマンド欄と必修自動追加を実装しました。利用・公開・ビルドの手順は1つ上のREADME.mdに記載しています。

build.pyが生成元です。標準実行の python build.py は1つ上のフォルダへindex.htmlとPWAの資材を生成します。python build.py --pwa-dir 配信先 で出力先を変更できます。python build.py --output 単独HTML.html は従来の外部資材不要のHTMLを生成します。

|場所|役割|
|---|---|
|src/domain/engine.js|履修制限、重複、卒業要件、入力検証|
|src/core/persistence.js|端末保存・復元|
|src/app/・src/ui/|従来の状態管理、操作、各画面|
|src/ui/planning-additions.js・src/planning.css|オンデマンド欄と授業選択、必修自動追加の操作・案内|
|src/styles.css・src/shell.html|従来の表示とページ枠|
|src/pwa/|マニフェスト、キャッシュ、インストール案内、更新、アイコン|
|data/courses.json|元資料の抽出データ|
|tests/|履修判定・操作・保存互換性・生成物の確認|

科目データ・保存キー・JSON形式を保持しています。必修自動追加の設定と、手動で外した必修の情報を保存データに追加します。PWAキャッシュの識別子は配信ファイルの内容から生成します。

付属テストはNode.jsの標準テスト機能を使用します。従来の手動操作のテストは明示的に自動追加をオフにして確認し、新機能はplanning-additions.test.cjsで確認します。固定した22シナリオの比較は、新設欄と自動追加設定を除いた既存表示・操作・状態を対象としています。tests/fixtures/は書き換えていません。実ブラウザでの確認範囲は1つ上の検証結果.mdに記載しています。
