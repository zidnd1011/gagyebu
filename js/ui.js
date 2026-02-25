/**
 * ui.js - Reusable UI rendering helpers
 */

/** Show a brief toast message */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2000);
}

/** Render breakdown rows (category → amount) inside a container element */
function renderBreakdown(container, byCategory, type) {
  container.innerHTML = '';
  const entries = Object.entries(byCategory);
  if (!entries.length) {
    container.innerHTML = '<div class="empty-msg">내역이 없습니다</div>';
    return;
  }
  entries.sort((a, b) => b[1] - a[1]);
  entries.forEach(([cat, amt]) => {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <span class="breakdown-cat">${cat}</span>
      <span class="breakdown-amount-${type}">${formatWon(amt)}</span>
    `;
    container.appendChild(row);
  });
}

/**
 * Draw a donut chart on a <canvas> using the Canvas 2D API (no external deps).
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{label, value, color}>} slices
 */
function drawDonutChart(canvas, slices) {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.parentElement.clientWidth, 200);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) {
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 8 - size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;
  slices.forEach(sl => {
    const angle = (sl.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.arc(size / 2, size / 2, size / 2 - 8, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = sl.color;
    ctx.fill();
    startAngle += angle;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8 - size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

/** Render the category legend below the donut chart */
function renderCategoryLegend(container, slices, total) {
  container.innerHTML = '';
  if (!slices.length) {
    container.innerHTML = '<div class="empty-msg">내역이 없습니다</div>';
    return;
  }
  slices.forEach(sl => {
    const pct = total ? Math.round((sl.value / total) * 100) : 0;
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background:${sl.color}"></span>
      <span class="legend-cat">${sl.label}</span>
      <span class="legend-pct">${pct}%</span>
      <span class="legend-amt">${formatWon(sl.value)}</span>
    `;
    container.appendChild(item);
  });
}

/** Group entries by date (descending) and render history items */
function renderHistory(container, entries, onItemClick) {
  container.innerHTML = '';
  if (!entries.length) {
    container.innerHTML = '<div class="empty-msg" style="text-align:center;padding:40px 0;color:#757575;">내역이 없습니다</div>';
    return;
  }

  // Sort by date desc, then createdAt desc
  const sorted = [...entries].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  // Group by date
  const groups = {};
  sorted.forEach(e => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const group = document.createElement('div');
    group.className = 'history-date-group';

    const [, m, d] = date.split('-').map(Number);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dow = dayNames[new Date(date).getDay()];
    const header = document.createElement('div');
    header.className = 'history-date-header';
    header.textContent = `${m}월 ${d}일 (${dow})`;
    group.appendChild(header);

    groups[date].forEach(e => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <span class="history-type-dot ${e.type}"></span>
        <div class="history-info">
          <div class="history-cat">${e.category}</div>
          ${e.memo ? `<div class="history-memo">${e.memo}</div>` : ''}
        </div>
        <span class="history-amount ${e.type}">${e.type === 'expense' ? '-' : '+'}${formatWon(e.amount)}</span>
      `;
      item.addEventListener('click', () => onItemClick(e));
      group.appendChild(item);
    });

    container.appendChild(group);
  });
}
