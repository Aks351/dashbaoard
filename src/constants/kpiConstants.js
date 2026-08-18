// ─── App-wide constants ───────────────────────────────────────────────────────

export const STORAGE_KEY = 've_kpi_model_react_v1';
export const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxP94sCqfEJof4Qc2-svCt3Bcs5UJNQlaSQn9aXqMDp52oRcwuJUoqhqhYlAdg1vZXj/exec';
export const PURCHASE_STOCK_URL = 'https://script.google.com/macros/s/AKfycbxNBMLIik2OYz8Z9d_st75cPf5MY_2U1li5g9pWqxyyu6NFQfKwZY6eRGZ4GYoeAQNL/exec';
export const EDIT_KEY = 'vinayak2026';

// ─── Navigation / solution links ─────────────────────────────────────────────

export const SOLUTION_LINKS = {
  purchase: 'https://docs.google.com/document/d/1VI-ROkFGQ3n909IWbJKWBMw_aYepOLUOsfh9EgyGo3s/edit?tab=t.0',
  production: 'https://docs.google.com/document/d/1_QqoquU80AmTE2sLy3cEp12EVWqCKDk7BHKXgcLlvmU/edit?tab=t.0',
  crm: 'https://docs.google.com/document/d/1rAW5FitcZK1v92vG6Wak_rZUKYpc0gNzse-bn3rw_GI/edit?tab=t.0',
  hiring: 'https://docs.google.com/document/d/17DIiKkxoKz89yEmJJv3McHqLrnrhbBt8sRjvWo3-utc/edit?tab=t.0',
};

// ─── Hiring constants ─────────────────────────────────────────────────────────

export const RECRUITERS = ['Dipesh', 'Madhu'];

export const STAGES = [
  ['Applications', 'Applications'],
  ['Interview with Rono', 'rono'],
  ['Final Rounds', 'Final Rounds'],
  ['Offer Given To', 'Offer Given To'],
];

// ─── Metric rule sets ─────────────────────────────────────────────────────────

/** Metrics that exclusively read their MTD values from the 'monthly' sheet */
export const MONTHLY_OVERRIDE_IDS = new Set(['oilmt', 'oilpermt']);

/** Metrics whose plan is always forced to 0 ("target = 0" metrics) */
export const ZERO_PLAN_IDS = new Set(['total_crm_complaints', 'complaints', 'closed_complaints', 'delclient', 'delfactory', 'matret', 'qty_replaced']);

/**
 * Metrics whose plan is always a fixed non-zero value.
 * The UI shows the value as read-only; scoring uses it automatically.
 * Format: { metricId: fixedPlanValue }
 */
export const FIXED_PLAN_VALUES = {
  avg_closing_days: 2,
  ing97: 7,
  ing975: 7,
  ing98: 7,
  ing985: 7,
};

/** Metrics hidden from the UI (data preserved in storage) */
export const HIDDEN_METRIC_IDS = new Set([]);
