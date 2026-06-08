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

  content.innerHTML = '読込成功';
}





