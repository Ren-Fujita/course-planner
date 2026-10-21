(function () {
  'use strict';
  const get = id => document.getElementById(id);
  const dialog = get('pwaDialog');
  const status = get('pwaStatus');
  const updateMessage = get('pwaUpdateMessage');
  let registration = null;
  let installPrompt = null;
  let waitingWorker = null;
  let offlineReady = false;
  let restarting = false;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function setStatus(text, error) {
    status.textContent = text;
    status.dataset.state = error ? 'error' : 'ready';
  }
  function connection() {
    get('pwaConnection').textContent = navigator.onLine
      ? 'ネットワークに接続しています。計画は端末内に保存されます。'
      : 'オフラインです。公式資料などの外部リンクは接続後に開いてください。';
  }
  function installed() {
    const isInstalled = standalone();
    get('pwaTitle').textContent = isInstalled ? '履修プランのアプリ設定' : '履修プランをアプリに';
    get('pwaInstructions').hidden = isInstalled;
    get('pwaInstall').hidden = isInstalled || !installPrompt;
  }
  function showDialog() {
    installed();
    connection();
    if (!dialog.open) dialog.showModal();
  }
  function updateAvailable(worker) {
    waitingWorker = worker;
    get('pwaUpdate').hidden = false;
    get('pwaUpdateNotice').hidden = false;
    get('pwaMenu').dataset.update = 'true';
    updateMessage.textContent = '新しいバージョンを保存しました。編集中の科目を保存してから、更新して再起動してください。保存済みの計画・履修履歴は引き継ぎます。';
  }
  function watchWorker(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) updateAvailable(registration.waiting || worker);
      if (worker.state === 'redundant') {
        updateMessage.textContent = '更新ファイルを保存できませんでした。接続を確認して、もう一度お試しください。';
        if (!offlineReady) setStatus('オフライン用の保存を完了できませんでした。接続して再読み込みしてください。', true);
      }
    });
  }

  get('pwaMenu').addEventListener('click', showDialog);
  get('pwaShowUpdate').addEventListener('click', showDialog);
  get('pwaClose').addEventListener('click', () => dialog.close());
  window.addEventListener('online', connection);
  window.addEventListener('offline', connection);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installed();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installed();
    get('pwaInstructions').hidden = true;
    get('pwaTitle').textContent = 'アプリをインストールしました';
  });
  get('pwaInstall').addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    get('pwaInstall').hidden = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (_) {
      updateMessage.textContent = 'ブラウザのメニューからインストールしてください。';
    }
  });
  get('pwaCheckUpdate').addEventListener('click', async () => {
    const button = get('pwaCheckUpdate');
    if (!registration || !navigator.onLine) {
      updateMessage.textContent = 'ネットワークに接続してから、更新を確認してください。';
      return;
    }
    button.disabled = true;
    updateMessage.textContent = '更新を確認しています…';
    try {
      await registration.update();
      if (registration.waiting) updateAvailable(registration.waiting);
      else updateMessage.textContent = registration.installing ? '新しいファイルを保存しています…' : '現在は最新のバージョンです。';
    } catch (_) {
      updateMessage.textContent = '更新を確認できませんでした。接続を確認して、もう一度お試しください。';
    } finally {
      button.disabled = false;
    }
  });
  get('pwaUpdate').addEventListener('click', () => {
    if (!waitingWorker || waitingWorker.state !== 'installed' || restarting) return;
    restarting = true;
    get('pwaUpdate').disabled = true;
    updateMessage.textContent = '更新しています…';
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  connection();
  installed();
  if (location.protocol === 'file:') {
    setStatus('PWAとして使うには、フォルダ全体をHTTPSで公開し、そのURLを開いてください。ファイルを直接開いた状態ではインストールできません。', true);
    get('pwaCheckUpdate').disabled = true;
    return;
  }
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    setStatus('この環境ではオフライン起動を設定できません。HTTPSのURLを対応ブラウザで開いてください。', true);
    get('pwaCheckUpdate').disabled = true;
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (restarting) location.reload();
    else if (waitingWorker && waitingWorker.state === 'activated') {
      waitingWorker = null;
      get('pwaUpdate').hidden = true;
      get('pwaUpdateNotice').hidden = true;
      delete get('pwaMenu').dataset.update;
      updateMessage.textContent = '別の画面で更新されました。編集中の内容を保存し、再読み込みすると最新版になります。';
    }
  });
  (async () => {
    try {
      registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      if (registration.waiting) updateAvailable(registration.waiting);
      watchWorker(registration.installing);
      registration.addEventListener('updatefound', () => watchWorker(registration.installing));
      await navigator.serviceWorker.ready;
      offlineReady = true;
      setStatus('オフラインの準備ができました。次回から通信なしでも起動できます。', false);
    } catch (_) {
      setStatus('オフライン用の保存に失敗しました。接続を確認して再読み込みしてください。', true);
    }
  })();
})();
