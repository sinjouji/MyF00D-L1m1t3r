/* ============================================================
   firebase-config.js
   ⚠️  ここに自分のFirebaseプロジェクトの設定を貼り付けてください
   Firebase Console → プロジェクトの設定 → マイアプリ → Firebase SDK 追加
   ============================================================ */

// ▼ 自分のFirebaseプロジェクトの設定に差し替えてください ▼
const firebaseConfig = {
  apiKey:            "AIzaSyCiTcN9SKvgiAhJ7IB6cIsj3dmPp9HCkHE",
  authDomain:        "myf00d-l1m1t3r.firebaseapp.com",
  projectId:         "myf00d-l1m1t3r",
  storageBucket:     "myf00d-l1m1t3r.firebasestorage.app",
  messagingSenderId: "700111982315",
  appId:             "1:700111982315:web:5654e50554fa27fc5338ae"
};
// ▲ ここまで ▲

// Firebase初期化（重複初期化防止）
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Firestoreインスタンスをグローバル変数として公開
const db = firebase.firestore();

// オフライン永続化を有効化（マルチタブ対応で端末ローカルキャッシュ）
// ※ 同一ブラウザの複数タブで問題が出る場合は experimentalForceOwningTab: true を追加
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    // 複数タブ開いている場合はスキップ（どちらか一方のみ有効）
    console.warn('[Firestore] 永続化: 複数タブのためスキップ');
  } else if (err.code === 'unimplemented') {
    // ブラウザが永続化非対応の場合はスキップ
    console.warn('[Firestore] 永続化: このブラウザは非対応');
  }
});
