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

  var content =
    document.getElementById(
      'mealPlanContent'
    );

  if (!plan.meals || plan.meals.length === 0) {

    content.innerHTML =
      '<div class="empty-card">献立データがありません</div>';

    return;
  }

  content.innerHTML = '読込成功';
}