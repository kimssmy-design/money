// db.js
// 역할: Firebase 초기화 + Firestore 읽기/쓰기만 담당.
// 화면(UI) 로직은 전혀 모르고, "데이터를 저장한다 / 데이터가 바뀌면 알려준다"만 함.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { firebaseConfig, ENTRIES_COLLECTION } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

// 오프라인 캐시 켜기: 인터넷이 끊긴 상태에서 "기록하기"를 눌러도 기기에 임시 저장되고,
// 화면에도 바로 반영됨. 인터넷이 다시 연결되면 자동으로 서버와 동기화됨.
// persistentMultipleTabManager: 한 기기에서 앱을 여러 탭/창으로 동시에 열어도 충돌 안 나게 함.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

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
 * 지출 항목 하나를 수정. entry는 addEntry와 동일한 형태(날짜/카테고리/금액/결제수단/작성자).
 */
export async function updateEntry(id, entry) {
  await updateDoc(doc(db, ENTRIES_COLLECTION, id), entry);
}

/**
 * 지출 항목 하나를 삭제.
 */
export async function deleteEntry(id) {
  await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
}

/**
 * 전체 지출 내역을 실시간으로 구독.
 * 데이터가 추가/변경될 때마다 callback(entries배열) 이 자동으로 호출됨.
 * date 한 필드만 정렬하고(복합 인덱스 불필요), 같은 날짜끼리는 저장 시각(createdAt) 기준으로
 * 클라이언트에서 한 번 더 정렬함.
 * onError: 실시간 연결 자체가 실패했을 때 호출됨(기본은 콘솔에만 기록).
 * 반환값(unsubscribe 함수)은 지금은 쓸 일이 없지만 나중에 필요하면 사용 가능.
 */
export function subscribeEntries(callback, onError = console.error) {
  const q = query(entriesRef, orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      entries.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1; // 날짜 내림차순
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at; // 같은 날짜면 최근 저장한 게 위로
      });
      callback(entries);
    },
    onError
  );
}
