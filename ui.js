// ui.js
// 역할: 화면 그리기 + 사용자 입력 처리(자동저장 포함).
// Firestore를 직접 건드리지 않고, "저장해야 할 때 콜백을 불러주는" 방식으로만 동작.

const WRITER_LABEL = { seonyeong: "선영", hyunwoo: "현우", gongyong: "공용" };
const METHOD_LABEL = { cash: "현금", card: "카드" };

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
}

/* ---------------- 내역 리스트 렌더링 ---------------- */

export function renderEntries(entries) {
  const list = document.getElementById("entryList");
  const count = document.getElementById("entryCount");
  count.textContent = `${entries.length}건`;

  if (entries.length === 0) {
    list.innerHTML = `<p class="empty">선택한 기간에 기록된 지출이 없어요.</p>`;
    return;
  }

  list.innerHTML = entries
    .map(
      (e) => `
      <div class="entry">
        <div class="tag ${e.writer}"></div>
        <div class="meta">
          <div class="cat">${escapeHtml(e.category)}</div>
          <div class="sub">${formatDateLabel(e.date)} · ${WRITER_LABEL[e.writer] ?? "?"}</div>
        </div>
        <div>
          <span class="amt">${formatWon(e.amount)}</span>
          <span class="method">${METHOD_LABEL[e.method] ?? ""}</span>
        </div>
      </div>`
    )
    .join("");
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

/* ---------------- 입력 폼 + 자동저장 ---------------- */

export function initForm(onSave) {
  const dateInput = document.getElementById("entryDate");
  const categoryInput = document.getElementById("entryCategory");
  const amountInput = document.getElementById("entryAmount");
  const methodBtns = Array.from(document.querySelectorAll(".method-btn"));
  const writerBtns = Array.from(document.querySelectorAll(".writer-btn"));
  const saveBtn = document.getElementById("saveBtn");

  // 날짜 기본값: 오늘
  dateInput.value = new Date().toISOString().slice(0, 10);

  let method = "cash";
  let writer = null;
  let saving = false;

  methodBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      method = btn.dataset.method;
      methodBtns.forEach((b) => b.classList.toggle("active", b === btn));
      maybeAutoSave();
    });
  });

  writerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      writer = btn.dataset.writer;
      writerBtns.forEach((b) => b.classList.toggle("active", b === btn));
      maybeAutoSave();
    });
  });

  // 금액/카테고리는 입력을 마쳤을 때(change: blur 또는 엔터)만 자동저장 검사
  // → 타이핑 중간마다 저장하지 않도록 함
  categoryInput.addEventListener("change", maybeAutoSave);
  amountInput.addEventListener("change", maybeAutoSave);
  amountInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") amountInput.blur(); // 엔터 치면 change 이벤트 발생
  });

  saveBtn.addEventListener("click", () => trySave(true));

  function isReady() {
    const amount = Number(amountInput.value);
    return categoryInput.value.trim() !== "" && amount > 0 && writer !== null;
  }

  function maybeAutoSave() {
    if (isReady()) trySave(false);
  }

  async function trySave(manual) {
    if (saving) return;
    if (!isReady()) {
      if (manual) {
        showToast(!writer ? "누가 썼는지 선택해주세요" : "카테고리와 금액을 입력해주세요");
      }
      return;
    }

    saving = true;
    const entry = {
      date: dateInput.value,
      category: categoryInput.value.trim(),
      amount: Number(amountInput.value),
      method,
      writer
    };

    try {
      await onSave(entry);
      showToast("저장됨 ✓");
      // 다음 입력을 위해 카테고리/금액만 비움 (날짜, 결제수단, 작성자는 유지 → 같은 사람이 연달아 기록하기 편함)
      categoryInput.value = "";
      amountInput.value = "";
      categoryInput.focus();
    } catch (err) {
      console.error(err);
      showToast("저장 실패 - 인터넷 연결을 확인해주세요");
    } finally {
      saving = false;
    }
  }
}
