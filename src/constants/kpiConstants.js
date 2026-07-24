// ─── App-wide constants ───────────────────────────────────────────────────────

export const STORAGE_KEY = 've_kpi_model_react_v1';
export const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbx2Rve2KKJcwJLIz4Pxq4oFXE79-1fYur_y1BO7kzaOQJruNeKUFhbJuTUJbHE3O2O5/exec';
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
  ['Applications',        'Applications'],
  ['Interview with Rono', 'rono'],
  ['Final Rounds',        'Final Rounds'],
  ['Offer Given To',      'Offer Given To'],
];

// ─── Metric rule sets ─────────────────────────────────────────────────────────

/** Metrics whose plan is always forced to 0 ("target = 0" metrics) */
export const ZERO_PLAN_IDS = new Set(['complaints', 'delclient', 'delfactory', 'matret']);

/** Metrics hidden from the UI (data preserved in storage) */
export const HIDDEN_METRIC_IDS = new Set(['gasmt']);
