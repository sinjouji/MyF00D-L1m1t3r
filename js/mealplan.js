//
// MEALPLAN.JS
//



//==============================
// データロード
//==============================
function loadMealPlan() {

  try {
    return JSON.parse(
      localStorage.getItem(
        'mealPlanForFoodApp'
      ) || '{}'
    );
  } catch(e) {

    return {};

  }
}

//==============================
// 在庫リスト読むよ
//==============================
var inventoryFoodNames = [];

async function loadInventoryFoodNames() {
  try {
    var snap = await db.collection('inventory').get();

    inventoryFoodNames = [];

    snap.forEach(function(doc) {
      var item = doc.data();
      var name = item.foodName || item.name || '';

      if (name) {
        inventoryFoodNames.push(
          normalizeIngredientName(name)
        );
      }
    });

    inventoryFoodNames = Array.from(new Set(inventoryFoodNames));

    console.log('[inventoryFoodNames]', inventoryFoodNames);

  } catch (e) {
    console.error('loadInventoryFoodNames error:', e);
    inventoryFoodNames = [];
  }
}


//==============================
// 除外リストの取得
//==============================
var excludedMenuFoods = [];

async function loadExcludedMenuFoods() {
  try {
    var snap = await db.collection('foods')
      .where('excludeFromMenu', '==', true)
      .get();

    excludedMenuFoods = [];

    snap.forEach(function(doc) {
      var food = doc.data();
      if (food.name) {
        excludedMenuFoods.push(food.name);
      }
    });

    console.log('[excludedMenuFoods]', excludedMenuFoods);

  } catch (e) {
    console.error('loadExcludedMenuFoods error:', e);
    excludedMenuFoods = [];
  }
}


//==============================
// ページ描画
//==============================
function renderMealPlan() {

  var plan = loadMealPlan();

  var updatedEl =
    document.getElementById('mealPlanUpdated');

  var content =
    document.getElementById('mealPlanContent');

  if (!plan.meals || plan.meals.length === 0) {

    if (updatedEl) {
      updatedEl.textContent = '最終更新：-';
    }

    content.innerHTML =
      '<div class="empty-card">献立データがありません</div>';

    return;
  }

  if (updatedEl) {

    var updatedText = '-';

    if (plan.updatedAt) {
      updatedText =
        new Date(plan.updatedAt)
          .toLocaleString('ja-JP');
    }

    updatedEl.textContent =
      '最終更新：' + updatedText;
  }

  var mealsHtml =
  (plan.meals || [])
    .map(function(meal) {

      return (
        '<div class="meal-card">' +
          '🍛 ' + meal.name +
        '</div>'
      );

    })
    .join('');
    
    //食材リスト50音順ソート
    var sortedIngredients =
  (plan.ingredients || [])
    .slice()
    .sort(function(a, b) {

      var aName = normalizeIngredientName(
        typeof a === 'string' ? a : (a.name || '')
      );

      var bName = normalizeIngredientName(
        typeof b === 'string' ? b : (b.name || '')
      );

      var aHas =
        inventoryFoodNames.includes(aName);

      var bHas =
        inventoryFoodNames.includes(bName);

      if (aHas !== bHas) {
        return aHas ? 1 : -1;
      }

      return aName.localeCompare(bName, 'ja');
    });

    var availableCount = 0;
    var missingCount = 0;

    sortedIngredients.forEach(function(food) {

  var matchName =
    normalizeIngredientName(food);

  var hasStock =
    inventoryFoodNames.includes(matchName);

  if (hasStock) {
    availableCount++;
  } else {
    missingCount++;
  }

});

var ingredientsHtml =
  sortedIngredients
    .filter(function(food) {
      return !excludedMenuFoods.includes(normalizeIngredientName(food));
    })
    .map(function(food) {
  var matchName = normalizeIngredientName(
  typeof food === 'string' ? food : (food.name || '')
);

  var hasStock =
    inventoryFoodNames.includes(matchName);

  var stockClass = hasStock
    ? 'has-stock'
    : 'no-stock';

  var stockIcon = hasStock
    ? '✅'
    : '⚠️';

  return (
    '<div class="ingredient-row ' + stockClass + '">' +

      '<div class="ingredient-chip">' +
        stockIcon + ' ' + food +
      '</div>' +

      '<button class="ingredient-add-btn" ' +
        'onclick="addIngredientToShopping(\'' +
        food.replace(/'/g, "\\'") +
        '\')">' +
        '＋' +
      '</button>' +

    '</div>'
  );
})
    .join('');
    
    var mealMemoHtml =
  (plan.meals || [])
    .map(function(meal) {
      var labels =
        meal.ingredientLabels ||
        meal.ingredients ||
        [];

      return (
        '<div class="meal-material-memo">' +
          '<div class="meal-material-title">🍛 ' +
            escapeHtml(meal.name || '') +
          '</div>' +
          '<div class="meal-material-list">' +
            labels.map(function(x) {
              return escapeHtml(x);
            }).join('、') +
          '</div>' +
        '</div>'
      );
    })
    .join('');

content.innerHTML =
  '<section class="mealplan-card">' +
    '<div class="mealplan-card-head">🍛 計画中の献立</div>' +
    '<div class="mealplan-meal-list">' +
      mealsHtml +
    '</div>' +
  '</section>' +

  '<section class="mealplan-card">' +
    '<div class="mealplan-card-head">🥕 必要食材
<div class="ingredient-summary">
  ⚠️ 不足 ' + missingCount + '品　
  ✅ 在庫あり ' + availableCount + '品
</div>' +
    '<div class="mealplan-ingredient-list">' +
      ingredientsHtml +
    '</div>' +
  '</section>' +

  '<section class="mealplan-card">' +
    '<div class="mealplan-card-head">📋 献立別 材料メモ</div>' +
    '<div class="meal-material-memo-list">' +
      mealMemoHtml +
    '</div>' +
  '</section>';

}


//==============================
// 買い物リストに追加処理（仮）
//==============================
async function addIngredientToShopping(foodName) {
  if (!foodName) return;

  var displayName = foodName;
  var matchName = normalizeIngredientName(foodName);

  console.log('[add shopping]', displayName, '=>', matchName);

  try {
    var snap = await db.collection('shoppingItems')
      .where('category', '==', 'food')
      .where('checked', '==', false)
      .get();

    var exists = false;

    snap.forEach(function(doc) {
      var item = doc.data();

      var itemMatchName =
        item.matchName ||
        normalizeIngredientName(item.name || '');

      if (itemMatchName === matchName) {
        exists = true;
      }
    });

    if (exists) {
      showToast('🛒 ' + matchName + ' は既に買い物リストにあります');
      return;
    }
    
    var foodSnap = await db.collection('foods')
  .where('name', '==', matchName)
  .limit(1)
  .get();

var matchedFoodId = null;

if (!foodSnap.empty) {
  matchedFoodId = foodSnap.docs[0].id;
}

    await db.collection('shoppingItems').add({
  name: displayName,
  matchName: matchName,
  foodId: matchedFoodId,
  category: 'food',
  checked: false,
  type: 'item',
  createdAt: new Date(),
  order: Date.now()
});

    showToast('🛒 ' + displayName + ' を買い物リストに追加しました');

  } catch (e) {
    console.error('addIngredientToShopping error:', e);
    showToast('❌ 買い物リストに追加できませんでした');
  }
}



//==============================
// 食材名から分量切り捨て
//==============================
function normalizeIngredientName(name) {
  return name
    .replace(/[0-9０-９]+(\.[0-9０-９]+)?\s*(g|kg|ml|cc|個|本|枚|袋|パック|束|缶|玉|株|尾|切れ|片|丁|杯|合|大さじ|小さじ)/gi, '')
    .replace(/[0-9０-９]+\/[0-9０-９]+\s*(個|本|枚|袋|パック|束|玉|株|尾|切れ|片|丁)?/g, '')
    .replace(/適量|少々/g, '')
    .trim();
}


//==============================
// 初期化⭐︎
//==============================
async function initMealPlanPage() {
  await loadExcludedMenuFoods();
  await loadInventoryFoodNames();
  renderMealPlan();
}

initMealPlanPage();
