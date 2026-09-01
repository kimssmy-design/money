// statsUI.js
// 역할: "지출 통계분석" 화면의 렌더링 + 사용자 입력 처리.
// 계산은 stats.js가, 데이터 로딩은 main.js가 담당하고 여기는 화면만 그림.

const WRITER_LABEL = { seonyeong: "선영", hyunwoo: "현우", gongyong: "공용" };

function formatWon(n) {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

/**
 * 화면 전환(메인 ↔ 통계분석) + 기간 선택 컨트롤 초기화.
 * onRangeChange({preset} 또는 {preset:"custom", start, end})가 호출되면
 * main.js 쪽에서 다시 계산해서 renderStats()를 불러주는 구조.
 */
export function initStatsUI(onRangeChange) {
  document.getElementById("openStatsScreen").addEventListener("click", (ev) => {
    ev.preventDefault();
    document.getElementById("screenMain").classList.add("hidden");
    document.getElementById("screenStats").classList.remove("hidden");
  });
  document.getElementById("backToMainFromStats").addEventListener("click", () => {
    document.getElementById("screenStats").classList.add("hidden");
    document.getElementById("screenMain").classList.remove("hidden");
  });

  const presetSelect = document.getElementById("statsRangePreset");
  const customWrap = document.getElementById("statsCustomRangeWrap");
  const customStart = document.getElementById("statsCustomStart");
  const customEnd = document.getElementById("statsCustomEnd");
  const customApply = document.getElementById("statsCustomApply");

  presetSelect.addEventListener("change", () => {
    if (presetSelect.value === "custom") {
      customWrap.classList.remove("hidden");
      return;
    }
    customWrap.classList.add("hidden");
    onRangeChange({ preset: presetSelect.value });
  });

  customApply.addEventListener("click", () => {
    if (!customStart.value || !customEnd.value) return;
    onRangeChange({ preset: "custom", start: customStart.value, end: customEnd.value });
  });
}

/**
 * data = {
 *   range: {start, end},
 *   total: number,
 *   prevTotal: number,
 *   byWriter: { seonyeong, hyunwoo, gongyong },
 *   categoryBreakdown: [{category, amount, count, percent}, ...],
 *   monthlyAvg: { average, monthCount } | null
 * }
 */
export function renderStats(data) {
  document.getElementById("statsRangeLabel").textContent =
    `${data.range.start.replaceAll("-", ".")} – ${data.range.end.replaceAll("-", ".")}`;
  document.getElementById("statsTotalAmount").textContent = formatWon(data.total);

  // 직전 같은 기간 대비 증감
  const compareEl = document.getElementById("statsCompare");
  const diff = data.total - data.prevTotal;
  if (data.prevTotal === 0 && data.total === 0) {
    compareEl.innerHTML = "직전 같은 기간 대비 - (데이터 없음)";
  } else {
    const percent = data.prevTotal > 0 ? Math.abs((diff / data.prevTotal) * 100) : 100;
    const sign = diff > 0 ? "▲" : diff < 0 ? "▼" : "-";
    const cls = diff > 0 ? "up" : diff < 0 ? "down" : "";
    compareEl.innerHTML = `직전 같은 기간(${formatWon(data.prevTotal)}) 대비 <span class="${cls}">${sign} ${formatWon(Math.abs(diff))} (${percent.toFixed(1)}%)</span>`;
  }

  // 월평균
  const avgEl = document.getElementById("statsAvgAmount");
  if (data.monthlyAvg) {
    avgEl.innerHTML = `${formatWon(data.monthlyAvg.average)} <span class="sub">최근 ${data.monthlyAvg.monthCount}개월 기준</span>`;
  } else {
    avgEl.textContent = "데이터가 더 쌓이면 계산돼요 (완료된 달이 아직 없어요)";
  }

  // 카테고리별 지출 (숫자 + 막대그래프)
  const catList = document.getElementById("categoryBreakdownList");
  const nonZero = data.categoryBreakdown.filter((c) => c.amount > 0);
  if (nonZero.length === 0) {
    catList.innerHTML = `<p class="empty-hint">선택한 기간에 기록된 지출이 없어요.</p>`;
  } else {
    catList.innerHTML = nonZero
      .map(
        (c) => `
        <div class="cat-bar-row">
          <div class="cat-bar-top">
            <span class="cat-name">${c.category}</span>
            <span class="cat-amt">${formatWon(c.amount)} (${c.percent.toFixed(1)}%)</span>
          </div>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${c.percent}%"></div></div>
          <div class="cat-bar-count">${c.count}건</div>
        </div>`
      )
      .join("");
  }

  // 작성자별 지출
  const writerList = document.getElementById("writerBreakdownList");
  writerList.innerHTML = ["seonyeong", "hyunwoo", "gongyong"]
    .map(
      (w) => `
      <div class="writer-stat-row">
        <div class="tag ${w}"></div>
        <div class="name">${WRITER_LABEL[w]}</div>
        <div class="amt">${formatWon(data.byWriter[w])}</div>
      </div>`
    )
    .join("");
}
