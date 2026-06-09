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
        '<span class="mealplan-ingredient-chip">' +
          food +
        '</span>'
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





