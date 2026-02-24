/**
 * app.js - Main controller: wires together DOM events, data layer, and UI renderers
 */

// ===== State =====
let currentType = 'income'; // 'income' | 'expense'
let selectedEntryId = null;

// Separate month states for each tab that has month navigation
const monthState = {
  monthly: toYearMonth(todayStr()),
  category: toYearMonth(todayStr()),
  history: toYearMonth(todayStr()),
};

// Category chart state
let catChartType = 'expense';

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initTabs();
  initMonthNavs();
  initCategoryTypeTabs();
  initModal();
  updateHeaderMonth();
  refreshAll();
});

// ===== Tabs =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Refresh the activated tab
      if (btn.dataset.tab === 'monthly') renderMonthly();
      if (btn.dataset.tab === 'category') renderCategory();
      if (btn.dataset.tab === 'history') renderHistoryTab();
      if (btn.dataset.tab === 'input') renderTodaySummary();
    });
  });
}

// ===== Header month =====
function updateHeaderMonth() {
  document.getElementById('header-month').textContent = formatYearMonth(toYearMonth(todayStr()));
}

// ===== Entry Form =====
function initForm() {
  // Set today's date
  document.getElementById('entry-date').value = todayStr();

  // Type toggle
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      updateCategorySelect();
    });
  });

  updateCategorySelect();

  document.getElementById('entry-form').addEventListener('submit', e => {
    e.preventDefault();
    const date = document.getElementById('entry-date').value;
    const category = document.getElementById('entry-category').value;
    const amount = parseInt(document.getElementById('entry-amount').value, 10);
    const memo = document.getElementById('entry-memo').value.trim();

    if (!date || !category || !amount || amount <= 0) {
      showToast('날짜, 카테고리, 금액을 확인해주세요.');
      return;
    }

    addEntry({ date, type: currentType, category, amount, memo });
    document.getElementById('entry-amount').value = '';
    document.getElementById('entry-memo').value = '';
    showToast('저장되었습니다.');
    renderTodaySummary();
  });
}

function updateCategorySelect() {
  const sel = document.getElementById('entry-category');
  sel.innerHTML = '';
  CATEGORIES[currentType].forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

// ===== Today Summary =====
function renderTodaySummary() {
  const today = document.getElementById('entry-date').value || todayStr();
  const entries = getEntriesByDate(today);
  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  document.getElementById('today-income').textContent = formatWon(income);
  document.getElementById('today-expense').textContent = formatWon(expense);
}

// Watch date change to refresh today summary
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('entry-date').addEventListener('change', renderTodaySummary);
});

// ===== Month Navs =====
function initMonthNavs() {
  // Monthly tab
  document.getElementById('prev-month').addEventListener('click', () => {
    monthState.monthly = addMonth(monthState.monthly, -1);
    renderMonthly();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    monthState.monthly = addMonth(monthState.monthly, +1);
    renderMonthly();
  });

  // Category tab
  document.getElementById('cat-prev-month').addEventListener('click', () => {
    monthState.category = addMonth(monthState.category, -1);
    renderCategory();
  });
  document.getElementById('cat-next-month').addEventListener('click', () => {
    monthState.category = addMonth(monthState.category, +1);
    renderCategory();
  });

  // History tab
  document.getElementById('hist-prev-month').addEventListener('click', () => {
    monthState.history = addMonth(monthState.history, -1);
    renderHistoryTab();
  });
  document.getElementById('hist-next-month').addEventListener('click', () => {
    monthState.history = addMonth(monthState.history, +1);
    renderHistoryTab();
  });
}

// ===== Monthly Tab =====
function renderMonthly() {
  const ym = monthState.monthly;
  document.getElementById('current-month-label').textContent = formatYearMonth(ym);

  const { incomeTotal, expenseTotal, balance, incomeByCategory, expenseByCategory } =
    getMonthlySummary(ym);

  document.getElementById('monthly-income').textContent = formatWon(incomeTotal);
  document.getElementById('monthly-expense').textContent = formatWon(expenseTotal);

  const balEl = document.getElementById('monthly-balance');
  balEl.textContent = (balance >= 0 ? '+' : '') + formatWon(Math.abs(balance));
  balEl.className = 'amount-balance ' + (balance >= 0 ? 'positive' : 'negative');

  renderBreakdown(document.getElementById('monthly-income-breakdown'), incomeByCategory, 'income');
  renderBreakdown(document.getElementById('monthly-expense-breakdown'), expenseByCategory, 'expense');
}

// ===== Category Tab =====
function initCategoryTypeTabs() {
  document.querySelectorAll('.cat-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      catChartType = btn.dataset.type;
      renderCategory();
    });
  });
}

function renderCategory() {
  const ym = monthState.category;
  document.getElementById('cat-month-label').textContent = formatYearMonth(ym);

  const { incomeTotal, expenseTotal, incomeByCategory, expenseByCategory } =
    getMonthlySummary(ym);

  const byCategory = catChartType === 'income' ? incomeByCategory : expenseByCategory;
  const total = catChartType === 'income' ? incomeTotal : expenseTotal;

  const cats = CATEGORIES[catChartType];
  const slices = cats
    .filter(cat => byCategory[cat])
    .map((cat, i) => ({
      label: cat,
      value: byCategory[cat],
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Also include any unlisted categories
  Object.keys(byCategory).forEach(cat => {
    if (!cats.includes(cat)) {
      slices.push({ label: cat, value: byCategory[cat], color: CATEGORY_COLORS[slices.length % CATEGORY_COLORS.length] });
    }
  });

  drawDonutChart(document.getElementById('category-chart'), slices);
  renderCategoryLegend(document.getElementById('category-legend'), slices, total);

  // Per-category list (all entries for each category)
  const catList = document.getElementById('category-list');
  catList.innerHTML = '';
  if (!slices.length) {
    catList.innerHTML = '<div class="empty-msg">내역이 없습니다</div>';
    return;
  }
  slices.forEach(sl => {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <span class="breakdown-cat">${sl.label}</span>
      <span class="breakdown-amount-${catChartType}">${formatWon(sl.value)}</span>
    `;
    catList.appendChild(row);
  });
}

// ===== History Tab =====
function renderHistoryTab() {
  const ym = monthState.history;
  document.getElementById('hist-month-label').textContent = formatYearMonth(ym);
  const entries = getEntriesByMonth(ym);
  renderHistory(document.getElementById('history-list'), entries, askDelete);
}

// ===== Delete Modal =====
function initModal() {
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    if (selectedEntryId) {
      deleteEntry(selectedEntryId);
      showToast('삭제되었습니다.');
      closeModal();
      refreshAll();
    }
  });
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
}

function askDelete(id) {
  selectedEntryId = id;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  selectedEntryId = null;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ===== Global Refresh =====
function refreshAll() {
  renderTodaySummary();
  renderMonthly();
  renderCategory();
  renderHistoryTab();
}
