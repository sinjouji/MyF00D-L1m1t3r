/* ============================================================
   history.html — 履歴ページ スクリプト
   ============================================================ */

initConfirmDialog();

var allHistory      = [];
var filteredHistory = [];
var searchQuery = '';
var filterFav   = false;
var dateFrom    = '';
var dateTo      = '';
var currentPage = 1;
var PAGE_SIZE   = 20;


/* ====================================
   Firestore リスナー（orderBy なし → JS ソート）
   ==================================== */
db.collection('history').onSnapshot(function(snap) {
  allHistory = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });

  /* 登録日時の新しい順にソート */
  allHistory.sort(function(a, b) {
    var ta = toMs(a.registeredAt);
    var tb = toMs(b.registeredAt);
    return tb - ta;
  });

  applyAndRender();
}, function(err) {
  console.error('history error:', err.code, err.message);
  showToast('⚠️ 履歴の読み込みに失敗: ' + err.code);
  applyAndRender();
});

/** Firestore Timestamp / Date / null → ミリ秒数 */
function toMs(val) {
  if (!val) return 0;
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val instanceof Date) return val.getTime();
  if (val.seconds) return val.seconds * 1000;
  return 0;
}


/* ====================================
   フィルターイベント
   ==================================== */
document.getElementById('histSearch').addEventListener('input', function(e) {
  searchQuery = e.target.value.trim().toLowerCase();
  currentPage = 1;
  applyAndRender();
});
document.getElementById('histFavFilter').addEventListener('click', function() {
  filterFav = !filterFav;
  this.classList.toggle('active', filterFav);
  currentPage = 1;
  applyAndRender();
});
document.getElementById('dateFrom').addEventListener('change', function(e) {
  dateFrom = e.target.value; currentPage = 1; applyAndRender();
});
document.getElementById('dateTo').addEventListener('change', function(e) {
  dateTo = e.target.value; currentPage = 1; applyAndRender();
});
document.getElementById('clearDateBtn').addEventListener('click', function() {
  dateFrom = dateTo = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value   = '';
  currentPage = 1;
  applyAndRender();
});

/*トグル収納するやつ*/
var historyFilterOpen = false;

document.getElementById('historyFilterToggle').addEventListener('click', function() {
  historyFilterOpen = !historyFilterOpen;

  document.getElementById('historyFilterPanel').classList.toggle('open', historyFilterOpen);
  document.getElementById('historyFilterArrow').textContent = historyFilterOpen ? '▲' : '▼';
});


/* ====================================
   フィルター適用
   ==================================== */
function applyAndRender() {
  var list = allHistory.slice();

  /* キーワード検索（食材名 or メモ、サジェストソート順） */
  if (searchQuery) {
    var q = searchQuery;
    var nameMatches = suggestSort(q, list, 'foodName', 9999);
    var memoOnly = list.filter(function(h) {
      return !(h.foodName || '').toLowerCase().includes(q) &&
             (h.memo || '').toLowerCase().includes(q);
    });
    /* 重複除去 */
    var seen = {};
    list = [];
    nameMatches.concat(memoOnly).forEach(function(h) {
      if (!seen[h.id]) { seen[h.id] = true; list.push(h); }
    });
  }

  /* お気に入り */
  if (filterFav) list = list.filter(function(h) { return h.favorite; });

  /* 登録日フィルター */
  if (dateFrom) {
    var from = new Date(dateFrom);
    list = list.filter(function(h) {
      var ms = toMs(h.registeredAt);
      return ms > 0 && new Date(ms) >= from;
    });
  }
  if (dateTo) {
    var to = new Date(dateTo); to.setHours(23, 59, 59, 999);
    list = list.filter(function(h) {
      var ms = toMs(h.registeredAt);
      return ms > 0 && new Date(ms) <= to;
    });
  }

  filteredHistory = list;
  renderHistory();
}


/* ====================================
   履歴レンダリング
   ==================================== */
function renderHistory() {
  var total    = filteredHistory.length;
  var totalPgs = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage  = Math.min(currentPage, totalPgs);

  document.getElementById('histCount').textContent = total + ' 件';

  var start     = (currentPage - 1) * PAGE_SIZE;
  var paginated = filteredHistory.slice(start, start + PAGE_SIZE);
  var container = document.getElementById('histList');

  if (total === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div>条件に一致する履歴はありません</div>';
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  container.innerHTML = '';
  paginated.forEach(function(item) { container.appendChild(buildHistItem(item)); });

  /* ページネーション */
  var pEl = document.getElementById('pagination');
  if (totalPgs > 1) {
    pEl.style.display = 'flex';
    document.getElementById('pageInfo').textContent = currentPage + ' / ' + totalPgs;
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPgs);
  } else {
    pEl.style.display = 'none';
  }
}

document.getElementById('prevPage').addEventListener('click', function() {
  if (currentPage > 1) { currentPage--; renderHistory(); scrollTo({ top: 0, behavior: 'smooth' }); }
});
document.getElementById('nextPage').addEventListener('click', function() {
  var totalPgs = Math.ceil(filteredHistory.length / PAGE_SIZE);
  if (currentPage < totalPgs) { currentPage++; renderHistory(); scrollTo({ top: 0, behavior: 'smooth' }); }
});


/* ====================================
   履歴アイテム DOM 生成
   ==================================== */
function buildHistItem(item) {
  var wrap = document.createElement('div');
  var status  = item.expiryDate ? getExpiryStatus(item.expiryDate) : 'normal';
  var regDate = formatDateTime(item.registeredAt);

  /* キーワードハイライト */
  var hl = function(str) {
    if (!searchQuery || !str) return escapeHtml(str || '');
    var pat = escapeHtml(searchQuery).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapeHtml(str).replace(new RegExp('(' + pat + ')', 'gi'),
      '<span class="highlight">$1</span>');
  };

  wrap.innerHTML =
    '<div class="hist-item">' +
      '<div class="hist-left">' +
        '<div class="hist-name">' +
          (item.favorite ? '<span>⭐</span>' : '') +
          '<span>' + hl(item.foodName) + '</span>' +
          (item.expiryDate
            ? '<span class="hist-expiry-chip ' + status + '">' + formatDate(item.expiryDate) + '</span>'
            : '') +
        '</div>' +
        (item.memo ? '<div class="hist-memo">💬 ' + hl(item.memo) + '</div>' : '') +
        '<div class="hist-meta">📅 登録：' + regDate + '</div>' +
      '</div>' +
      '<div class="hist-right">' +
        '<button class="icon-btn del" title="削除">🗑️</button>' +
      '</div>' +
    '</div>';

  wrap.querySelector('.icon-btn.del').addEventListener('click', async function() {
    var ok = await confirmDialog({
      title:   '履歴を削除しますか？',
      sub:     'この操作は取り消せません',
      detail:  '<p><span class="dl">食材名</span>' + escapeHtml(item.foodName || '') + '</p>' +
               '<p><span class="dl">期限</span>' + formatDate(item.expiryDate) + '</p>' +
               (item.memo ? '<p><span class="dl">メモ</span>' + escapeHtml(item.memo) + '</p>' : '') +
               '<p><span class="dl">登録日時</span>' + regDate + '</p>',
      okLabel: '削除する'
    });
    if (!ok) return;
    try {
      await db.collection('history').doc(item.id).delete();
      showToast('🗑️ 履歴を削除しました');
    } catch (e) {
      console.error('削除エラー:', e.code, e.message);
      showToast('❌ 削除失敗（' + (e.code || e.message) + '）');
    }
  });

  return wrap;
}


/* ====================================
   一括削除
   ==================================== */
document.getElementById('bulkDeleteBtn').addEventListener('click', async function() {
  if (filteredHistory.length === 0) { showToast('⚠️ 削除する履歴がありません'); return; }

  var isFiltered = searchQuery || filterFav || dateFrom || dateTo;
  var label = (isFiltered ? '絞り込み中の ' : '全履歴 ') + filteredHistory.length + ' 件';

  var ok = await confirmDialog({
    title:   label + 'を削除しますか？',
    sub:     'この操作は取り消せません',
    detail:  '<p style="color:var(--expired-t);font-weight:700;">' + label + 'を一括削除します</p>',
    okLabel: '一括削除する'
  });
  if (!ok) return;

  try {
    var ids = filteredHistory.map(function(h) { return h.id; });
    /* Firestore バッチは 1 回 500 件まで → 400 件刻みで安全に処理 */
    for (var i = 0; i < ids.length; i += 400) {
      var batch = db.batch();
      ids.slice(i, i + 400).forEach(function(id) {
        batch.delete(db.collection('history').doc(id));
      });
      await batch.commit();
    }
    showToast('🗑️ ' + ids.length + ' 件を削除しました');
  } catch (e) {
    console.error('一括削除エラー:', e.code, e.message);
    showToast('❌ 削除失敗（' + (e.code || e.message) + '）');
  }
});