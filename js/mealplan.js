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

renderMealPlan();

var plan = loadMealPlan();

if (plan.updatedAt) {

  var date =
    new Date(plan.updatedAt);

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

var ingredientsHtml =
  (plan.ingredients || [])
    .map(function(food) {

      return (
        '<div class="ingredient-row">' +

          '<div class="ingredient-chip">' +
            food +
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

content.innerHTML =
  '<section class="mealplan-card">' +
    '<div class="mealplan-card-head">🍛 計画中の献立</div>' +
    '<div class="mealplan-meal-list">' +
      mealsHtml +
    '</div>' +
  '</section>' +

  '<section class="mealplan-card">' +
    '<div class="mealplan-card-head">🥕 必要食材</div>' +
    '<div class="mealplan-ingredient-list">' +
      ingredientsHtml +
    '</div>' +
  '</section>';
}


//==============================
// 買い物リストに追加処理（仮）
//==============================
async function addIngredientToShopping(foodName) {
  if (!foodName) return;
  
  console.log('[add shopping foodName]', foodName);

  try {
    await db.collection('shoppingItems').add({
      name: foodName,
      category: 'food',
      checked: false,
      type: 'item',
      createdAt: new Date(),
      order: Date.now()
    });

    showToast('🛒 ' + foodName + ' を買い物リストに追加しました');

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
    .replace(/[0-9０-９]+(\.[0-9０-９]+)?\s*(g|kg|ml|cc|個|本|枚|袋|パック|束|缶|大さじ|小さじ)/gi, '')
    .replace(/[0-9０-９]+\/[0-9０-９]+\s*(個|本|枚|袋|パック|束)?/g, '')
    .replace(/適量|少々/g, '')
    .trim();
}

