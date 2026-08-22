// ⚠️ 이 파일은 본인의 Firebase 프로젝트 설정값으로 반드시 교체해야 합니다.
// Firebase 콘솔(console.firebase.google.com) → 프로젝트 설정 → 일반 → "내 앱" 섹션에서
// 웹 앱(</> 아이콘)을 추가하면 아래와 똑같이 생긴 설정 객체를 볼 수 있어요.
// 그 값을 복사해서 아래 firebaseConfig 안의 값들만 바꿔주세요.

export const firebaseConfig = {
  apiKey: "AIzaSyBSCa1atSkdKMWCxrwM0GxccKjUekresLY",
  authDomain: "moneymoney-5bc8a.firebaseapp.com",
  projectId: "moneymoney-5bc8a",
  storageBucket: "moneymoney-5bc8a.firebasestorage.app",
  messagingSenderId: "880367989738",
  appId: "1:880367989738:web:949a48d738db7f38ec3893"
};


// 지출 내역을 저장할 Firestore 컬렉션 이름 (원하면 바꿔도 됨)
export const ENTRIES_COLLECTION = "entries";
