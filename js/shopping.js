/* ============================================================
   shopping.html — 買い物メモ スクリプト

   Firestore コレクション: shoppingItems
   {
     name:      string   // アイテム名
     category:  'food' | 'misc'
     memo:      string
     checked:   boolean  // チェック済み
     createdAt: Date
   }

   責務:
     ・food / misc を問わず「買い物候補」だけ管理
     ・inventory / foods には一切書かない
     ・チェック = 「カートに入れた」の印（削除はしない）
 ============================================================ */

initConfirmDialog();

var allItems    = [];   // shoppingItems（onSnapshot）
var filterCat   = 'all';  // 'all' | 'food' | 'misc'
var foodNames   = [];   // foods の name 一覧（サジェスト用）
var selCategory = 'food'; // 入力パネルで選択中のカテゴリ

var shopExpiryItem = null; //チェックしてその場で期限モーダルここから
var shopExpiryDate = null;

var shopExpiryOverlay = document.getElementById('shopExpiryOverlay');
var shopExpiryFoodName = document.getElementById('shopExpiryFoodName');
var shopExpiryManualWrap = document.getElementById('shopExpiryManualWrap');
var shopExpiryManualDate = document.getElementById('shopExpiryManualDate');
var shopExpiryMemo = document.getElementById('shopExpiryMemo'); //期限モーダルここまで


/* ====================================
   Firestore リスナー
   ==================================== */

/* 買い物メモ */
db.collection('shoppingItems').onSnapshot(function(snap) {
  allItems = snap.docs.map(function(d) {
    return Object.assign({ id: d.id }, d.data());
  });

  allItems.sort(function(a, b) {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return (a.order || 0) - (b.order || 0);
  });

  renderShop();

}, function(err) {
  console.error('shoppingItems error:', err.code, err.message);
  showToast('⚠️ 読み込みエラー: ' + err.code);
  renderShop();
});

/* foods（食材名サジェスト用） */
db.collection('foods').onSnapshot(function(snap) {
  foodNames = snap.docs.map(function(d) { return d.data().name || ''; });
}, function(err) {
  console.warn('foods (for suggest) error:', err.code);
});


/* ====================================
   カテゴリタブ
   ==================================== */
document.querySelectorAll('.cat-chip').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.cat-chip').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    filterCat = tab.dataset.cat;
    renderShop();
  });
});


/* ====================================
   レンダリング
   ==================================== */
function renderShop() {
  var list = filterCat === 'all'
    ? allItems.slice()
    : allItems.filter(function(i) { return i.category === filterCat; });

  var unchecked = list.filter(function(i) { return !i.checked; });
  var checked   = list.filter(function(i) { return i.checked; });

  /* カウント表示 */
  document.getElementById('shopCount').textContent =
    unchecked.length + ' 件' + (checked.length ? '（チェック済み ' + checked.length + ' 件）' : '');

  var container = document.getElementById('shopList');

  if (list.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">🛒</div>' +
        (filterCat === 'all'
          ? '買い物メモはまだありません<br><span style="font-size:0.8rem;color:var(--text-3);">下の入力欄からアイテムを追加しましょう</span>'
          : 'このカテゴリのアイテムはありません') +
      '</div>';
    return;
  }

  container.innerHTML = '';
  /* 未チェック → チェック済みの順で表示 */
  unchecked.concat(checked).forEach(function(item) {
    container.appendChild(buildShopItem(item));
  });
}

function buildShopItem(item) {
  var wrap = document.createElement('div');
  var catCls   = item.category === 'food' ? 'food' : 'misc';
  var catLabel = item.category === 'food' ? '🥦 食材' : '🧴 雑貨';

  wrap.innerHTML =
    '<div class="shop-item' + (item.checked ? ' is-checked' : '') + '" data-id="' + item.id + '">' +
      '<div class="shop-check">' + (item.checked ? '✓' : '') + '</div>' +
      '<div class="shop-item-body">' +
        '<div class="shop-name">' +
          escapeHtml(item.name) +
          '<span class="cat-label ' + catCls + '">' + catLabel + '</span>' +
        '</div>' +
        (item.memo ? '<div class="shop-memo">' + escapeHtml(item.memo) + '</div>' : '') +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button class="icon-btn move-up" title="上へ">↑</button>' +
        '<button class="icon-btn move-down" title="下へ">↓</button>' +
        '<button class="icon-btn del" title="削除">🗑️</button>' +
      '</div>' +
    '</div>';

  wrap.querySelector('.move-up').addEventListener('click', async function(e) {
    e.stopPropagation();
    await moveShoppingItem(item, -1);
  });

  wrap.querySelector('.move-down').addEventListener('click', async function(e) {
    e.stopPropagation();
    await moveShoppingItem(item, 1);
  });

  wrap.querySelector('.shop-check').addEventListener('click', async function(e) {
    e.stopPropagation();
    await toggleShoppingChecked(item);
  });

  wrap.querySelector('.shop-item-body').addEventListener('click', async function(e) {
    e.stopPropagation();
    await toggleShoppingChecked(item);
  });

  wrap.querySelector('.icon-btn.del').addEventListener('click', async function(e) {
    e.stopPropagation();

    try {
      await db.collection('shoppingItems').doc(item.id).delete();
      showToast('🗑️ 削除しました');
    } catch (e) {
      showToast('❌ 削除失敗（' + (e.code || e.message) + '）');
    }
  });

  return wrap;
}



//日付ボタンイベント
document.querySelectorAll('#shopExpiryDateBtns .date-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('#shopExpiryDateBtns .date-btn').forEach(function(b) {
      b.classList.remove('active');
    });

    btn.classList.add('active');

    if (btn.dataset.days === 'none') {
      shopExpiryManualWrap.classList.remove('show');
      shopExpiryDate = 'none';
    } else if (btn.dataset.days === 'manual') {
      shopExpiryManualWrap.classList.add('show');

      setTimeout(function() {
        shopExpiryManualDate.showPicker?.();
        shopExpiryManualDate.focus();
        shopExpiryManualDate.click();
      }, 50);

      shopExpiryDate = shopExpiryManualDate.value || null;
    } else {
      shopExpiryManualWrap.classList.remove('show');
      shopExpiryDate = getDateStr(Number(btn.dataset.days));
    }
  });
});

shopExpiryManualDate.addEventListener('change', function() {
  shopExpiryDate = shopExpiryManualDate.value || null;
});


//モーダル開閉
function openShopExpiryModal(item) {
  shopExpiryItem = item;
  shopExpiryDate = null;

  shopExpiryFoodName.textContent = item.name;
  shopExpiryMemo.value = '';
  shopExpiryManualDate.value = '';
  shopExpiryManualWrap.classList.remove('show');

  document.querySelectorAll('#shopExpiryDateBtns .date-btn').forEach(function(b) {
    b.classList.remove('active');
  });

  shopExpiryOverlay.classList.add('show');
}

function closeShopExpiryModal() {
  shopExpiryOverlay.classList.remove('show');
  shopExpiryItem = null;
  shopExpiryDate = null;
}

//キャンセルと登録ボタン
document.getElementById('shopExpiryCancel').addEventListener('click', function() {
  closeShopExpiryModal();
});

shopExpiryOverlay.addEventListener('click', function(e) {
  if (e.target === shopExpiryOverlay) {
    closeShopExpiryModal();
  }
});

document.getElementById('shopExpiryOk').addEventListener('click', async function() {
  if (!shopExpiryItem) return;

  if (!shopExpiryDate) {
    showToast('⚠️ 期限日を選択してください');
    return;
  }

  var item = shopExpiryItem;
  var noExpiry = shopExpiryDate === 'none';
  var memo = shopExpiryMemo.value.trim();

  try {
    await db.collection('inventory').doc(item.foodId).set({
      foodId: item.foodId,
      foodName: item.name,
      expiryDate: noExpiry ? '' : shopExpiryDate,
      noExpiry: noExpiry,
      memo: memo,
      updatedAt: new Date()
    });

    await db.collection('history').add({
      foodId: item.foodId,
      foodName: item.name,
      expiryDate: noExpiry ? '' : shopExpiryDate,
      noExpiry: noExpiry,
      memo: memo,
      favorite: true,
      registeredAt: new Date()
    });

    await db.collection('shoppingItems').doc(item.id).update({
      checked: true
    });

    showToast('✅ ' + item.name + ' の期限を登録しました');
    closeShopExpiryModal();

  } catch (e) {
    console.error('shop expiry register error:', e);
    showToast('❌ 期限登録に失敗しました');
  }
});




//期限入力のやつ
async function toggleShoppingChecked(item) {
  var nextChecked = !item.checked;

  try {
    await db.collection('shoppingItems')
      .doc(item.id)
      .update({
        checked: nextChecked
      });

    if (item.foodId && nextChecked) {
  openShopExpiryModal(item);
    return;
  }

  } catch (e) {
    showToast('❌ 更新失敗（' + (e.code || e.message) + '）');
  }
}


async function moveShoppingItem(item, direction) {

  var visible = allItems.filter(function(i) {

    return i.checked === item.checked &&
      (filterCat === 'all' || i.category === filterCat);

  });

  visible.sort(function(a, b) {

    return (a.order || 0) -
      (b.order || 0);

  });

  var idx = visible.findIndex(function(i) {

    return i.id === item.id;

  });

  var other = visible[idx + direction];

  if (!other) return;

  try {

    var batch = db.batch();

    batch.update(
      db.collection('shoppingItems').doc(item.id),
      {
        order: other.order || 0
      }
    );

    batch.update(
      db.collection('shoppingItems').doc(other.id),
      {
        order: item.order || 0
      }
    );

    await batch.commit();

  } catch (e) {

    console.error('move error:', e);

    showToast('❌ 並び替え失敗');

  }

}




/* ====================================
   カテゴリ選択ボタン（入力パネル）
   ==================================== */
document.querySelectorAll('.cat-select-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.cat-select-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    selCategory = btn.dataset.sel;
  });
});


/* ====================================
   アイテム名サジェスト
   既登録アイテム名（全カテゴリ）+ foods の名前 を候補に
   ==================================== */
var shopNameInput  = document.getElementById('shopItemName');
var shopSuggestEl  = document.getElementById('shopSuggestList');
var suggestTimer;

shopNameInput.addEventListener('input', function() {
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(function() {
    var q = shopNameInput.value.trim();
    shopSuggestEl.innerHTML = '';
    if (!q) { shopSuggestEl.classList.remove('show'); return; }

    /* 既登録アイテム名（重複なし）+ foods 名を合わせて候補にする */
    var existingNames = allItems.map(function(i) { return i.name; });
    var allNames = existingNames.concat(foodNames).filter(function(n, idx, arr) {
      return arr.indexOf(n) === idx;  // 重複除去
    });
    var nameObjs = allNames.map(function(n) { return { name: n }; });
    var candidates = suggestSort(q, nameObjs, 'name', 8);

    if (!candidates.length) { shopSuggestEl.classList.remove('show'); return; }

    candidates.forEach(function(obj) {
      var div = document.createElement('div');
      div.className = 'suggest-item';
      div.innerHTML = '<span class="suggest-name">' + escapeHtml(obj.name) + '</span>';
      div.addEventListener('mousedown', function(e) {
        e.preventDefault();
        shopNameInput.value = obj.name;
        shopSuggestEl.classList.remove('show');
      });
      shopSuggestEl.appendChild(div);
    });
    shopSuggestEl.classList.add('show');
  }, 150);
});

shopNameInput.addEventListener('blur', function() {
  setTimeout(function() { shopSuggestEl.classList.remove('show'); }, 200);
});


/* ====================================
   アイテム追加
   ==================================== */
document.getElementById('shopAddBtn').addEventListener('click', addItem);
shopNameInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addItem();
});

async function addItem() {
  var name = shopNameInput.value.trim();
  if (!name) { showToast('⚠️ アイテム名を入力してください'); shopNameInput.focus(); return; }

  var exists = allItems.some(function(item) {
  return !item.checked &&
    item.name.trim().toLowerCase() === name.toLowerCase();
  });

  if (exists) {
    showToast('🛒 ' + name + ' は既に買い物リストにあります');
    shopNameInput.value = '';
    document.getElementById('shopItemMemo').value = '';
    shopNameInput.focus();
    return;
  }


  var memo = document.getElementById('shopItemMemo').value.trim();

  try {
    await db.collection('shoppingItems').add({
      name:      name,
      category:  selCategory,
      memo:      memo,
      checked:   false,
      
      order: Date.now(),
      
      createdAt: new Date()
    });
    /* 入力欄をリセット（カテゴリ選択は維持） */
    shopNameInput.value = '';
    document.getElementById('shopItemMemo').value = '';
    shopNameInput.focus();
    showToast('✅ ' + name + ' を追加しました');
  } catch (e) {
    console.error('shoppingItems 追加エラー:', e.code, e.message);
    showToast('❌ 追加失敗（' + (e.code || e.message) + '）');
  }
}


/* ====================================
   チェック済みを削除
   ==================================== */
document.getElementById('clearCheckedBtn').addEventListener('click', async function() {
  var checked = allItems.filter(function(i) { return i.checked; });
  if (checked.length === 0) { showToast('⚠️ チェック済みのアイテムがありません'); return; }

  var ok = await confirmDialog({
    title:   'チェック済み ' + checked.length + ' 件を削除しますか？',
    sub:     'この操作は取り消せません',
    detail:  '',
    okLabel: '削除する'
  });
  if (!ok) return;

  try {
    var batch = db.batch();
    checked.forEach(function(item) {
      batch.delete(db.collection('shoppingItems').doc(item.id));
    });
    await batch.commit();
    showToast('🗑️ チェック済み ' + checked.length + ' 件を削除しました');
  } catch (e) {
    showToast('❌ 削除失敗（' + (e.code || e.message) + '）');
  }
});


/* ====================================
   すべて削除
   ==================================== */
document.getElementById('clearAllBtn').addEventListener('click', async function() {
  if (allItems.length === 0) { showToast('⚠️ アイテムがありません'); return; }

  var ok = await confirmDialog({
    title:   '買い物メモを全削除しますか？',
    sub:     'この操作は取り消せません',
    detail:  '<p style="color:var(--expired-t);font-weight:700;">リスト全 ' + allItems.length + ' 件を削除します</p>',
    okLabel: 'すべて削除する'
  });
  if (!ok) return;

  try {
    for (var i = 0; i < allItems.length; i += 400) {
      var batch = db.batch();
      allItems.slice(i, i + 400).forEach(function(item) {
        batch.delete(db.collection('shoppingItems').doc(item.id));
      });
      await batch.commit();
    }
    showToast('🗑️ 買い物メモを全削除しました');
  } catch (e) {
    showToast('❌ 削除失敗（' + (e.code || e.message) + '）');
  }
});