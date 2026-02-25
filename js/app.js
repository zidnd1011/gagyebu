/**
 * app.js - Main controller: wires together DOM events, data layer, and UI renderers
 */

// ===== State =====
let currentType = 'income';
let editType = 'income';
let selectedEntry = null;

const monthState = {
  monthly: toYearMonth(todayStr()),
  category: toYearMonth(todayStr()),
  history: toYearMonth(todayStr()),
};

let catChartType = 'expense';

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initTabs();
  initMonthNavs();
  initCategoryTypeTabs();
  initActionModal();
  initDeleteModal();
  initEditModal();
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
  document.getElementById('entry-date').value = todayStr();

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      updateCategorySelect();
    });
  });

  updateCategorySelect();

  document.getElementById('entry-form').addEventListener('submit', async e => {
    e.preventDefault();
    const date = document.getElementById('entry-date').value;
    const category = document.getElementById('entry-category').value;
    const amount = parseInt(document.getElementById('entry-amount').value, 10);
    const memo = document.getElementById('entry-memo').value.trim();

    if (!date || !category || !amount || amount <= 0) {
      showToast('날짜, 카테고리, 금액을 확인해주세요.');
      return;
    }

    try {
      await addEntry({ date, type: currentType, category, amount, memo });
      document.getElementById('entry-amount').value = '';
      document.getElementById('entry-memo').value = '';
      showToast('저장되었습니다.');
      renderTodaySummary();
    } catch (err) {
      showToast('저장 실패: ' + err.message);
    }
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
async function renderTodaySummary() {
  const today = document.getElementById('entry-date').value || todayStr();
  try {
    const entries = await getEntriesByDate(today);
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    document.getElementById('today-income').textContent = formatWon(income);
    document.getElementById('today-expense').textContent = formatWon(expense);
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('entry-date').addEventListener('change', renderTodaySummary);
});

// ===== Month Navs =====
function initMonthNavs() {
  document.getElementById('prev-month').addEventListener('click', () => {
    monthState.monthly = addMonth(monthState.monthly, -1);
    renderMonthly();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    monthState.monthly = addMonth(monthState.monthly, +1);
    renderMonthly();
  });

  document.getElementById('cat-prev-month').addEventListener('click', () => {
    monthState.category = addMonth(monthState.category, -1);
    renderCategory();
  });
  document.getElementById('cat-next-month').addEventListener('click', () => {
    monthState.category = addMonth(monthState.category, +1);
    renderCategory();
  });

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
async function renderMonthly() {
  const ym = monthState.monthly;
  document.getElementById('current-month-label').textContent = formatYearMonth(ym);
  try {
    const { incomeTotal, expenseTotal, balance, incomeByCategory, expenseByCategory } =
      await getMonthlySummary(ym);

    document.getElementById('monthly-income').textContent = formatWon(incomeTotal);
    document.getElementById('monthly-expense').textContent = formatWon(expenseTotal);

    const balEl = document.getElementById('monthly-balance');
    balEl.textContent = (balance >= 0 ? '+' : '') + formatWon(Math.abs(balance));
    balEl.className = 'amount-balance ' + (balance >= 0 ? 'positive' : 'negative');

    renderBreakdown(document.getElementById('monthly-income-breakdown'), incomeByCategory, 'income');
    renderBreakdown(document.getElementById('monthly-expense-breakdown'), expenseByCategory, 'expense');
  } catch (err) {
    console.error(err);
  }
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

async function renderCategory() {
  const ym = monthState.category;
  document.getElementById('cat-month-label').textContent = formatYearMonth(ym);
  try {
    const { incomeTotal, expenseTotal, incomeByCategory, expenseByCategory } =
      await getMonthlySummary(ym);

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

    Object.keys(byCategory).forEach(cat => {
      if (!cats.includes(cat)) {
        slices.push({ label: cat, value: byCategory[cat], color: CATEGORY_COLORS[slices.length % CATEGORY_COLORS.length] });
      }
    });

    drawDonutChart(document.getElementById('category-chart'), slices);
    renderCategoryLegend(document.getElementById('category-legend'), slices, total);

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
  } catch (err) {
    console.error(err);
  }
}

// ===== History Tab =====
async function renderHistoryTab() {
  const ym = monthState.history;
  document.getElementById('hist-month-label').textContent = formatYearMonth(ym);
  try {
    const entries = await getEntriesByMonth(ym);
    renderHistory(document.getElementById('history-list'), entries, openActionModal);
  } catch (err) {
    console.error(err);
  }
}

// ===== Action Modal (수정 / 삭제 선택) =====
function initActionModal() {
  document.getElementById('action-edit-btn').addEventListener('click', () => {
    closeActionModal();
    openEditModal(selectedEntry);
  });
  document.getElementById('action-delete-btn').addEventListener('click', () => {
    closeActionModal();
    openDeleteModal();
  });
  document.getElementById('action-cancel-btn').addEventListener('click', closeActionModal);
  document.getElementById('action-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('action-overlay')) closeActionModal();
  });
}

function openActionModal(entry) {
  selectedEntry = entry;
  const sign = entry.type === 'expense' ? '-' : '+';
  document.getElementById('action-desc').textContent =
    `${entry.date}  ${entry.category}  ${sign}${formatWon(entry.amount)}`;
  document.getElementById('action-overlay').classList.remove('hidden');
}

function closeActionModal() {
  document.getElementById('action-overlay').classList.add('hidden');
}

// ===== Delete Modal =====
function initDeleteModal() {
  document.getElementById('modal-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('modal-confirm').addEventListener('click', async () => {
    if (!selectedEntry) return;
    try {
      await deleteEntry(selectedEntry.id);
      showToast('삭제되었습니다.');
      closeDeleteModal();
      selectedEntry = null;
      await refreshAll();
    } catch (err) {
      showToast('삭제 실패: ' + err.message);
    }
  });
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeDeleteModal();
  });
}

function openDeleteModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ===== Edit Modal =====
function initEditModal() {
  document.querySelectorAll('.edit-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.edit-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editType = btn.dataset.type;
      updateEditCategorySelect();
    });
  });

  document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('edit-overlay')) closeEditModal();
  });

  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const date = document.getElementById('edit-date').value;
    const category = document.getElementById('edit-category').value;
    const amount = parseInt(document.getElementById('edit-amount').value, 10);
    const memo = document.getElementById('edit-memo').value.trim();

    if (!date || !category || !amount || amount <= 0) {
      showToast('날짜, 카테고리, 금액을 확인해주세요.');
      return;
    }

    try {
      await updateEntry(selectedEntry.id, { date, type: editType, category, amount, memo });
      showToast('수정되었습니다.');
      closeEditModal();
      selectedEntry = null;
      await refreshAll();
    } catch (err) {
      showToast('수정 실패: ' + err.message);
    }
  });
}

function updateEditCategorySelect() {
  const sel = document.getElementById('edit-category');
  sel.innerHTML = '';
  CATEGORIES[editType].forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function openEditModal(entry) {
  editType = entry.type;

  document.querySelectorAll('.edit-toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.edit-toggle-btn[data-type="${entry.type}"]`).classList.add('active');

  updateEditCategorySelect();

  document.getElementById('edit-date').value = entry.date;
  document.getElementById('edit-category').value = entry.category;
  document.getElementById('edit-amount').value = entry.amount;
  document.getElementById('edit-memo').value = entry.memo || '';

  document.getElementById('edit-overlay').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-overlay').classList.add('hidden');
}

// ===== Global Refresh =====
async function refreshAll() {
  await Promise.all([
    renderTodaySummary(),
    renderMonthly(),
    renderCategory(),
    renderHistoryTab(),
  ]);
}
