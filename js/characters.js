//
// CHARACTERS 人物関連の処理ちゃんだぜええ
//
//


//==============================
//◼️キャラクターホーム（骨組み）だけ
//==============================
function renderCharacters(){

  setActiveMenu("menu-characters");

  const el =
    document.getElementById(
      "page-characters"
    );

  if(!el) return;

  el.innerHTML = `
    <div id="characters-top"></div>
    <div id="characters-main" class="chars-main"></div>
  `;

  renderCharacterSearchArea();

  renderCharacterList();
}

//==============================
//====キャラクター一覧だけ表示====
//==============================
function renderCharacterList(){

	const main = document.getElementById("characters-main");
	if(!main) return;
	main.innerHTML = "";
	
	const filtered = 
		characters.filter(c =>
			(c.name || "")
				.toLowerCase()
				.includes(characterSearchKeyword)
		);
	
	//ソート
	const sorted = sortCharacters(filtered);

		sorted.forEach(c=>{
			const d = document.createElement('div');
			
			d.className = "card";
			
			
			const relatedSeries =
  seriesMaster.filter(s =>
    (s.characterIds || [])
      .map(String)
      .includes(String(c.id))
  );

d.innerHTML = `
  <div class="character-list-name">
    ${c.name}
  </div>

  ${
    relatedSeries.length
      ? `
        <div class="character-list-series">
          ${relatedSeries.map(s => s.name).join(" / ")}
        </div>
      `
      : ""
  }
`;
			d.onclick = ()=> openCharacterModal(c);

			main.appendChild(d);
		});

}



//==============================
//キャラクター検索エリア
//==============================
function renderCharacterSearchArea(){

	const top = document.getElementById("characters-top");
	if(!top) return;
	
	top.innerHTML = `
	
	<button onclick="openAddCharacterModal()"
		class="add-btn">
		➕ 人物
	</button>
	
	<input
		id="chars-search"
		placeholder="人物検索..."
		value="${characterSearchKeyword}"
		oninput="
		  characterSearchKeyword = this.value;
		  renderCharacterList();
		"
	>
	
		<select id="characters-sort-select"
			onchange="changeCharactersSortMode()">
			
		<option value="cname-asc">名前↓</option>
		<option value="cname-desc">名前↑</option>
		</select>
		
	
	`;
	
}








//==============================
//人物詳細編集の関連シリーズ一覧描画
//==============================
function renderCharacterEditSeries(
  targetId
){

  const target =
    document.getElementById(targetId);

  if(!target) return;

  const relatedSeries =
    seriesMaster.filter(s =>

      editingCharacterSeriesIds.includes(
        String(s.id)
      )

    );

  target.innerHTML = `

    <div>

      ${relatedSeries.map(s=>`

        <div class="related-chip">

          ${s.name}

          <button
            class="mini-delete-btn"
            onclick="
              removeSeriesFromCharacter(
                '${s.id}',
                '${targetId}',
                'character-related-search',
                'character-series-suggest'
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
//====キャラクター詳細の保存====
//==============================
async function saveCharacter(id){

  const chars =
    characters.find(
      c => String(c.id) === String(id)
    );

  if(!chars) return;

  chars.seriesIds =
    (editingCharacterSeriesIds || [])
      .map(String);

  seriesMaster.forEach(series=>{

    const shouldHaveCharacter =
      editingCharacterSeriesIds.includes(
        String(series.id)
      );

    if(shouldHaveCharacter){

      if(
        !(series.characterIds || [])
          .includes(String(chars.id))
      ){

        series.characterIds =
          (series.characterIds || []).concat(
            String(chars.id)
          );
      }

    }else{

      series.characterIds =
        (series.characterIds || [])
          .filter(characterId =>

            String(characterId)
            !== String(chars.id)

          );
    }
  });

  console.log(
    document.getElementById("character-name").value
  );

  chars.name =
    document.getElementById(
      "character-name"
    ).value;

  chars.memo =
    document.getElementById(
      "character-memo"
    ).value;

  console.log("after edit", chars);

  await saveData();

  showToast("保存しました！");

  closeModal("open-chars-modal");

  renderCharacters();
}


//==============================
//新規人物追加処理
//==============================
async function saveNewCharacter(){

  const name =
    document.getElementById(
      "add-chars-name"
    ).value.trim();

  if(!name){
    alert("名前を入力してね！");
    return;
  }

  const memo =
    document.getElementById(
      "add-chars-memo"
    )?.value || "";

  const character = {

    id:
      "ch" + Date.now(),

    name,

    seriesIds:
      editingCharacterSeriesIds.map(String),

    memo
  };

  characters.unshift(character);

  seriesMaster.forEach(series=>{

    const shouldHaveSeries =
      editingCharacterSeriesIds.includes(
        String(series.id)
      );

    if(shouldHaveSeries){

      if(
        !(series.characterIds || [])
          .includes(String(character.id))
      ){

        series.characterIds =
          (series.characterIds || [])
            .concat(String(character.id));
      }
    }
  });

  await saveData();

  closeModal(
    "add-chars-modal"
  );

  renderCharacters();

  showToast(
    `「${character.name}」を追加しました`
  );
}



//==============================
//人物削除処理
//==============================
async function deleteCharacter(id){

  const character =
    characters.find(
      c => String(c.id) === String(id)
    );

  if(!character) return;

  if(
    !confirm(
      `「${character.name}」を削除しますか？\nシリーズや本は削除されません。`
    )
  ){
    return;
  }

  characters =
    characters.filter(
      c => String(c.id) !== String(id)
    );

  // シリーズ側から人物IDを掃除
  seriesMaster.forEach(series=>{

    series.characterIds =
      (series.characterIds || []).filter(
        characterId =>
          String(characterId) !== String(id)
      );

  });

  await saveData();

  closeModal("open-chars-modal");

  renderCharacters();

  showToast(
    `「${character.name}」を削除しました`
  );
}



//==============================
//人物詳細編集の関連追加処理
//==============================
function addSeriesToCharacter(
  id,
  listId,
  searchId,
  suggestId
){

  if(
    editingCharacterSeriesIds.includes(
      String(id)
    )
  ){
    return;
  }

  editingCharacterSeriesIds.push(
    String(id)
  );

  renderCharacterEditSeries(listId);

  renderCharacterSeriesSuggest(
    searchId,
    suggestId,
    listId
  );
}






//==============================
//人物詳細編集の関連消去
//==============================
function removeSeriesFromCharacter(
  id,
  listId,
  searchId,
  suggestId
){

  if(!confirm("削除しますか？")){
    return;
  }

  editingCharacterSeriesIds =
    editingCharacterSeriesIds.filter(
      sId => String(sId) !== String(id)
    );

  renderCharacterEditSeries(
    listId
  );

  renderCharacterSeriesSuggest(
    searchId,
    suggestId,
    listId
  );
}




//==============================
//キャラクターソート
//==============================
function sortCharacters(list){

	const arr = [...list];
	
	//名前順
	if(charsSortMode === "cname-asc"){
		arr.sort((a,b)=>
			(a.name || "")
			.localeCompare(
				b.name || "",
				"ja"
			)
		);
	}
	
	if(charsSortMode === "cname-desc"){
		arr.sort((a,b)=>
			(b.name || "")
			.localeCompare(
				a.name || "",
				"ja"
			)
		);
	}
	return arr;
}



//==============================
//ソートモード切替（キャラ）
//==============================
function changeCharactersSortMode(){

	charsSortMode =
		document.getElementById("characters-sort-select").value;
		
		renderCharacterList();

}

