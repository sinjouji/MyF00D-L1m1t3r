/* ============================================================
   firebase-config.js
   ★ ここに自分のFirebaseプロジェクトの設定を貼り付けてください
   ============================================================ */

var firebaseConfig = {
  apiKey:            "AIzaSyCiTcN9SKvgiAhJ7IB6cIsj3dmPp9HCkHE",
  authDomain:        "myf00d-l1m1t3r.firebaseapp.com",
  projectId:         "myf00d-l1m1t3r",
  storageBucket:     "myf00d-l1m1t3r.firebasestorage.app",
  messagingSenderId: "700111982315",
  appId:             "1:700111982315:web:5654e50554fa27fc5338ae"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

/* ★ enablePersistence は完全に削除
      以前のバージョンで有効化していた場合は、ブラウザの
      IndexedDB を一度クリアしてください:
      DevTools → Application → IndexedDB → firestore/* → Delete */
var db = firebase.firestore();
