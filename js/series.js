//
// SERIE.JS シリーズ関連の処理
//


//==============================
//シリーズ名を取得
//==============================
function openSeriesById(id){
console.log("byid~~");
  const series = seriesMaster.find(
    s => String(s.id) === String(id)
  );

  if(!series) return;

  openSeries(series);
}


//==============================
//====シリーズホーム
//◼️シリーズ一覧表示（骨組みだけ）
//==============================
function renderSeries(){

setActiveMenu("menu-series");

  const list = document.getElementById('page-series');
  list.innerHTML = `
  		
  		<div id="series-top"></div>
  		<div class="series-main" id="series-main"></div>
  `;
	
	
	renderSeriesSearchArea();
	renderSeriesBookList();
	
}

//==============================
//====シリーズ一覧だけを表示する
//==============================
function renderSeriesBookList(){


	const main = document.getElementById("series-main");
	if(!main) return;
	main.innerHTML = "";
	
	//フィルタ
	const filteredSeries =
  seriesMaster.filter(s =>

    (s.name || "")
      .toLowerCase()
      .includes(
        seriesSearchKeyword.toLowerCase()
      )

  );
	//ソート
	const sorted = sortSeries(filteredSeries);
			
		sorted.forEach(s=>{
		
			const d = document.createElement('div');
			d.className = "card ";
			d.textContent = s.name;

		d.onclick = ()=> openSeries(s);
		main.appendChild(d);
	});
	
}

//============================
// シリーズ：詳細画面の表示
//============================
function renderSeriesDetail(s){

  const relatedBooks = books.filter(b =>
    (s.bookIds || []).map(String).includes(String(b.id))
  );

  const relatedCharacters = characters.filter(c =>
    (s.characterIds || []).map(String).includes(String(c.id))
  );

  safeRender({
    mountId: "page-detail",
    html: `
      <div class="seriesp-head">
        <button onclick="go('series')">戻る</button>
        <span class="satu">登録 : ${relatedBooks.length}冊</span>
        <button onclick="openSeriesEditModal('${s.id}')">✏️ 編集</button>
      </div>

      <h3 class="stitle">${s.name}</h3>

      <div class="series-detail-layout">

        <div class="series-section">
          <div class="series-section-title">
            ${seriesSections.books ? "▽" : "▶︎"} 関連作品
          </div>

          ${
            seriesSections.books
              ? `<div id="series-books"></div>`
              : ""
          }
        </div>

        <div class="series-section">
          <div class="series-section-title">
            ${seriesSections.chars ? "▽" : "▶︎"} 関連人物
          </div>

          ${
            seriesSections.chars
              ? `<div id="series-chars"></div>`
              : ""
          }
        </div>

      </div>
    `,
    afterRender: (el) => {

      const list = document.getElementById("series-books");
      if(list){
        relatedBooks.forEach(b=>{
          const d = document.createElement("div");
          d.className = "card mini-s-card";
          d.textContent = b.title;
          d.onclick = () => openBookDetailModal(b);
          list.appendChild(d);
        });
      }

      const list2 = document.getElementById("series-chars");
      if(list2){
        if(!relatedCharacters.length){
          list2.innerHTML = `<div style="color:gray;">（人物なし）</div>`;
        }else{
          relatedCharacters.forEach(c=>{
            const d = document.createElement("div");
            d.className = "card mini-s-card";
            d.textContent = c.name;
            d.onclick = () => openCharacterModal(c);
            list2.appendChild(d);
          });
        }
      }

    }
  });
}

//==============================
//シリーズソート
//==============================
function sortSeries(list){

	const arr = [...list];

//シリーズ名順	
	if(seriesSortMode === "stitle-asc"){
		arr.sort((a,b)=>
			(a.name || "")
			.localeCompare(
				b.name || "",
				"ja"
			)
		);
	}
	
	if(seriesSortMode === "stitle-desc"){
		arr.sort((a,b)=>
			(b.name || "")
			.localeCompare(
				a.name || "",
				"ja"
			)
		);
	}
	
//読了日順	
//	if(seriesSortMode === "sread-asc"){
//		arr.sort((a,b)=>
//			toDateNum(b) - toDateNum(a)
//		);
//	}
	
//	if(seriesSortMode === "sread-desc"){
//		arr.sort((a,b)=>
//			toDateNum(a) - toDateNum(b)
//		);
//	}
	
	
	return arr;
}



//==============================
//====ソートモード切替え（シリーズ）
//==============================
function changeSeriesSortMode(){

	seriesSortMode =
		document.getElementById("series-sort-select").value;
		
		renderSeriesBookList();

}






//==============================
//シリーズ詳細を開く
//==============================
function openSeries(series){

  currentSeriesId = series.id;
  
  go('detail');

  renderSeriesDetail(series);

}



//==============================
//====シリーズページの検索エリア
//==============================
function renderSeriesSearchArea(){

	const top = document.getElementById("series-top");
	if(!top) return;
	
	top.innerHTML = `
	<button onclick="openAddSeriesModal()"
		class="add-btn">
			➕ シリーズ
		</button>
		
		<input
			id="series-search"
			placeholder="シリーズ検索..."
			value="${seriesSearchKeyword || ""}"
			oninput="handleSeriesSearchInput()"
		>
		
			<select id="series-sort-select"
				onchange="changeSeriesSortMode()">
			
			<option value="stitle-asc">タイトル↓</option>
			<option value="stitle-desc">タイトル↑</option>
			
			<option value="sread-desc">読了日新</option>
			<option value="sread-asc">読了日古</option>
			
			</select>
		
		<div id="series-suggest"></div>
	`;
	renderSeriesSuggest();
}




//==============================
//====キーワード検索（シリーズ一覧用）
//==============================
function handleSeriesSearchInput(){

  seriesSearchKeyword =

    document.getElementById(
      "series-search"
    ).value;

  renderSuggestList({

    inputId:
      "series-search",

    suggestId:
      "series-suggest",

    list:
      seriesMaster.map(
        s => s.name
      )

  });

  renderSeriesBookList();
}






//==============================
//シリーズ編集モーダル保存処理
//==============================
async function saveSeriesEdit(id){

  const series =
    seriesMaster.find(
      s => String(s.id) === String(id)
    );

  if(!series) return;

  series.name =
    document.getElementById(
      "edit-series-name"
    ).value;

  series.bookIds =
    editingSeriesBookIds.map(String);
    
  books.forEach(function(book){

  const shouldHaveSeries =
    editingSeriesBookIds.includes(
      String(book.id)
    );

  if(shouldHaveSeries){

    const currentIds =
      (book.seriesIds || []);

    if(
      !currentIds.includes(
        String(series.id)
      )
    ){

      book.seriesIds =
        currentIds.concat(
          String(series.id)
        );
    }

  }else{

    book.seriesIds =
      (book.seriesIds || []).filter(
        function(seriesId){

          return (
            String(seriesId)
            !== String(series.id)
          );

        }
      );
  }
});

  series.characterIds =
    editingSeriesCharacterIds.map(String);
    
  characters.forEach(character=>{

  const shouldHaveSeries =
    editingSeriesCharacterIds.includes(
      String(character.id)
    );

  if(shouldHaveSeries){

    if(
      !(character.seriesIds || [])
        .includes(String(series.id))
    ){

      character.seriesIds =
  (character.seriesIds || []).concat(
    String(series.id)
  );
    }

  }else{

    character.seriesIds =
      (character.seriesIds || [])
        .filter(seriesId =>

          String(seriesId)
          !== String(series.id)

        );
  }
});

  await saveData();

  closeModal("edit-series-modal");

  renderSeries();
  
  renderSeriesDetail(series);

  showToast("保存しました！");
}



//==============================
//関連本の一覧描画
//==============================
function renderSeriesEditBooks(){

  const relatedBooks =
    books.filter(b =>

      editingSeriesBookIds.includes(
        String(b.id)
      )

    );

  document.getElementById(
    "series-edit-books"
  ).innerHTML = `

    <div>

      ${relatedBooks.map(b=>`

        <div class="related-chip">

          ${b.title}

          <button
            class="mini-delete-btn"
            onclick="
              removeBookFromSeries(
                '${b.id}'
              )
            "
          >
            ✕
          </button>

        </div>

      `).join("")}

    </div>
  `;
}


//==============================
//関連キャラの一覧描画
//==============================
function renderSeriesEditCharacters(){

  const relatedCharacters =
    characters.filter(c =>

      editingSeriesCharacterIds.includes(c.id)

    );

  document.getElementById(
    "series-edit-characters"
  ).innerHTML = `

    <div>

      ${relatedCharacters.map(c=>`

        <div class="related-chip">

          ${c.name}

          <button
            class="mini-delete-btn"
            onclick="
              removeCharacterFromSeries(
                '${c.id}'
              )
            "
          >
            ✕
          </button>

        </div>

      `).join("")}

    </div>
  `;
}






//==============================
//関連本の追加処理
//==============================
function addBookToSeries(id){

  if(
    !editingSeriesBookIds.includes(id)
  ){
    editingSeriesBookIds.push(
      String(id)
    );
  }

  renderSeriesEditBooks();

}



//==============================
//編集内：関連削除（本）
//==============================
function removeBookFromSeries(id){

if(!confirm("削除しますか？")){
  return;
}

  editingSeriesBookIds =
    editingSeriesBookIds.filter(
      bId => String(bId) !== String(id)
    );

  renderSeriesEditBooks();

}



//==============================
//関連キャラの追加処理
//==============================
function addCharacterToSeries(id){

  if(
    !editingSeriesCharacterIds.includes(id)
  ){
    editingSeriesCharacterIds.push(id);
  }

  renderSeriesEditCharacters();

}

//==============================
//編集内：関連削除（人物）
//==============================
function removeCharacterFromSeries(id){

if(!confirm("削除しますか？")){
  return;
}

  editingSeriesCharacterIds =
    editingSeriesCharacterIds.filter(
      cId => String(cId) !== String(id)
    );

  renderSeriesEditCharacters();

}





//==============================
//新規用：関連本の描画
//==============================
function renderSeriesNewBooks(){

  const relatedBooks =
    books.filter(b =>

      newSeriesBookIds.includes(String(b.id))

    );

  document.getElementById(
    "series-new-books"
  ).innerHTML = `

    ${relatedBooks.map(b=>`

      <div class="related-chip">

        ${b.title}

      </div>

    `).join("")}

  `;
}


//==============================
//新規用：関連人物の描画
//==============================
function renderSeriesNewCharacters(){

  const relatedCharacters =
    characters.filter(c =>

      newSeriesCharacterIds.includes(c.id)

    );

  document.getElementById(
    "series-new-characters"
  ).innerHTML = `

    ${relatedCharacters.map(c=>`

      <div class="related-chip">

        ${c.name}

      </div>

    `).join("")}

  `;
}




//==============================
//⭐︎新規シリーズに関連本追加処理
//==============================
function addBookToNewSeries(id){

  if(
    !newSeriesBookIds.includes(id)
  ){
    newSeriesBookIds.push(String(id));
  }

  renderSeriesNewBooks();
  renderSeriesNewBookSuggest();

}



//==============================
//⭐︎新規シリーズに関連人物追加処理
//==============================
function addCharacterToNewSeries(id){

  if(
    !newSeriesCharacterIds.includes(id)
  ){
    newSeriesCharacterIds.push(id);
  }

  renderSeriesNewCharacters();
  renderSeriesNewCharacterSuggest();

}



//==============================
//====新規シリーズ追加処理
//==============================
async function saveNewSeries(){

  const title =
    document.getElementById(
      "add-series-title"
    ).value.trim();

  if(!title) return;

  const series = {

    id:
      "s" + Date.now(),

    name:
      title,

    bookIds:
      (newSeriesBookIds || []).map(String),

    characterIds:
      (newSeriesCharacterIds || []).map(String)
  };

  seriesMaster.push(series);

  // 本側へ同期
  books.forEach(book=>{

    const shouldHaveSeries =
      series.bookIds.includes(
        String(book.id)
      );

    if(shouldHaveSeries){

      if(
        !(book.seriesIds || [])
          .map(String)
          .includes(String(series.id))
      ){

        book.seriesIds =
          (book.seriesIds || []).concat(
            String(series.id)
          );
      }
    }
  });

  // 人物側へ同期
  characters.forEach(character=>{

    const shouldHaveSeries =
      series.characterIds.includes(
        String(character.id)
      );

    if(shouldHaveSeries){

      if(
        !(character.seriesIds || [])
          .map(String)
          .includes(String(series.id))
      ){

        character.seriesIds =
          (character.seriesIds || []).concat(
            String(series.id)
          );
      }
    }
  });

  await saveData();

  closeModal(
    "add-series-modal"
  );

  renderSeries();

  showToast(
    `「${series.name}」を追加しました`
  );
}

//==============================
//====シリーズ削除
//==============================
async function deleteSeries(id){

  const series =
    seriesMaster.find(
      s => String(s.id) === String(id)
    );

  if(!series) return;

  if(
    !confirm(
      `「${series.name}」を削除しますか？\n本や人物は削除されません。`
    )
  ){
    return;
  }

  seriesMaster =
    seriesMaster.filter(
      s => String(s.id) !== String(id)
    );

  books.forEach(book=>{

    book.seriesIds =
      (book.seriesIds || []).filter(
        seriesId =>
          String(seriesId) !== String(id)
      );

  });

  characters.forEach(character=>{

    character.seriesIds =
      (character.seriesIds || []).filter(
        seriesId =>
          String(seriesId) !== String(id)
      );

  });

    await saveData();

    closeModal("edit-series-modal");
    go('series');
    renderSeries();

    showToast(
    `「${series.name}」を削除しました`
  );
}






//====================
//シリーズ内作品の最新読了日取得
//====================
//function getSeriesLastRead(series){
//関連作品から最新の日付を取得するやーつ
//}



