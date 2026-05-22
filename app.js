/* ============================================================
   app.js  —  共通ヘルパー（全ページで読み込む）
   ============================================================

   Firestoreコレクション構成:
   ┌─ foods      : 食材マスタ（名前・お気に入り）
   ├─ inventory  : 現在の在庫（食材ごとの最新期限・メモ）
   └─ history    : 登録履歴（期限を登録するたびに追記）

   ※ inventory は食材1件につき1レコード（upsert）
   ※ history は登録ごとに追記（削除可能）
   ============================================================ */


/* ====================================
   foods コレクション操作
   ==================================== */

/**
 * 全食材を名前順で取得（一回限り）
 * @returns {Promise<Array>} foods配列 [{id, name, favorite, ...}]
 */
async function getAllFoods() {
  const snap = await db.collection('foods').orderBy('name').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 食材をリアルタイム監視
 * @param {Function} callback      変更があるたびに呼ばれる
 * @param {Function} [onError]     エラー時に呼ばれる（省略可）
 * @returns {Function} unsubscribe関数
 */
function onFoodsSnapshot(callback, onError) {
  return db.collection('foods').orderBy('name').onSnapshot(
    snap => {
      const foods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(foods);
    },
    err => {
      console.error('[Firestore] foods監視エラー:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 食材を追加
 * @param {string}  name
 * @param {boolean} favorite
 * @returns {Promise<DocumentReference>}
 */
async function addFood(name, favorite = false) {
  return await db.collection('foods').add({
    name,
    favorite,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * 食材を更新
 * @param {string} id
 * @param {Object} data  {name?, favorite?}
 */
async function updateFood(id, data) {
  return await db.collection('foods').doc(id).update(data);
}

/**
 * 食材を削除（在庫・履歴のレコードは残す）
 * @param {string} id
 */
async function deleteFood(id) {
  return await db.collection('foods').doc(id).delete();
}

/**
 * 食材名でサジェスト検索（完全一致 → 前方一致 → 部分一致の順）
 * @param {string} query
 * @param {Array}  allFoods  事前取得済みリスト（省略時は内部で取得）
 * @returns {Promise<Array>}
 */
async function searchFoodsByName(query, allFoods = null) {
  const list = allFoods || await getAllFoods();
  const q = query.trim().toLowerCase();
  if (!q) return list;

  const exact   = list.filter(f => f.name.toLowerCase() === q);
  const prefix  = list.filter(f => f.name.toLowerCase().startsWith(q) && f.name.toLowerCase() !== q);
  const partial = list.filter(f =>
    f.name.toLowerCase().includes(q) &&
    !f.name.toLowerCase().startsWith(q)
  );
  return [...exact, ...prefix, ...partial];
}


/* ====================================
   inventory コレクション操作
   ==================================== */

/**
 * 在庫をリアルタイム監視（期限日順）
 * @param {Function} callback
 * @param {Function} [onError]
 * @returns {Function} unsubscribe関数
 */
function onInventorySnapshot(callback, onError) {
  return db.collection('inventory').orderBy('expiryDate').onSnapshot(
    snap => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    },
    err => {
      console.error('[Firestore] inventory監視エラー:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * foodIdに対応する在庫レコードを取得
 * @param {string} foodId
 * @returns {Promise<Object|null>}
 */
async function getInventoryByFoodId(foodId) {
  const snap = await db.collection('inventory')
    .where('foodId', '==', foodId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * 在庫を登録・更新（upsert）し、同時に履歴を追加
 *
 * ★ foodId をそのままドキュメントIDに使うことで、
 *    既存レコードの検索クエリが不要になり確実に動作する。
 *    set() は存在すれば上書き、なければ新規作成。
 *
 * @param {string}  foodId
 * @param {string}  foodName
 * @param {string}  expiryDate  "YYYY-MM-DD"
 * @param {string}  memo
 * @param {boolean} favorite
 */
async function registerInventory(foodId, foodName, expiryDate, memo = '', favorite = false) {
  console.log('[registerInventory] 開始', { foodId, foodName, expiryDate });

  const inventoryData = {
    foodId,
    foodName,
    expiryDate,
    memo,
    favorite,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // foodId をドキュメントIDとして set()：食材1件につき在庫1件を保証
  await db.collection('inventory').doc(foodId).set(inventoryData);
  console.log('[registerInventory] inventory 書き込み完了');

  // 履歴に追加（登録のたびに新規レコード）
  await addHistory(foodId, foodName, expiryDate, memo, favorite);
  console.log('[registerInventory] history 書き込み完了');
}

/**
 * 在庫を削除
 * @param {string} id  在庫のドキュメントID（= foodId）
 */
async function deleteInventoryItem(id) {
  return await db.collection('inventory').doc(id).delete();
}


/* ====================================
   history コレクション操作
   ==================================== */

/**
 * 履歴を追加
 * @param {string}  foodId
 * @param {string}  foodName
 * @param {string}  expiryDate
 * @param {string}  memo
 * @param {boolean} favorite
 */
async function addHistory(foodId, foodName, expiryDate, memo = '', favorite = false) {
  return await db.collection('history').add({
    foodId,
    foodName,
    expiryDate,
    memo,
    favorite,
    registeredAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * 履歴をリアルタイム監視（新しい順）
 * @param {Function} callback
 * @param {Function} [onError]
 * @returns {Function} unsubscribe関数
 */
function onHistorySnapshot(callback, onError) {
  return db.collection('history')
    .orderBy('registeredAt', 'desc')
    .onSnapshot(
      snap => {
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
      },
      err => {
        console.error('[Firestore] history監視エラー:', err);
        if (onError) onError(err);
      }
    );
}

/**
 * 履歴を削除
 * @param {string} id
 */
async function deleteHistoryItem(id) {
  return await db.collection('history').doc(id).delete();
}


/* ====================================
   ユーティリティ関数
   ==================================== */

/**
 * 今日からのオフセット日数でYYYY-MM-DD文字列を返す
 * @param {number} offset  0=今日, 1=明日, -1=昨日
 */
function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 今日の日付文字列（YYYY-MM-DD）を返す */
function getToday() { return getDateStr(0); }

/**
 * 期限日までの残り日数を返す（マイナスは期限切れ）
 * @param {string} expiryDate  "YYYY-MM-DD"
 */
function getDaysUntil(expiryDate) {
  const today  = new Date(getToday());
  const expiry = new Date(expiryDate);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

/**
 * 期限ステータスを返す
 * @param {string} expiryDate
 * @returns {'expired'|'today'|'soon'|'ok'}
 */
function getExpiryStatus(expiryDate) {
  const days = getDaysUntil(expiryDate);
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'ok';
}

/**
 * 残り日数を人間が読みやすいラベルに変換
 * @param {number} days
 */
function daysLabel(days) {
  if (days < 0)  return `${Math.abs(days)}日超過`;
  if (days === 0) return '今日まで';
  if (days === 1) return 'あと1日';
  return `あと${days}日`;
}

/**
 * "YYYY-MM-DD" → "YYYY/MM/DD" に整形
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

/**
 * Firestore Timestamp または Date → "YYYY/MM/DD HH:MM" に整形
 */
function formatDateTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const y   = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h   = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day} ${h}:${min}`;
}

/**
 * トーストを表示する
 * @param {string} msg
 * @param {number} duration  表示時間(ms)
 */
function showToast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

/**
 * サジェスト入力のセットアップ（共通）
 * @param {Object} opts
 * @param {HTMLInputElement}  opts.input        入力欄
 * @param {HTMLElement}       opts.listEl       サジェストリストDOM
 * @param {Function}          opts.getFoods     () => Promise<Array> | Array
 * @param {Function}          opts.onSelect     (food) => void
 * @param {number}            [opts.maxShow=8]  最大表示件数
 * @param {boolean}           [opts.fromInventory=false] trueなら在庫のfoodNameで検索
 */
function setupSuggest({ input, listEl, getFoods, onSelect, maxShow = 8, inventoryItems = null }) {
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const q = input.value.trim().toLowerCase();
      listEl.innerHTML = '';

      let candidates = [];

      if (inventoryItems) {
        // 在庫リストから検索（ホームページ用）
        const all = inventoryItems;
        if (!q) {
          candidates = all.slice(0, maxShow);
        } else {
          const exact   = all.filter(f => f.foodName.toLowerCase() === q);
          const prefix  = all.filter(f => f.foodName.toLowerCase().startsWith(q) && f.foodName.toLowerCase() !== q);
          const partial = all.filter(f =>
            f.foodName.toLowerCase().includes(q) &&
            !f.foodName.toLowerCase().startsWith(q)
          );
          candidates = [...exact, ...prefix, ...partial].slice(0, maxShow);
        }
      } else {
        // foodsマスタから検索（モーダル用）
        const all = await getFoods();
        candidates = await searchFoodsByName(q, all);
        candidates = candidates.slice(0, maxShow);
      }

      if (candidates.length === 0) {
        listEl.classList.remove('show');
        return;
      }

      candidates.forEach(item => {
        const li = document.createElement('div');
        li.className = 'suggest-item';

        const isFav = item.favorite;
        const name  = item.foodName || item.name;

        li.innerHTML = `
          <span class="suggest-fav">${isFav ? '⭐' : ''}</span>
          <span class="suggest-name">${escapeHtml(name)}</span>
        `;

        li.addEventListener('mousedown', e => {
          e.preventDefault(); // blur発火を防ぐ
          onSelect(item);
          listEl.classList.remove('show');
        });

        listEl.appendChild(li);
      });

      listEl.classList.add('show');
    }, 150);
  });

  // フォーカスアウト時にリストを隠す
  input.addEventListener('blur', () => {
    setTimeout(() => listEl.classList.remove('show'), 200);
  });

  // フォーカス時に既入力があればサジェスト表示
  input.addEventListener('focus', () => {
    if (input.value.trim()) input.dispatchEvent(new Event('input'));
  });
}

/**
 * Firebase エラーを人が読みやすいメッセージに変換してトーストで表示する
 * @param {Error}  e
 * @param {string} action  '追加'|'更新'|'削除' など
 */
function handleFirebaseError(e, action = '操作') {
  console.error(`[Firebase エラー] ${action}:`, e.code, e.message, e);
  let msg = '';
  switch (e.code) {
    case 'permission-denied':
      msg = '⛔ 権限エラー：Firestore のセキュリティルールを確認してください';
      break;
    case 'unavailable':
      msg = '📡 オフライン：ネットワーク接続を確認してください';
      break;
    case 'not-found':
      msg = '🔍 データが見つかりませんでした';
      break;
    case 'unauthenticated':
      msg = '🔑 認証エラー：ログインが必要です';
      break;
    default:
      msg = `❌ ${action}に失敗しました（${e.code || e.message || '不明なエラー'}）`;
  }
  showToast(msg, 3500);
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
