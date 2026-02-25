/**
 * data.js - Data layer: Supabase CRUD for 가계부 entries
 *
 * Table: entries
 *   { id, date (YYYY-MM-DD), type ('income'|'expense'), category, amount, memo, created_at }
 */

const SUPABASE_URL = 'https://qnfaapoztwowgkrlozuj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZmFhcG96dHdvd2drcmxvenVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDIwMTYsImV4cCI6MjA4NzU3ODAxNn0.pZV619e3yDj5g23KuliKP5VOrTdY_7JaQ4rdSt2v5xc';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = {
  income: ['엄마 월급여', '아빠 월급여'],
  expense: ['식비', '생필품비', '의료비', '세금', '보험', '이자', '기타'],
};

const CATEGORY_COLORS = [
  '#3f51b5', '#2196f3', '#00bcd4', '#4caf50',
  '#ff9800', '#f44336', '#9c27b0', '#009688',
  '#ff5722', '#607d8b',
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** DB row → JS entry (snake_case → camelCase) */
function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    category: row.category,
    amount: row.amount,
    memo: row.memo || '',
    createdAt: row.created_at,
  };
}

async function addEntry({ date, type, category, amount, memo }) {
  const { data, error } = await db
    .from('entries')
    .insert({
      id: generateId(),
      date,
      type,
      category,
      amount: Number(amount),
      memo: memo || '',
      created_at: Date.now(),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

async function updateEntry(id, { date, type, category, amount, memo }) {
  const { data, error } = await db
    .from('entries')
    .update({ date, type, category, amount: Number(amount), memo: memo || '' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

async function deleteEntry(id) {
  const { error } = await db.from('entries').delete().eq('id', id);
  if (error) throw error;
}

/** Returns entries for a given YYYY-MM month string */
async function getEntriesByMonth(yearMonth) {
  const { data, error } = await db
    .from('entries')
    .select('*')
    .like('date', yearMonth + '%');
  if (error) throw error;
  return data.map(rowToEntry);
}

/** Returns entries for a given YYYY-MM-DD date string */
async function getEntriesByDate(date) {
  const { data, error } = await db
    .from('entries')
    .select('*')
    .eq('date', date);
  if (error) throw error;
  return data.map(rowToEntry);
}

/** Computes monthly totals and per-category sums */
async function getMonthlySummary(yearMonth) {
  const entries = await getEntriesByMonth(yearMonth);
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
