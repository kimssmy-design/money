// db.js
// 역할: Firebase 초기화 + Firestore 읽기/쓰기만 담당.
// 화면(UI) 로직은 전혀 모르고, "데이터를 저장한다 / 데이터가 바뀌면 알려준다"만 함.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { firebaseConfig, ENTRIES_COLLECTION } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const entriesRef = collection(db, ENTRIES_COLLECTION);

/**
 * 지출 항목 하나를 Firestore에 저장.
 * entry = { date: "2026-08-20", category: "식비", amount: 15000, method: "cash"|"card", writer: "seonyeong"|"hyunwoo"|"gongyong" }
 */
export async function addEntry(entry) {
  await addDoc(entriesRef, {
    ...entry,
    createdAt: serverTimestamp() // 저장된 실제 시각(정렬용)
  });
}

/**
 * 전체 지출 내역을 실시간으로 구독.
 * 데이터가 추가/변경될 때마다 callback(entries배열) 이 자동으로 호출됨.
 * 반환값(unsubscribe 함수)은 지금은 쓸 일이 없지만 나중에 필요하면 사용 가능.
 */
export function subscribeEntries(callback) {
  const q = query(entriesRef, orderBy("date", "desc"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(entries);
  });
}
