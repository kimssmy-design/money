// ui.js
// 역할: 화면 그리기 + 사용자 입력 처리(자동저장 포함).
// Firestore를 직접 건드리지 않고, "저장해야 할 때 콜백을 불러주는" 방식으로만 동작.

import { DINING_WARNING_THRESHOLD } from "./summary.js";
import { CATEGORIES } from "./categories.js";
import { todayStr } from "./dateUtil.js";
import { getBadge } from "./streak.js";
import { getNoSpendBadge } from "./noSpendStreak.js";

const WRITER_LABEL = { seonyeong: "선영", hyunwoo: "현우", gongyong: "공용" };
const METHOD_LABEL = { cash: "현금", card: "카드" }; // 내역 리스트의 작은 태그용 축약 표기 (전체 이름은 입력 버튼·요약 카드에서 사용)

function formatWon(n) {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function formatDateLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}.${Number(d)}`;
}

/* ---------------- 토스트(저장됨 알림) ---------------- */

export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1600);
}

/* ---------------- 기간 요약 렌더링 ---------------- */

export function renderSummary(totals, range) {
  document.getElementById("rangeLabel").textContent =
    `${range.start.replaceAll("-", ".")} – ${range.end.replaceAll("-", ".")}`;

  document.getElementById("totalAmount").textContent = formatWon(totals.total);
  document.getElementById("cashAmount").textContent = formatWon(totals.cash);
  document.getElementById("cardAmount").textContent = formatWon(totals.card);

  document.getElementById("writerTotal-seonyeong").textContent = formatWon(totals.byWriter.seonyeong);
  document.getElementById("writerTotal-hyunwoo").textContent = formatWon(totals.byWriter.hyunwoo);
  document.getElementById("writerTotal-gongyong").textContent = formatWon(totals.byWriter.gongyong);

  const diningAlert = document.getElementById("diningAlert");
  document.getElementById("diningAmount").textContent = formatWon(totals.dining.amount);
  document.getElementById("diningCount").textContent = `${totals.dining.count}건`;
  diningAlert.classList.toggle("over", totals.dining.amount > DINING_WARNING_THRESHOLD);

  document.getElementById("groceryAmount").textContent = formatWon(totals.grocery.amount);
  document.getElementById("groceryCount").textContent = `${totals.grocery.count}건`;
}

/**
 * 선영/현우 연속 기록일수 + 뱃지 표시. 기간 선택과 무관하게 전체 기록 기준.
 */
export function renderStreaks(streaks) {
  document.getElementById("streakSeonyeong").textContent = streaks.seonyeong;
  document.getElementById("badgeSeonyeong").textContent = getBadge(streaks.seonyeong);
  document.getElementById("streakHyunwoo").textContent = streaks.hyunwoo;
  document.getElementById("badgeHyunwoo").textContent = getBadge(streaks.hyunwoo);
}

/**
 * 가계부 전체(부부 공동) 무지출 연속일수 표시.
 */
export function renderNoSpendStreak(streak) {
  document.getElementById("noSpendStreak").textContent = streak;
  document.getElementById("noSpendBadge").textContent = getNoSpendBadge(streak);
}

/* ---------------- 내역 리스트 렌더링 ---------------- */

let currentEntries = [];
let entriesExpanded = false;
const ENTRIES_PREVIEW_COUNT = 5;

export function renderEntries(entries) {
  currentEntries = entries;
  renderEntryListView();
}

function renderEntryListView() {
  const list = document.getElementById("entryList");
  const count = document.getElementById("entryCount");
  const toggleBtn = document.getElementById("toggleEntriesBtn");
  const total = currentEntries.length;
  count.textContent = `${total}건`;

  if (total === 0) {
    list.innerHTML = `<p class="empty">선택한 기간에 기록된 지출이 없어요.</p>`;
    toggleBtn.classList.add("hidden");
    return;
  }

  const visible = entriesExpanded ? currentEntries : currentEntries.slice(0, ENTRIES_PREVIEW_COUNT);
  list.innerHTML = visible
    .map(
      (e) => `
      <div class="entry">
        <div class="tag ${e.writer}"></div>
        <div class="meta">
          <div class="cat">${escapeHtml(e.category)}</div>
          ${e.memo ? `<div class="memo">${escapeHtml(e.memo)}</div>` : ""}
          <div class="sub">${formatDateLabel(e.date)} · ${WRITER_LABEL[e.writer] ?? "?"}</div>
        </div>
        <div>
          <span class="amt">${formatWon(e.amount)}</span>
          <span class="method">${METHOD_LABEL[e.method] ?? ""}</span>
        </div>
        <button class="icon-btn" data-action="edit" data-id="${e.id}" type="button">✏️</button>
        <button class="icon-btn" data-action="delete" data-id="${e.id}" type="button">🗑️</button>
      </div>`
    )
    .join("");

  if (total > ENTRIES_PREVIEW_COUNT) {
    toggleBtn.classList.remove("hidden");
    toggleBtn.textContent = entriesExpanded ? "접기" : `전체보기 (총 ${total}건)`;
  } else {
    toggleBtn.classList.add("hidden");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------------- 기간 선택 컨트롤 ---------------- */

export function initRangeControl(onChange) {
  const presetSelect = document.getElementById("rangePreset");
  const customWrap = document.getElementById("customRangeWrap");
  const customStart = document.getElementById("customStart");
  const customEnd = document.getElementById("customEnd");
  const customApply = document.getElementById("customApply");

  presetSelect.addEventListener("change", () => {
    if (presetSelect.value === "custom") {
      customWrap.classList.remove("hidden");
      return;
    }
    customWrap.classList.add("hidden");
    onChange({ preset: presetSelect.value });
  });

  customApply.addEventListener("click", () => {
    if (!customStart.value || !customEnd.value) return;
    onChange({ preset: "custom", start: customStart.value, end: customEnd.value });
  });
}

/* ---------------- 입력 폼 + 자동저장 + 수정 ---------------- */

let formMethod = "cash";
let formWriter = null;
let formLoggedBy = null;
let editingEntryId = null;
let saving = false;

let dateInput, categoryInput, memoInput, amountInput, methodBtns, writerBtns, loggedByBtns;

function isReady() {
  const amount = Number(amountInput.value);
  const loggedByOk = formWriter !== "gongyong" || formLoggedBy !== null;
  return categoryInput.value.trim() !== "" && amount > 0 && formWriter !== null && loggedByOk;
}

function setMethodActive(method) {
  formMethod = method;
  methodBtns.forEach((b) => b.classList.toggle("active", b.dataset.method === method));
}

function setLoggedByActive(loggedBy) {
  formLoggedBy = loggedBy;
  loggedByBtns.forEach((b) => b.classList.toggle("active", b.dataset.loggedby === loggedBy));
}

function setWriterActive(writer) {
  formWriter = writer;
  writerBtns.forEach((b) => b.classList.toggle("active", b.dataset.writer === writer));

  const loggedByField = document.getElementById("loggedByField");
  if (writer === "gongyong") {
    loggedByField.classList.remove("hidden");
  } else {
    loggedByField.classList.add("hidden");
    setLoggedByActive(null);
  }
}

function resetFormFully() {
  editingEntryId = null;
  dateInput.value = todayStr();
  categoryInput.selectedIndex = 0;
  memoInput.value = "";
  amountInput.value = "";
  setMethodActive("cash");
  setWriterActive(null);
  document.getElementById("editingBadge").classList.add("hidden");
}

/**
 * 내역 리스트에서 ✏️를 눌렀을 때: 폼에 해당 항목을 채우고 "수정 모드"로 전환.
 */
function startEditingEntry(entry) {
  editingEntryId = entry.id;
  dateInput.value = entry.date;
  categoryInput.value = entry.category;
  memoInput.value = entry.memo ?? "";
  amountInput.value = entry.amount;
  setMethodActive(entry.method);
  setWriterActive(entry.writer);
  if (entry.writer === "gongyong") {
    setLoggedByActive(entry.loggedBy ?? null);
  }
  document.getElementById("editingBadge").classList.remove("hidden");
  document.getElementById("entryCategory").scrollIntoView({ behavior: "smooth", block: "center" });
}

export function initForm({ onSave, onUpdate }) {
  dateInput = document.getElementById("entryDate");
  categoryInput = document.getElementById("entryCategory");
  memoInput = document.getElementById("entryMemo");
  amountInput = document.getElementById("entryAmount");
  methodBtns = Array.from(document.querySelectorAll(".method-btn"));
  writerBtns = Array.from(document.querySelectorAll(".writer-btn"));
  loggedByBtns = Array.from(document.querySelectorAll(".loggedby-btn"));
  const saveBtn = document.getElementById("saveBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  // 마이너스 기호가 입력되는 즉시 제거 (min="0"만으로는 타이핑 자체를 막지 못함)
  amountInput.addEventListener("input", () => {
    if (amountInput.value.includes("-")) {
      amountInput.value = amountInput.value.replace(/-/g, "");
    }
  });

  // 날짜 기본값: 오늘
  dateInput.value = todayStr();

  // 카테고리 옵션을 공통 목록(categories.js)에서 채움
  for (const cat of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryInput.appendChild(opt);
  }

  methodBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMethodActive(btn.dataset.method));
  });

  writerBtns.forEach((btn) => {
    btn.addEventListener("click", () => setWriterActive(btn.dataset.writer));
  });

  loggedByBtns.forEach((btn) => {
    btn.addEventListener("click", () => setLoggedByActive(btn.dataset.loggedby));
  });

  // 자동저장 없음 - "기록하기" 버튼을 눌러야만 저장/수정됨
  saveBtn.addEventListener("click", () => trySave());

  cancelEditBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    resetFormFully();
  });

  async function trySave() {
    if (saving) return;
    if (!isReady()) {
      if (!formWriter) {
        showToast("누가 썼는지 선택해주세요");
      } else if (formWriter === "gongyong" && !formLoggedBy) {
        showToast("실제 기록자를 선택해주세요");
      } else {
        showToast("카테고리와 금액을 입력해주세요");
      }
      return;
    }

    saving = true;
    const entry = {
      date: dateInput.value,
      category: categoryInput.value.trim(),
      memo: memoInput.value.trim(),
      amount: Number(amountInput.value),
      method: formMethod,
      writer: formWriter,
      loggedBy: formWriter === "gongyong" ? formLoggedBy : formWriter
    };

    try {
      if (editingEntryId) {
        await onUpdate(editingEntryId, entry);
        showToast("수정됨 ✓");
        resetFormFully();
      } else {
        await onSave(entry);
        showToast("저장됨 ✓");
        // 다음 입력을 위해 카테고리/메모/금액만 비움 (날짜, 결제수단, 작성자는 유지 → 같은 사람이 연달아 기록하기 편함)
        categoryInput.selectedIndex = 0;
        memoInput.value = "";
        amountInput.value = "";
      }
    } catch (err) {
      console.error(err);
      showToast(editingEntryId ? "수정 실패 - 인터넷 연결을 확인해주세요" : "저장 실패 - 인터넷 연결을 확인해주세요");
    } finally {
      saving = false;
    }
  }
}

/**
 * 내역 리스트의 ✏️(수정)/🗑️(삭제) 버튼 처리.
 */
export function initEntryList({ onDelete }) {
  document.getElementById("toggleEntriesBtn").addEventListener("click", () => {
    entriesExpanded = !entriesExpanded;
    renderEntryListView();
  });

  document.getElementById("entryList").addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const entry = currentEntries.find((e) => e.id === id);
    if (!entry) return;

    if (btn.dataset.action === "edit") {
      startEditingEntry(entry);
    } else if (btn.dataset.action === "delete") {
      if (confirm("이 지출 기록을 삭제할까요?")) {
        await onDelete(id);
        showToast("삭제됨");
      }
    }
  });
}
