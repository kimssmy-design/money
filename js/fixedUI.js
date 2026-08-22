// fixedUI.js
// 역할: "고정비 관리" 화면의 렌더링 + 사용자 입력 처리.
// Firestore를 직접 건드리지 않고, 저장/삭제/등록이 필요할 때 콜백을 불러줌.

import { CATEGORIES } from "./categories.js";
import { showToast } from "./ui.js";
import { todayStr } from "./dateUtil.js";

const WRITER_LABEL = { seonyeong: "선영", hyunwoo: "현우", gongyong: "공용" };
const METHOD_LABEL = { cash: "현금", card: "카드" };

let currentTemplates = [];
let editingId = null; // null이면 "추가 모드", 값이 있으면 "수정 모드"

function formatWon(n) {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------------- 템플릿 목록 + 월별 체크리스트 렌더링 ---------------- */

export function renderTemplates(templates) {
  currentTemplates = templates;
  renderTemplateList(templates);
  renderMonthlyChecklist(templates);
  updateRegisterButtonLabel();
}

function renderTemplateList(templates) {
  const list = document.getElementById("templateList");

  if (templates.length === 0) {
    list.innerHTML = `<p class="empty-hint">아직 등록된 고정비 항목이 없어요. 아래 버튼으로 추가해보세요.</p>`;
    return;
  }

  list.innerHTML = templates
    .map(
      (t) => `
      <div class="tpl-row">
        <div class="tag ${t.writer}"></div>
        <div class="meta">
          <div class="name">${escapeHtml(t.name)}</div>
          <div class="sub">${WRITER_LABEL[t.writer] ?? "?"} · ${t.category ?? ""} · ${METHOD_LABEL[t.method] ?? ""}</div>
        </div>
        <div class="amt">${formatWon(t.defaultAmount)}</div>
        <button class="icon-btn" data-action="edit" data-id="${t.id}" type="button">✏️</button>
        <button class="icon-btn" data-action="delete" data-id="${t.id}" type="button">🗑️</button>
      </div>`
    )
    .join("");
}

function renderMonthlyChecklist(templates) {
  const wrap = document.getElementById("monthlyChecklist");

  if (templates.length === 0) {
    wrap.innerHTML = `<p class="empty-hint">등록된 항목이 없어요.</p>`;
    return;
  }

  wrap.innerHTML = templates
    .map(
      (t) => `
      <div class="check-row">
        <input type="checkbox" data-id="${t.id}" class="chk-select">
        <span class="name">${escapeHtml(t.name)}</span>
        <input type="date" data-id="${t.id}" class="chk-date" value="${todayStr()}">
        <input type="number" data-id="${t.id}" class="chk-amount" value="${t.defaultAmount}">
      </div>`
    )
    .join("");
}

function updateRegisterButtonLabel() {
  const checkedCount = document.querySelectorAll(".chk-select:checked").length;
  const btn = document.getElementById("registerCheckedBtn");
  if (btn) btn.textContent = `체크한 ${checkedCount}건 등록하기`;
}

/* ---------------- 템플릿 추가/수정 폼 ---------------- */

function resetForm() {
  editingId = null;
  document.getElementById("tplName").value = "";
  document.getElementById("tplAmount").value = "";
  document.getElementById("tplCategory").selectedIndex = 0;
  document.querySelectorAll(".tpl-writer-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tpl-method-btn").forEach((b) => b.classList.toggle("active", b.dataset.method === "cash"));
}

function openFormForAdd() {
  resetForm();
  document.getElementById("templateForm").classList.remove("hidden");
}

function openFormForEdit(t) {
  resetForm();
  editingId = t.id;
  document.getElementById("tplName").value = t.name;
  document.getElementById("tplAmount").value = t.defaultAmount;
  document.getElementById("tplCategory").value = t.category;
  document.querySelectorAll(".tpl-writer-btn").forEach((b) => b.classList.toggle("active", b.dataset.writer === t.writer));
  document.querySelectorAll(".tpl-method-btn").forEach((b) => b.classList.toggle("active", b.dataset.method === t.method));
  document.getElementById("templateForm").classList.remove("hidden");
}

function closeForm() {
  document.getElementById("templateForm").classList.add("hidden");
  resetForm();
}

/* ---------------- 초기화(이벤트 연결) ---------------- */

export function initFixedUI({ onSaveTemplate, onDeleteTemplate, onRegisterEntries }) {
  // 카테고리 옵션 채우기
  const categorySelect = document.getElementById("tplCategory");
  for (const cat of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  }

  // 담당자/결제수단 토글 버튼
  document.querySelectorAll(".tpl-writer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tpl-writer-btn").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  document.querySelectorAll(".tpl-method-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tpl-method-btn").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  document.getElementById("addTemplateBtn").addEventListener("click", openFormForAdd);
  document.getElementById("tplCancelBtn").addEventListener("click", closeForm);

  document.getElementById("tplSaveBtn").addEventListener("click", async () => {
    const name = document.getElementById("tplName").value.trim();
    const amount = Number(document.getElementById("tplAmount").value);
    const category = document.getElementById("tplCategory").value;
    const writerBtn = document.querySelector(".tpl-writer-btn.active");
    const methodBtn = document.querySelector(".tpl-method-btn.active");

    if (!name || !category || !writerBtn || !amount) {
      showToast("이름·담당자·카테고리·금액을 모두 입력해주세요");
      return;
    }

    const template = {
      name,
      writer: writerBtn.dataset.writer,
      category,
      method: methodBtn.dataset.method,
      defaultAmount: amount
    };

    try {
      await onSaveTemplate(editingId, template);
      showToast("저장됨 ✓");
      closeForm();
    } catch (err) {
      console.error(err);
      showToast("저장 실패 - 인터넷 연결을 확인해주세요");
    }
  });

  // 템플릿 목록의 수정/삭제 버튼 (이벤트 위임)
  document.getElementById("templateList").addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const tpl = currentTemplates.find((t) => t.id === id);
    if (!tpl) return;

    if (btn.dataset.action === "edit") {
      openFormForEdit(tpl);
    } else if (btn.dataset.action === "delete") {
      if (confirm(`"${tpl.name}" 항목을 삭제할까요?`)) {
        await onDeleteTemplate(id);
        showToast("삭제됨");
      }
    }
  });

  // 체크리스트 체크박스 변화 → 등록 버튼 문구 갱신
  document.getElementById("monthlyChecklist").addEventListener("change", (ev) => {
    if (ev.target.classList.contains("chk-select")) updateRegisterButtonLabel();
  });

  // 체크한 항목 일괄 등록
  document.getElementById("registerCheckedBtn").addEventListener("click", async () => {
    const checked = Array.from(document.querySelectorAll(".chk-select:checked"));
    if (checked.length === 0) {
      showToast("체크한 항목이 없어요");
      return;
    }

    const entries = checked.map((chk) => {
      const id = chk.dataset.id;
      const tpl = currentTemplates.find((t) => t.id === id);
      const dateInput = document.querySelector(`.chk-date[data-id="${id}"]`);
      const amountInput = document.querySelector(`.chk-amount[data-id="${id}"]`);
      return {
        date: dateInput.value,
        category: tpl.category,
        amount: Number(amountInput.value),
        method: tpl.method,
        writer: tpl.writer
      };
    });

    try {
      await onRegisterEntries(entries);
      showToast(`${entries.length}건 등록됨 ✓`);
      document.querySelectorAll(".chk-select:checked").forEach((chk) => (chk.checked = false));
      updateRegisterButtonLabel();
    } catch (err) {
      console.error(err);
      showToast("등록 실패 - 인터넷 연결을 확인해주세요");
    }
  });

  // 화면 전환 (메인 ↔ 고정비 관리)
  document.getElementById("openFixedScreen").addEventListener("click", (ev) => {
    ev.preventDefault();
    document.getElementById("screenMain").classList.add("hidden");
    document.getElementById("screenFixed").classList.remove("hidden");
  });
  document.getElementById("backToMain").addEventListener("click", () => {
    document.getElementById("screenFixed").classList.add("hidden");
    document.getElementById("screenMain").classList.remove("hidden");
  });
}
