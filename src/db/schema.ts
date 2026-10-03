import {
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Employees that are allowed to operate the system.
 * PIN codes are stored as salted scrypt hashes — never in plain text.
 */
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  role: text("role").notNull().default("worker"), // 'worker' | 'supervisor'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Detergent formula definitions (recipes).
 */
export const formulas = pgTable("formulas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Ordered steps that belong to a formula.
 *
 * stepType 'timed' → strict countdown, durationSeconds is enforced.
 * stepType 'input' → quality-control step that blocks advancement until the
 * worker records a measured value (e.g. pH level, temperature). durationSeconds
 * is stored as 0 and ignored.
 */
export const formulaSteps = pgTable(
  "formula_steps",
  {
    id: serial("id").primaryKey(),
    formulaId: integer("formula_id")
      .notNull()
      .references(() => formulas.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    title: text("title").notNull(),
    instruction: text("instruction").notNull().default(""),
    durationSeconds: integer("duration_seconds").notNull(),
    stepType: text("step_type").notNull().default("timed"), // 'timed' | 'input'
    inputLabel: text("input_label"),
    inputKind: text("input_kind").notNull().default("number"), // 'number' | 'text'
    inputMin: doublePrecision("input_min"),
    inputMax: doublePrecision("input_max"),
    inputUnit: text("input_unit"),
  },
  (t) => [index("formula_steps_formula_idx").on(t.formulaId)],
);

/**
 * Optional raw-materials list of a formula (viewed on the details page).
 */
export const formulaIngredients = pgTable(
  "formula_ingredients",
  {
    id: serial("id").primaryKey(),
    formulaId: integer("formula_id")
      .notNull()
      .references(() => formulas.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    amount: doublePrecision("amount").notNull(),
    unit: text("unit").notNull(),
  },
  (t) => [index("formula_ingredients_formula_idx").on(t.formulaId)],
);

/**
 * A single production batch execution.
 * formulaName / employeeName are snapshotted so history stays intact even if a
 * formula or employee is removed later.
 */
export const batches = pgTable(
  "batches",
  {
    id: serial("id").primaryKey(),
    batchNumber: text("batch_number").notNull().unique(),
    formulaId: integer("formula_id").references(() => formulas.id, {
      onDelete: "set null",
    }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    formulaName: text("formula_name").notNull(),
    status: text("status").notNull().default("active"), // 'active' | 'completed' | 'aborted'
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    abortReason: text("abort_reason"),
    totalDurationSeconds: integer("total_duration_seconds"),
  },
  (t) => [
    index("batches_status_idx").on(t.status),
    index("batches_completed_at_idx").on(t.completedAt),
  ],
);

/**
 * Concrete step executions for a batch (copied from the formula on start).
 *
 * Timer persistence model (survives refreshes / closed tabs):
 *  - status 'active'   → elapsedMs + (now - startedAt)
 *  - status 'paused'   → frozen elapsedMs, startedAt = null
 *  - status 'pending'  → not started yet
 *  - status 'completed'→ done
 */
export const batchSteps = pgTable(
  "batch_steps",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    title: text("title").notNull(),
    instruction: text("instruction").notNull().default(""),
    durationSeconds: integer("duration_seconds").notNull(),
    status: text("status").notNull().default("pending"),
    elapsedMs: integer("elapsed_ms").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    stepType: text("step_type").notNull().default("timed"), // 'timed' | 'input'
    inputLabel: text("input_label"),
    inputKind: text("input_kind").notNull().default("number"),
    inputMin: doublePrecision("input_min"),
    inputMax: doublePrecision("input_max"),
    inputUnit: text("input_unit"),
    /** The value the worker recorded (kept forever for quality audits). */
    inputValue: text("input_value"),
  },
  (t) => [index("batch_steps_batch_idx").on(t.batchId)],
);
