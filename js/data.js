/**
 * data.js - Data layer: LocalStorage CRUD for 가계부 entries
 *
 * Storage key: 'gagyebu_entries'
 * Entry schema:
 *   { id, date (YYYY-MM-DD), type ('income'|'expense'), category, amount, memo, createdAt }
 */

const STORAGE_KEY = 'gagyebu_entries';

const CATEGORIES = {
  income: ['엄마 월급여', '아빠 월급여'],
  expense: ['식비', '생필품비', '의료비', '세금', '보험', '이자', '기타'],
};

// Distinct colors for chart slices
const CATEGORY_COLORS = [
  '#3f51b5', '#2196f3', '#00bcd4', '#4caf50',
  '#ff9800', '#f44336', '#9c27b0', '#009688',
  '#ff5722', '#607d8b',
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function addEntry({ date, type, category, amount, memo }) {
  const entries = loadEntries();
  const entry = {
    id: generateId(),
    date,
    type,
    category,
    amount: Number(amount),
    memo: memo || '',
    createdAt: Date.now(),
  };
  entries.push(entry);
  saveEntries(entries);
  return entry;
}

function deleteEntry(id) {
  const entries = loadEntries().filter(e => e.id !== id);
  saveEntries(entries);
}

/** Returns entries for a given YYYY-MM month string */
function getEntriesByMonth(yearMonth) {
  return loadEntries().filter(e => e.date.startsWith(yearMonth));
}

/** Returns entries for a given YYYY-MM-DD date string */
function getEntriesByDate(date) {
  return loadEntries().filter(e => e.date === date);
}

/**
 * Computes monthly totals and per-category sums.
 * Returns { incomeTotal, expenseTotal, balance, incomeByCategory, expenseByCategory }
 */
function getMonthlySummary(yearMonth) {
  const entries = getEntriesByMonth(yearMonth);
  let incomeTotal = 0;
  let expenseTotal = 0;
  const incomeByCategory = {};
  const expenseByCategory = {};

  for (const e of entries) {
    if (e.type === 'income') {
      incomeTotal += e.amount;
      incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
    } else {
      expenseTotal += e.amount;
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }
  }

  return {
    incomeTotal,
    expenseTotal,
    balance: incomeTotal - expenseTotal,
    incomeByCategory,
    expenseByCategory,
  };
}

/** Format number as Korean won string: 1234567 → '1,234,567원' */
function formatWon(amount) {
  return amount.toLocaleString('ko-KR') + '원';
}

/** Today as YYYY-MM-DD in local time */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD → YYYY-MM */
function toYearMonth(dateStr) {
  return dateStr.slice(0, 7);
}

/** Navigate month: direction = +1 or -1 */
function addMonth(yearMonth, direction) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + direction, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** YYYY-MM → '2025년 1월' */
function formatYearMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y}년 ${m}월`;
}
