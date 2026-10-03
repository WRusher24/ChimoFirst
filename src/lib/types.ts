/** Shared DTO types exchanged between API routes and the client. */

export type StepStatus = "pending" | "active" | "paused" | "completed";
export type BatchStatus = "active" | "completed" | "aborted";
export type EmployeeRole = "worker" | "supervisor";
export type StepType = "timed" | "input";
export type InputKind = "number" | "text";

export interface StepDTO {
  id: number;
  stepIndex: number;
  title: string;
  instruction: string;
  durationSeconds: number;
  status: StepStatus;
  /** Timestamp of the current running segment (null unless status = 'active'). */
  startedAt: string | null;
  /** Milliseconds already accumulated by previous run segments (pause math). */
  elapsedMs: number;
  completedAt: string | null;
  stepType: StepType;
  inputLabel: string | null;
  inputKind: InputKind;
  inputMin: number | null;
  inputMax: number | null;
  inputUnit: string | null;
  inputValue: string | null;
}

export interface BatchDTO {
  id: number;
  batchNumber: string;
  status: BatchStatus;
  startedAt: string;
  completedAt: string | null;
  abortReason: string | null;
  totalDurationSeconds: number | null;
  formulaId: number | null;
  formulaName: string;
  employeeId: number;
  employeeName: string;
  steps: StepDTO[];
}

export interface DashboardStats {
  active: number;
  paused: number;
  completedToday: number;
}

export interface DashboardResponse {
  serverTime: string;
  stats: DashboardStats;
  batches: BatchDTO[];
}

export interface BatchDetailResponse {
  serverTime: string;
  batch: BatchDTO;
}

export interface FormulaStepDTO {
  id: number;
  sortOrder: number;
  title: string;
  instruction: string;
  durationSeconds: number;
  stepType: StepType;
  inputLabel: string | null;
  inputKind: InputKind;
  inputMin: number | null;
  inputMax: number | null;
  inputUnit: string | null;
}

export interface FormulaIngredientDTO {
  id: number;
  name: string;
  amount: number;
  unit: string;
}

export interface FormulaDTO {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  steps: FormulaStepDTO[];
  ingredients: FormulaIngredientDTO[];
  totalDurationSeconds: number;
}

/** Lightweight formula info — safe for floor workers picking a formula. */
export interface FormulaSummaryDTO {
  id: number;
  name: string;
  description: string;
  stepCount: number;
  ingredientCount: number;
  totalDurationSeconds: number;
}

export interface EmployeeDTO {
  id: number;
  name: string;
  role: EmployeeRole;
  createdAt: string;
}

export interface RecordedInputDTO {
  stepTitle: string;
  label: string;
  value: string;
  unit: string | null;
}

export interface HistoryRowDTO {
  id: number;
  batchNumber: string;
  status: BatchStatus;
  formulaName: string;
  employeeName: string;
  startedAt: string;
  completedAt: string | null;
  totalDurationSeconds: number | null;
  abortReason: string | null;
  /** Quality-control values recorded during execution (for audits). */
  inputs: RecordedInputDTO[];
}

export interface HistoryResponse {
  serverTime: string;
  rows: HistoryRowDTO[];
}
