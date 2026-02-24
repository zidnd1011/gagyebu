# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

This is a zero-build, static web app. Open `index.html` directly in a browser or serve it with any static server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

No install, no build step, no dependencies.

## Architecture

Three vanilla JS files loaded in order via `<script>` tags in `index.html`. Each file must be loaded before the next because they share globals via the `window` scope (no modules):

1. **`js/data.js`** — Pure data layer. All LocalStorage reads/writes, business logic (summaries, filtering), and utility functions (`formatWon`, `todayStr`, `addMonth`, etc.). Exposes functions as globals: `addEntry`, `deleteEntry`, `getEntriesByMonth`, `getEntriesByDate`, `getMonthlySummary`, and constants `CATEGORIES`, `CATEGORY_COLORS`.

2. **`js/ui.js`** — Stateless rendering helpers. Calls `formatWon` (from data.js). Exports: `showToast`, `renderBreakdown`, `drawDonutChart` (custom Canvas 2D donut, no chart library), `renderCategoryLegend`, `renderHistory`.

3. **`js/app.js`** — Controller. Owns all DOM event listeners and mutable state (`currentType`, `monthState`, `catChartType`, `selectedEntryId`). Calls data.js and ui.js functions. Entry point is `DOMContentLoaded`.

## Data Model

LocalStorage key: `gagyebu_entries` — a JSON array of entry objects:

```js
{ id, date, type, category, amount, memo, createdAt }
// date: 'YYYY-MM-DD', type: 'income'|'expense', amount: Number (integer won)
```

`CATEGORIES` in `data.js` is the authoritative list of income/expense category names. Adding or renaming categories there is the only change needed — the form select, chart, and breakdowns all read from it dynamically.

## Tab State

Each of the three navigable tabs (월별, 카테고리, 내역) has its own independent month in `monthState` object inside `app.js`. The 입력 tab shows a summary for the currently selected date in the form (not a month).

## Chart

The donut chart in the 카테고리 tab uses raw Canvas 2D API — no external charting library. `drawDonutChart` in `ui.js` handles HiDPI scaling via `devicePixelRatio`. The center hole is drawn by painting a white circle on top of the filled arcs.
