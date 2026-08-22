// fixedTemplates.js
// 역할: "고정비 항목(템플릿)" 자체의 저장/수정/삭제만 담당.
// 실제 지출 기록(entries)과는 다른 컬렉션(fixedTemplates)에 저장됨.
// 템플릿 = "매달 반복되는 지출의 기본값" (예: 주택담보대출 이자, 실비보험 등)

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { db } from "./db.js";

const TEMPLATES_COLLECTION = "fixedTemplates";
const templatesRef = collection(db, TEMPLATES_COLLECTION);

/**
 * template = { name, writer, category, method, defaultAmount }
 */
export async function addTemplate(template) {
  await addDoc(templatesRef, template);
}

export async function updateTemplate(id, template) {
  await updateDoc(doc(db, TEMPLATES_COLLECTION, id), template);
}

export async function deleteTemplate(id) {
  await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
}

/**
 * 등록된 고정비 템플릿을 실시간으로 구독.
 */
export function subscribeTemplates(callback) {
  const q = query(templatesRef, orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(templates);
  });
}
