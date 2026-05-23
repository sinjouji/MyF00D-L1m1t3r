/* ============================================================
   app.js — 共通ユーティリティ（全ページで読み込む）

   ★ このファイルは Firestore を一切操作しない。
      日付・表示・確認ダイアログのヘルパーのみ。
      Firestore の読み書きは各ページのスクリプトで行う。

   コレクション設計:
     foods         食材辞書（name, favorite, createdAt）
     inventory     現在の在庫 ※ドキュメントID = foodId
                   （foodId, foodName, expiryDate, memo, updatedAt）
     history       登録履歴（foodId, foodName, expiryDate, memo, registeredAt）
     shoppingItems 買い物メモ（name, category, memo, checked, createdAt）
   ============================================================ */


/* ====================================
   日付ユーティリティ
   ==================================== */

/** offset 日後の "YYYY-MM-DD" 文字列を返す（0=今日） */
function getDateStr(offset) {
  var d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  var y  = d.getFullYear();
  var m  = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

/** 今日の "YYYY-MM-DD" を返す */
function getToday() { return getDateStr(0); }

/**
 * 今日から expiryDate までの残り日数（マイナス = 期限切れ）
 * @param {string} expiryDate "YYYY-MM-DD"
 */
function getDaysUntil(expiryDate) {
  if (!expiryDate) return 9999;
  var today = new Date(getToday());
  var exp   = new Date(expiryDate);
  return Math.floor((exp - today) / 86400000);
}

/**
 * 期限ステータスを返す
 * 'expired' | 'today' | 'soon'（3日以内） | 'normal'（4日以上）
 */
function getExpiryStatus(expiryDate) {
  var d = getDaysUntil(expiryDate);
  if (d < 0)   return 'expired';
  if (d === 0) return 'today';
  if (d <= 3)  return 'soon';
  return 'normal';
}

/** 残り日数を人が読みやすい文字列に変換 */
function daysLabel(days) {
  if (days < 0)   return Math.abs(days) + '日超過';
  if (days === 0) return '今日まで';
  if (days === 1) return 'あと1日';
  return 'あと' + days + '日';
}

/** "YYYY-MM-DD" → "YYYY/MM/DD" */
function formatDate(s) {
  if (!s) return '';
  var p = s.split('-');
  return p[0] + '/' + p[1] + '/' + p[2];
}

/**
 * Firestore Timestamp / Date / 数値秒 → "YYYY/MM/DD HH:MM"
 * new Date() で保存した値も Firestore Timestamp も両方対応
 */
function formatDateTime(val) {
  if (!val) return '';
  var d;
  if (typeof val.toDate === 'function') {
    d = val.toDate();                          // Firestore Timestamp
  } else if (val instanceof Date) {
    d = val;                                   // JS Date
  } else if (val.seconds) {
    d = new Date(val.seconds * 1000);          // {seconds, nanoseconds}
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return '';
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) +
         ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}


/* ====================================
   DOM ユーティリティ
   ==================================== */

/** XSS 対策：文字列を HTML エスケープ */
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** トースト通知を表示する */
function showToast(msg, ms) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.classList.remove('show'); }, ms || 2500);
}

/**
 * サジェスト候補を "完全一致 → 前方一致 → 部分一致" の順で並べて返す
 * @param {string} query
 * @param {Array}  list   [{name, ...}] または [{foodName, ...}]
 * @param {string} key    検索対象のプロパティ名（デフォルト 'name'）
 * @param {number} max    最大件数（デフォルト 8）
 */
function suggestSort(query, list, key, max) {
  key = key || 'name';
  max = max || 8;
  var q = query.trim().toLowerCase();
  if (!q) return list.slice(0, max);
  var exact   = list.filter(function(f) { return (f[key] || '').toLowerCase() === q; });
  var prefix  = list.filter(function(f) {
    var n = (f[key] || '').toLowerCase();
    return n.startsWith(q) && n !== q;
  });
  var partial = list.filter(function(f) {
    var n = (f[key] || '').toLowerCase();
    return n.includes(q) && !n.startsWith(q);
  });
  return exact.concat(prefix).concat(partial).slice(0, max);
}


/* ====================================
   確認ダイアログ（Promise 方式）

   使い方:
     initConfirmDialog();          // ページ初期化時に1回呼ぶ
     var ok = await confirmDialog({
       title: '削除しますか？',
       sub:   '取り消せません',
       detail:'<p>食材名: 牛乳</p>',
       okLabel: '削除する'
     });
     if (!ok) return;
     // ここに実際の処理

   ★ HTML に以下の要素が必要:
      #confirmOverlay, #confirmTitle, #confirmSub,
      #confirmDetail, #confirmOk, #confirmCancel
   ==================================== */

var _confirmResolve = null;

function confirmDialog(opts) {
  return new Promise(function(resolve) {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = opts.title   || '';
    document.getElementById('confirmSub').textContent   = opts.sub     || '';
    document.getElementById('confirmDetail').innerHTML  = opts.detail  || '';
    document.getElementById('confirmOk').textContent    = opts.okLabel || '実行する';
    document.getElementById('confirmOverlay').classList.add('show');
  });
}

/** 内部用：ダイアログを閉じて Promise を解決する */
function _closeConfirm(result) {
  document.getElementById('confirmOverlay').classList.remove('show');
  if (_confirmResolve) {
    var fn = _confirmResolve;
    _confirmResolve = null;
    fn(result);
  }
}

/** ページ初期化時に一度だけ呼ぶ（イベントリスナー登録） */
function initConfirmDialog() {
  var overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmOk').addEventListener('click', function() {
    _closeConfirm(true);
  });
  document.getElementById('confirmCancel').addEventListener('click', function() {
    _closeConfirm(false);
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) _closeConfirm(false);
  });
}
