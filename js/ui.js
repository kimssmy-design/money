// ui.js
// 역할: 화면 그리기 + 사용자 입력 처리.
// Firestore를 직접 건드리지 않고, "저장해야 할 때 콜백을 불러주는" 방식으로만 동작.

import { DINING_WARNING_THRESHOLD } from "./summary.js";
import { CATEGORIES } from "./categories.js";
import { todayStr } from "./dateUtil.js";
import { getBadge } from "./streak.js";

const WRITER_LABEL = { seonyeong: "선영", hyunwoo: "현우", gongyong: "공용" };
const METHOD_LABEL = { cash: "현금·체크", card: "신용카드" }; // 내역 리스트의 작은 표기용
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

// 폰(좁은 화면)인지: 이 폭 미만이면 입력폼이 +버튼으로 여는 시트가 됨 (style.css의 640px와 맞춤)
const narrowQuery = window.matchMedia("(max-width: 639px)");

function formatWon(n) {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = WEEKDAY[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

/** "🍽️외식·간식" → { icon: "🍽️", name: "외식·간식" } (저장된 값은 그대로, 화면 표시용으로만 나눔) */
function splitCategory(cat) {
  const str = cat ?? "";
  const m = str.match(/^(\p{Extended_Pictographic}\uFE0F?)(.*)$/u);
  return m ? { icon: m[1], name: m[2] } : { icon: str.slice(0, 1), name: str };
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

function formatRangeDate(dateStr, withYear) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return withYear ? `${y}년 ${m}월 ${d}일` : `${m}월 ${d}일`;
}

export function renderSummary(totals, range) {
  const crossYear = range.start.slice(0, 4) !== range.end.slice(0, 4);
  document.getElementById("rangeLabel").textContent =
    `${formatRangeDate(range.start, crossYear)} – ${formatRangeDate(range.end, crossYear)} 지출`;

  document.getElementById("totalAmount").textContent = formatWon(totals.total);
  document.getElementById("cashAmount").textContent = formatWon(totals.cash);
  document.getElementById("cardAmount").textContent = formatWon(totals.card);

  // 누가 썼나: 금액 + 비율 막대
  const writerSum = totals.byWriter.seonyeong + totals.byWriter.hyunwoo + totals.byWriter.gongyong;
  ["seonyeong", "hyunwoo", "gongyong"].forEach((w) => {
    const amt = totals.byWriter[w];
    const pct = writerSum > 0 ? Math.round((amt / writerSum) * 100) : 0;
    document.getElementById(`writerTotal-${w}`).textContent = formatWon(amt);
    document.getElementById(`writerPct-${w}`).textContent = `${pct}%`;
    const bar = document.getElementById(`shareBar-${w}`);
    bar.style.flexGrow = writerSum > 0 ? amt : 0;
    bar.style.display = amt > 0 ? "block" : "none";
  });

  // 외식·간식 한도 타일
  const dining = totals.dining.amount;
  const over = dining > DINING_WARNING_THRESHOLD;
  const pct = Math.min(100, Math.round((dining / DINING_WARNING_THRESHOLD) * 100));
  document.getElementById("diningAlert").classList.toggle("over", over);
  document.getElementById("diningAmount").textContent = formatWon(dining);
  document.getElementById("diningCount").textContent = `${totals.dining.count}건`;
  document.getElementById("diningBar").style.width = `${pct}%`;
  document.getElementById("diningMsg").textContent = over
    ? `${formatWon(dining - DINING_WARNING_THRESHOLD)} 초과`
    : `${formatWon(DINING_WARNING_THRESHOLD - dining)} 남음`;

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

/* ---------------- 내역 리스트 렌더링 ---------------- */

let currentEntries = [];
let entriesExpanded = false;
let openEntryId = null; // 폰에서 눌러서 수정/삭제 버튼이 펼쳐진 기록
const ENTRIES_PREVIEW_COUNT = 5;

export function renderEntries(entries) {
  currentEntries = entries;
  renderEntryListView();
}

function renderEntryRow(e) {
  const { icon, name } = splitCategory(e.category);
  const title = e.memo ? e.memo : name;
  const meta = [e.memo ? name : null, WRITER_LABEL[e.writer] ?? "?", METHOD_LABEL[e.method] ?? ""]
    .filter(Boolean)
    .join(" · ");
  const open = openEntryId === e.id;

  return `
    <div class="entry${open ? " open" : ""}">
      <button class="entry-main" data-action="toggle" data-id="${e.id}" type="button" aria-expanded="${open}">
        <span class="entry-icon">${escapeHtml(icon)}</span>
        <span class="entry-text">
          <span class="entry-title">${escapeHtml(title)}</span>
          <span class="entry-meta">${escapeHtml(meta)}</span>
        </span>
        <span class="entry-amt">${formatWon(e.amount)}</span>
      </button>
      <div class="entry-actions">
        <button class="act-btn" data-action="edit" data-id="${e.id}" type="button">수정</button>
        <button class="act-btn danger" data-action="delete" data-id="${e.id}" type="button">삭제</button>
      </div>
    </div>`;
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

  // 날짜별로 묶어서 표시 (entries는 db.js에서 날짜 내림차순으로 옴)
  const visible = entriesExpanded ? currentEntries : currentEntries.slice(0, ENTRIES_PREVIEW_COUNT);
  let html = "";
  let lastDate = null;
  for (const e of visible) {
    if (e.date !== lastDate) {
      html += `<div class="date-head">${formatDateHeader(e.date)}</div>`;
      lastDate = e.date;
    }
    html += renderEntryRow(e);
  }
  list.innerHTML = html;

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

/* ---------------- 입력 패널 열기/닫기 (폰에서만 의미 있음) ---------------- */

function openPanel() {
  document.getElementById("entryPanel").classList.add("open");
  document.body.classList.add("panel-open");
}

function closePanel() {
  document.getElementById("entryPanel").classList.remove("open");
  document.body.classList.remove("panel-open");
}

/* ---------------- 입력 폼 + 수정 ---------------- */

let formMethod = "cash";
let formWriter = null;
let formLoggedBy = null;
let formCategory = "";
let editingEntryId = null;
let saving = false;

let dateInput, memoInput, amountInput, methodBtns, writerBtns, loggedByBtns, categoryBtns;

function isReady() {
  const amount = Number(amountInput.value);
  const loggedByOk = formWriter !== "gongyong" || formLoggedBy !== null;
  return formCategory !== "" && amount > 0 && formWriter !== null && loggedByOk;
}

function setCategoryActive(cat) {
  formCategory = cat;
  categoryBtns.forEach((b) => {
    const on = b.dataset.category === cat;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
  });
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

function setEditingUI(editing) {
  document.getElementById("editingBadge").classList.toggle("hidden", !editing);
  document.getElementById("panelTitle").textContent = editing ? "기록 수정" : "새 기록";
  document.getElementById("saveBtn").textContent = editing ? "수정 완료" : "저장";
}

function resetFormFully() {
  editingEntryId = null;
  dateInput.value = todayStr();
  setCategoryActive("");
  memoInput.value = "";
  amountInput.value = "";
  setMethodActive("cash");
  setWriterActive(null);
  setEditingUI(false);
}

/**
 * 내역에서 "수정"을 눌렀을 때: 폼에 해당 항목을 채우고 수정 모드로 전환.
 */
function startEditingEntry(entry) {
  editingEntryId = entry.id;
  dateInput.value = entry.date;
  setCategoryActive(entry.category);
  memoInput.value = entry.memo ?? "";
  amountInput.value = entry.amount;
  setMethodActive(entry.method);
  setWriterActive(entry.writer);
  if (entry.writer === "gongyong") {
    setLoggedByActive(entry.loggedBy ?? null);
  }
  setEditingUI(true);
  openPanel();
  if (!narrowQuery.matches) {
    document.getElementById("entryPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function initForm({ onSave, onUpdate }) {
  dateInput = document.getElementById("entryDate");
  memoInput = document.getElementById("entryMemo");
  amountInput = document.getElementById("entryAmount");
  methodBtns = Array.from(document.querySelectorAll(".method-btn"));
  writerBtns = Array.from(document.querySelectorAll(".writer-btn"));
  loggedByBtns = Array.from(document.querySelectorAll(".loggedby-btn"));
  const saveBtn = document.getElementById("saveBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  // 카테고리 버튼을 공통 목록(categories.js)에서 만듦
  const chipWrap = document.getElementById("categoryChips");
  chipWrap.innerHTML = CATEGORIES.map((cat) => {
    const { icon, name } = splitCategory(cat);
    return `<button type="button" class="chip" data-category="${escapeHtml(cat)}" aria-pressed="false">
      <span class="chip-icon">${escapeHtml(icon)}</span><span class="chip-name">${escapeHtml(name)}</span>
    </button>`;
  }).join("");
  categoryBtns = Array.from(chipWrap.querySelectorAll(".chip"));
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => setCategoryActive(btn.dataset.category));
  });

  // 마이너스 기호가 입력되는 즉시 제거 (min="0"만으로는 타이핑 자체를 막지 못함)
  amountInput.addEventListener("input", () => {
    if (amountInput.value.includes("-")) {
      amountInput.value = amountInput.value.replace(/-/g, "");
    }
  });

  // 날짜 기본값: 오늘
  dateInput.value = todayStr();

  methodBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMethodActive(btn.dataset.method));
  });
  writerBtns.forEach((btn) => {
    btn.addEventListener("click", () => setWriterActive(btn.dataset.writer));
  });
  loggedByBtns.forEach((btn) => {
    btn.addEventListener("click", () => setLoggedByActive(btn.dataset.loggedby));
  });

  // 폰: +버튼으로 열고 ✕로 닫기
  document.getElementById("openPanelBtn").addEventListener("click", () => {
    if (!editingEntryId) dateInput.value = dateInput.value || todayStr();
    openPanel();
    setTimeout(() => amountInput.focus(), 150);
  });
  document.getElementById("closePanelBtn").addEventListener("click", () => {
    if (editingEntryId) resetFormFully();
    closePanel();
  });

  // 데스크탑: 금액·내용 칸에서 Enter 누르면 저장
  [amountInput, memoInput].forEach((input) => {
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.isComposing) {
        ev.preventDefault();
        trySave();
      }
    });
  });

  saveBtn.addEventListener("click", () => trySave());

  cancelEditBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    resetFormFully();
    if (narrowQuery.matches) closePanel();
  });

  async function trySave() {
    if (saving) return;
    if (!isReady()) {
      if (!(Number(amountInput.value) > 0)) {
        showToast("금액을 입력해주세요");
      } else if (!formCategory) {
        showToast("카테고리를 골라주세요");
      } else if (!formWriter) {
        showToast("누가 썼는지 선택해주세요");
      } else {
        showToast("실제 기록자를 선택해주세요");
      }
      return;
    }

    saving = true;
    const entry = {
      date: dateInput.value,
      category: formCategory,
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
        openEntryId = null;
      } else {
        await onSave(entry);
        showToast("저장됨 ✓");
        // 다음 입력을 위해 카테고리/내용/금액만 비움 (날짜, 결제수단, 작성자는 유지 → 연달아 기록하기 편함)
        setCategoryActive("");
        memoInput.value = "";
        amountInput.value = "";
      }
      if (narrowQuery.matches) closePanel();
    } catch (err) {
      console.error(err);
      showToast(editingEntryId ? "수정 실패 - 인터넷 연결을 확인해주세요" : "저장 실패 - 인터넷 연결을 확인해주세요");
    } finally {
      saving = false;
    }
  }
}

/**
 * 내역 리스트 클릭 처리: 줄 누르면 수정/삭제 펼침(폰), 수정·삭제 버튼 동작.
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

    if (btn.dataset.action === "toggle") {
      openEntryId = openEntryId === id ? null : id;
      renderEntryListView();
    } else if (btn.dataset.action === "edit") {
      startEditingEntry(entry);
    } else if (btn.dataset.action === "delete") {
      if (confirm("이 지출 기록을 삭제할까요?")) {
        await onDelete(id);
        openEntryId = null;
        showToast("삭제됨");
      }
    }
  });
}
