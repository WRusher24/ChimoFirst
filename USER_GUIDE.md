# Chimo (כימו) — User Guide

A quick walkthrough of the daily workflows: signing in, managing employees and formulas (incl. quality-control steps), running concurrent batches, and exporting the production history.

> The entire interface is in Hebrew and fully right-to-left. Employees may still
> type product names, notes, and names in Hebrew, English, or any mix. All
> numbers (timers, batch numbers, dates, quantities) always appear in standard
> Western digits (0–9).

---

## 1. Signing In (Company Login)

Every visitor must pass the **secure company login screen** before any factory screen is reachable:

1. Open the app link — you are redirected to **כניסה ארגונית מאובטחת**.
2. Enter the master **company username and password** (provided by your administrator).
3. The session lasts 12 hours on that device. Use **יציאה מהמערכת** (bottom of the sidebar) to sign out.

### Formula Management is extra-protected (strict re-authentication)

Clicking **מתכונים** in the sidebar — **every single time** — opens a verification screen asking for the **master company password from scratch**. There is no "remember me": the moment you navigate away from the formulas section, it locks itself again instantly, so floor workers can never stumble into (or alter) recipe management.

## 2. Navigation

| Section (Hebrew) | Path | Purpose | Access |
| --- | --- | --- | --- |
| **לוח ייצור** (Dashboard) | `/` | Live grid of active batches with countdown timers | All logged-in staff |
| **מתכונים** (Formulas) | `/formulas` | Recipes: ingredients, timed steps & QC input steps | Company password (Level 2) |
| **היסטוריה** (History) | `/history` | Permanent archive + QC values + CSV export | All logged-in staff |
| **עובדים** (Employees) | `/settings/users` | Manage factory employees and their 4-digit PINs | All logged-in staff |

## 3. Managing Employees

1. Open **עובדים** from the sidebar.
2. Fill in the **הוספת עובד חדש** form — full name (Hebrew/English/mixed), a **4-digit PIN** (stored encrypted, never shown again), and a role (*עובד/ת ייצור* or *מפקח/ת*).
3. Employees linked to existing batch history **cannot be deleted**, preserving accountability records.

## 4. Managing Formulas (Supervisors)

### Step types — the heart of v2.0

Every production step is now one of two types (toggled inside each step card):

- **שלב מתוזמן (Timed Step)** — classic strict countdown; the worker cannot advance before the timer reaches zero.
- **שלב הזנת ערך (Input-Required Step / QC)** — a quality-control checkpoint that stays **locked until the worker records a measurement**. Configure:
  - **תווית השדה** (prompt shown to the worker), e.g. *"הזינו רמת pH"* or *"הזינו טמפרטורה"*.
  - **סוג הערך** — numeric (e.g. `7.2`) or free text (e.g. "אושר").
  - **יחידת מידה** (optional) — `pH`, `°C`, `cP`, … shown next to the input.
  - **טווח מותר** (optional, numeric only) — min/max bounds; out-of-range values are rejected both on-screen and by the server.

The recorded value is saved **permanently in the batch's history log** (and in the CSV export) for quality audits.

### Creating a formula

1. Go to **מתכונים → מתכון חדש** (company password required).
2. Name + description, optional **רכיבי ייצור** (ingredients with quantities), then build the ordered step list mixing timed and input steps as needed.
3. Save. The footer summarizes the total timed duration and the QC-step count.

## 5. Running Batches (Production Floor)

### Creating & starting a batch

1. Dashboard → **אצווה חדשה** → pick a **מתכון** → pick your **name** → enter your personal **4-digit PIN**.
2. **NEW:** the batch opens in a *ready* state — nothing runs yet. Press the large **התחלת שלב 1** button to explicitly begin (the timer/input collection starts only then).
3. Start as many simultaneous batches as the floor can handle — the dashboard grid tracks each one independently.

### Executing steps

- **Timed step** — giant countdown + liquid-fill animation. When the timer hits **00:00**, a **3-second pleasant chime** plays and the **סיום שלב והתקדמות** button unlocks (steps can never be skipped or shortened).
- **Input (QC) step** — an amber quality-control card appears with the configured prompt (e.g. *הזינו רמת pH*). The step stays locked until you enter a valid value and press **שמירת ערך והתקדמות**. Out-of-range numbers are refused with a clear message.
- **השהייה** pauses a running timer; input steps never pause (they already wait for you).
- **ביטול אצווה** aborts with a mandatory reason note — the batch is archived, never deleted.

### Global chime — everywhere, always

If *any* active batch's timer reaches zero, the 3-second chime fires **no matter which screen you're on** — dashboard, history, employees, or settings — because a global monitor watches every running timer in the background at all times. Alerts never stack: if a chime is already playing, the next one waits its turn. Back on the dashboard, the affected card pulses green with **מוכנה להתקדמות**.

### Refresh safety

All timers are driven by server timestamps. Closing the tab, refreshing, or switching computers never resets a countdown.

## 6. History & CSV Export

1. **היסטוריה** lists every completed/aborted batch: number, formula, employee, start/end, duration, status — plus **sky-blue QC badges** showing every recorded measurement (e.g. *הזינו רמת pH נמדדת: 8.7 pH*).
2. Search covers batch numbers, formulas, employees **and QC values**.
3. **ייצוא CSV** downloads `chimo-history-<date>.csv` — UTF-8 with BOM (Excel-ready, Hebrew headers) including a dedicated **ערכי בקרת איכות שנרשמו** column containing all recorded measurements.

## 7. Quick Reference — Seeded Test Data

| What | Value |
| --- | --- |
| Company login | `admin` / `chimo-2026` (local defaults) |
| Employee PINs | `1234`, `2468`, `1379`, `4321`, `9876` |
| Formula with QC input steps | **נוזל כביסה מרוכז — כימו פרש** (temperature + final pH) |
| Shortest full cycle | **מנקה רצפות לבנדר — כימו לבנדר** (ends with a free-text lab approval step) |
