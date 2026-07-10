import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 've_kpi_model_react_v1';
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzo6gMr5c4G96HSZ2cYfJ-tlHoVltP72gq4LuTmfRHMFOxmqm7AKeZlibLExI2ARfNG/exec";
const EDIT_KEY = "vinayak2026";

export const SEED = {"meta":{"company":"Vinayak Enterprises","period":"June 2026"},"weeks":[{"id":"wmqo21ah6","label":"Week 3","range":"15-21 Jun"},{"id":"wmqoudofq","label":"Week 4","range":"22-28 Jun"},{"id":"wmqyswxhs","label":"Week 5","range":"29 - 5 july"},{"id":"wmr8vcgjt","label":"Week 5","range":"06 July - 12 July"}],"departments":[{"id":"purchase","name":"Purchase","emoji":"📦","metrics":[{"id":"ing97","name":"Ingot 97%","sub":"","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":7,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":1,"wmqoudofq":3,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":-33}},{"id":"ing975","name":"Ingot 97.5%","sub":"","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":6,"wmqoudofq":7,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":2,"wmqoudofq":0,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":-33}},{"id":"ing98","name":"Ingot 98%","sub":"","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":7,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":1,"wmqoudofq":7,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":-33}},{"id":"ing985","name":"Ingot 98.5%","sub":"","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":6,"wmqoudofq":7,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":3,"wmqoudofq":0,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":-33}},{"id":"totdel","name":"Total Delivery","sub":"","unit":"","dir":"higher","total":true,"plan":{"wmqo21ah6":14,"wmqoudofq":28,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":7,"wmqoudofq":15,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":-33}},{"id":"ontime","name":"On-Time Delivery","sub":"No. on time","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":33,"wmqoudofq":24,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":16,"wmqoudofq":15,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":-20}},{"id":"qret","name":"Quality Returns","sub":"Rejections","unit":"","dir":"zero","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":0,"wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":3,"wmqyswxhs":"","wmr8vcgjt":""},"promised":{"wmqoudofq":1,"wmqo21ah6":""}}]},{"id":"production","name":"Production","emoji":"🏭","metrics":[{"id":"fg","name":"Finished Goods","sub":"MT total","unit":"MT","dir":"higher","total":false,"plan":{"wmqo21ah6":342,"wmqoudofq":420,"wmqyswxhs":420,"wmr8vcgjt":""},"actual":{"wmqo21ah6":261.765,"wmqoudofq":404,"wmqyswxhs":384,"wmr8vcgjt":""},"promised":{"wmqoudofq":420}},{"id":"hrslost","name":"Hours Lost","sub":"hrs · lower is better","unit":"hrs","dir":"lower","total":false,"plan":{"wmqo21ah6":15,"wmqoudofq":18,"wmqyswxhs":18,"wmr8vcgjt":""},"actual":{"wmqo21ah6":50.26,"wmqoudofq":20.25,"wmqyswxhs":23.54,"wmr8vcgjt":""},"promised":{"wmqoudofq":18}},{"id":"oilmt","name":"Oil / MT","sub":"L/MT · lower is better","unit":"L/MT","dir":"lower","total":false,"plan":{"wmqo21ah6":50,"wmqoudofq":58,"wmqyswxhs":60,"wmr8vcgjt":""},"actual":{"wmqo21ah6":69.56,"wmqoudofq":62.21,"wmqyswxhs":64.93,"wmr8vcgjt":""},"promised":{"wmqoudofq":58}}]},{"id":"crm","name":"CRM","emoji":"🤝","metrics":[{"id":"planned_dispatch","name":"Planned Dispatch","sub":"","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":39,"wmqoudofq":31,"wmqyswxhs":57,"wmr8vcgjt":""},"actual":{"wmqo21ah6":13,"wmqoudofq":25,"wmqyswxhs":43,"wmr8vcgjt":""},"promised":{"wmqoudofq":-30,"wmqyswxhs":-20,"wmr8vcgjt":-20}},{"id":"ontime_dispatch","name":"On-Time Dispatch","sub":"","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":39,"wmqoudofq":31,"wmqyswxhs":57,"wmr8vcgjt":""},"actual":{"wmqo21ah6":13,"wmqoudofq":25,"wmqyswxhs":43,"wmr8vcgjt":""},"promised":{"wmqoudofq":-30,"wmqyswxhs":-20,"wmr8vcgjt":-20}},{"id":"planned_payment","name":"Planned Payment","sub":"No. received","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":28,"wmqoudofq":35,"wmqyswxhs":44,"wmr8vcgjt":""},"actual":{"wmqo21ah6":4,"wmqoudofq":12,"wmqyswxhs":38,"wmr8vcgjt":""},"promised":{"wmqoudofq":-50,"wmqyswxhs":-40,"wmr8vcgjt":-20}},{"id":"ontime_payment","name":"On-Time Payment","sub":"No. received","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":28,"wmqoudofq":35,"wmqyswxhs":44,"wmr8vcgjt":""},"actual":{"wmqo21ah6":4,"wmqoudofq":12,"wmqyswxhs":38,"wmr8vcgjt":""},"promised":{"wmqoudofq":-50,"wmqyswxhs":-40,"wmr8vcgjt":-20}},{"id":"complaints","name":"Complaints","sub":"","unit":"","dir":"zero","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":6,"wmqoudofq":2,"wmqyswxhs":1,"wmr8vcgjt":""},"promised":{"wmqoudofq":0,"wmqyswxhs":""}},{"id":"delclient","name":"Delayed Dispatch — Client","sub":"Target = 0","unit":"","dir":"zero","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":8,"wmqoudofq":1,"wmqyswxhs":9,"wmr8vcgjt":""},"promised":{}},{"id":"delfactory","name":"Delayed Dispatch — Factory","sub":"Target = 0","unit":"","dir":"zero","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":14,"wmqoudofq":2,"wmqyswxhs":4,"wmr8vcgjt":""},"promised":{}},{"id":"matret","name":"Material Returns","sub":"Target = 0","unit":"","dir":"zero","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":1,"wmqoudofq":0,"wmqyswxhs":1,"wmr8vcgjt":""},"promised":{"wmqoudofq":0}}]},{"id":"hiring","name":"Hiring","emoji":"👥","metrics":[{"id":"apps","name":"Applications","sub":"All positions","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":31,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":17,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"final","name":"Final Round Interviews","sub":"All positions","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":21,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":4,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"offer","name":"Offer Given To","sub":"All positions","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"onboard","name":"Onboarded","sub":"All positions","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":14,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":0,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"rec_dipesh_apps","name":"Dipesh — Applications","sub":"Recruiter: Dipesh","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":19,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":8,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"rec_dipesh_final","name":"Dipesh — Final Rounds","sub":"Recruiter: Dipesh","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":12,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":3,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"rec_dipesh_offer","name":"Dipesh — Offer Given To","sub":"Recruiter: Dipesh","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"rec_dipesh_onboard","name":"Dipesh — Onboarded","sub":"Recruiter: Dipesh","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":6,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":0,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"rec_madhu_apps","name":"Madhu — Applications","sub":"Recruiter: Madhu","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":12,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":9,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"rec_madhu_final","name":"Madhu — Final Rounds","sub":"Recruiter: Madhu","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":9,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":1,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"rec_madhu_offer","name":"Madhu — Offer Given To","sub":"Recruiter: Madhu","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"rec_madhu_onboard","name":"Madhu — Onboarded","sub":"Recruiter: Madhu","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":8,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":0,"wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"promised":{}},{"id":"pos_dipesh_tenderexecutive_apps","name":"Tender Executive — Applications","sub":"Recruiter: Dipesh · Position: Tender Executive · Applications","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":3,"wmqoudofq":8,"wmqyswxhs":8,"wmr8vcgjt":6},"actual":{"wmqo21ah6":1,"wmqoudofq":6,"wmqyswxhs":3,"wmr8vcgjt":""}},{"id":"pos_dipesh_tenderexecutive_offer","name":"Tender Executive — Offer Given To","sub":"Recruiter: Dipesh · Position: Tender Executive · Offer Given To","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_dipesh_tenderexecutive_final","name":"Tender Executive — Final Rounds","sub":"Recruiter: Dipesh · Position: Tender Executive · Final Rounds","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":2,"wmqoudofq":4,"wmqyswxhs":2,"wmr8vcgjt":2},"actual":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":3,"wmr8vcgjt":""}},{"id":"pos_dipesh_tenderexecutive_onboard","name":"Tender Executive — Onboarded","sub":"Recruiter: Dipesh · Position: Tender Executive · Onboarded","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":1,"wmr8vcgjt":1},"actual":{"wmqo21ah6":0,"wmqoudofq":1,"wmqyswxhs":1,"wmr8vcgjt":""}},{"id":"pos_dipesh_plantoperationsmanager_apps","name":"Plant Operations Manager — Applications","sub":"Recruiter: Dipesh · Position: Plant Operations Manager · Applications","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":3,"wmqoudofq":5,"wmqyswxhs":6,"wmr8vcgjt":5},"actual":{"wmqo21ah6":0,"wmqoudofq":1,"wmqyswxhs":2,"wmr8vcgjt":""}},{"id":"pos_dipesh_plantoperationsmanager_offer","name":"Plant Operations Manager — Offer Given To","sub":"Recruiter: Dipesh · Position: Plant Operations Manager · Offer Given To","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_dipesh_plantoperationsmanager_final","name":"Plant Operations Manager — Final Rounds","sub":"Recruiter: Dipesh · Position: Plant Operations Manager · Final Rounds","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":3,"wmqyswxhs":2,"wmr8vcgjt":2},"actual":{"wmqo21ah6":1,"wmqoudofq":0,"wmqyswxhs":0,"wmr8vcgjt":""}},{"id":"pos_dipesh_plantoperationsmanager_onboard","name":"Plant Operations Manager — Onboarded","sub":"Recruiter: Dipesh · Position: Plant Operations Manager · Onboarded","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":1,"wmr8vcgjt":1},"actual":{"wmqo21ah6":0,"wmqoudofq":0,"wmqyswxhs":0,"wmr8vcgjt":""}},{"id":"pos_madhu_pc_apps","name":"PC — Applications","sub":"Recruiter: Madhu · Position: PC · Applications","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":2,"wmqoudofq":8,"wmqyswxhs":5,"wmr8vcgjt":5},"actual":{"wmqo21ah6":2,"wmqoudofq":2,"wmqyswxhs":9,"wmr8vcgjt":""}},{"id":"pos_madhu_pc_offer","name":"PC — Offer Given To","sub":"Recruiter: Madhu · Position: PC · Offer Given To","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_madhu_pc_final","name":"PC — Final Rounds","sub":"Recruiter: Madhu · Position: PC · Final Rounds","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":4,"wmqyswxhs":2,"wmr8vcgjt":2},"actual":{"wmqo21ah6":0,"wmqoudofq":0,"wmqyswxhs":0,"wmr8vcgjt":""}},{"id":"pos_madhu_pc_onboard","name":"PC — Onboarded","sub":"Recruiter: Madhu · Position: PC · Onboarded","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":1,"wmr8vcgjt":2},"actual":{"wmqo21ah6":0,"wmqoudofq":0,"wmqyswxhs":0,"wmr8vcgjt":""}},{"id":"pos_madhu_crmsales_apps","name":"CRM/Sales — Applications","sub":"Recruiter: Madhu · Position: CRM/Sales · Applications","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":2,"wmqoudofq":8,"wmqyswxhs":6,"wmr8vcgjt":6},"actual":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":5,"wmr8vcgjt":""}},{"id":"pos_madhu_crmsales_offer","name":"CRM/Sales — Offer Given To","sub":"Recruiter: Madhu · Position: CRM/Sales · Offer Given To","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_madhu_crmsales_final","name":"CRM/Sales — Final Rounds","sub":"Recruiter: Madhu · Position: CRM/Sales · Final Rounds","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":2,"wmqoudofq":4,"wmqyswxhs":4,"wmr8vcgjt":2},"actual":{"wmqo21ah6":0,"wmqoudofq":0,"wmqyswxhs":2,"wmr8vcgjt":""}},{"id":"pos_madhu_crmsales_onboard","name":"CRM/Sales — Onboarded","sub":"Recruiter: Madhu · Position: CRM/Sales · Onboarded","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":2,"wmqoudofq":1,"wmqyswxhs":2,"wmr8vcgjt":2},"actual":{"wmqo21ah6":0,"wmqoudofq":0,"wmqyswxhs":1,"wmr8vcgjt":""}},{"id":"pos_madhu_senioraccountant_apps","name":"Senior Accountant — Applications","sub":"Recruiter: Madhu · Position: Senior Accountant · Applications","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":2,"wmqoudofq":4,"wmqyswxhs":5,"wmr8vcgjt":5},"actual":{"wmqo21ah6":2,"wmqoudofq":3,"wmqyswxhs":2,"wmr8vcgjt":""}},{"id":"pos_madhu_senioraccountant_offer","name":"Senior Accountant — Offer Given To","sub":"Recruiter: Madhu · Position: Senior Accountant · Offer Given To","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_madhu_senioraccountant_final","name":"Senior Accountant — Final Rounds","sub":"Recruiter: Madhu · Position: Senior Accountant · Final Rounds","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":3,"wmqyswxhs":2,"wmr8vcgjt":2},"actual":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":0,"wmr8vcgjt":""}},{"id":"pos_madhu_senioraccountant_onboard","name":"Senior Accountant — Onboarded","sub":"Recruiter: Madhu · Position: Senior Accountant · Onboarded","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":1,"wmqoudofq":1,"wmqyswxhs":1,"wmr8vcgjt":2},"actual":{"wmqo21ah6":1,"wmqoudofq":0,"wmqyswxhs":0,"wmr8vcgjt":""}},{"id":"pos_dipesh_accountantdausa_apps","name":"Accountant -Dausa — Applications","sub":"Recruiter: Dipesh · Position: Accountant -Dausa · Applications","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":5},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_dipesh_accountantdausa_offer","name":"Accountant -Dausa — Offer Given To","sub":"Recruiter: Dipesh · Position: Accountant -Dausa · Offer Given To","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_dipesh_accountantdausa_final","name":"Accountant -Dausa — Final Rounds","sub":"Recruiter: Dipesh · Position: Accountant -Dausa · Final Rounds","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":2},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}},{"id":"pos_dipesh_accountantdausa_onboard","name":"Accountant -Dausa — Onboarded","sub":"Recruiter: Dipesh · Position: Accountant -Dausa · Onboarded","unit":"","dir":"higher","total":false,"plan":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":2},"actual":{"wmqo21ah6":"","wmqoudofq":"","wmqyswxhs":"","wmr8vcgjt":""}}]}]};

export const SOLUTION_LINKS = {
  purchase: "https://docs.google.com/document/d/1VI-ROkFGQ3n909IWbJKWBMw_aYepOLUOsfh9EgyGo3s/edit?tab=t.0",
  production: "https://docs.google.com/document/d/1_QqoquU80AmTE2sLy3cEp12EVWqCKDk7BHKXgcLlvmU/edit?tab=t.0",
  crm: "https://docs.google.com/document/d/1rAW5FitcZK1v92vG6Wak_rZUKYpc0gNzse-bn3rw_GI/edit?tab=t.0",
  hiring: "https://docs.google.com/document/d/17DIiKkxoKz89yEmJJv3McHqLrnrhbBt8sRjvWo3-utc/edit?tab=t.0"
};

export const RECRUITERS = ['Dipesh', 'Madhu'];
export const STAGES = [['Applications', 'Applications'], ['Final Rounds', 'Final Rounds'], ['Offer Given To', 'Offer Given To']];

export function num(v) { return (v === null || v === undefined || v === '') ? null : Number(v); }

export function formatNum(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return v;
  return Number(n.toFixed(3)).toString();
}

export function calculateScore(plan, actual, dir) {
  const p = num(plan), a = num(actual);
  if (a === null) return { pct: null, color: 'muted', label: '—' };
  if (dir === 'zero') {
    if (a === 0) return { pct: 0, color: 'green', label: '0 ✓' };
    return { pct: null, color: (a <= 1 ? 'amber' : 'red'), label: a + (a === 1 ? ' issue' : ' issues') };
  }
  if (p === null || p === 0) return { pct: null, color: 'muted', label: '—' };
  let pct = dir === 'lower' ? ((p - a) / p) * 100 : ((a - p) / p) * 100;
  const r = Math.round(pct * 10) / 10;
  let color = r >= -1 ? 'green' : (r >= -10 ? 'amber' : 'red');
  const sign = r > 0 ? '+' : '';
  const tick = color === 'green' ? ' ✓' : '';
  return { pct: r, color, label: sign + r + '%' + tick };
}

export function mtd(metric, weeks) {
  let plan = 0, act = 0, hasAct = false, hasPlan = false;
  weeks.forEach(w => {
    const p = num(metric.plan[w.id]); if (p !== null) { plan += p; hasPlan = true; }
    const a = num(metric.actual[w.id]); if (a !== null) { act += a; hasAct = true; }
  });
  return { plan: hasPlan ? plan : null, actual: hasAct ? act : null };
}

export const KpiContext = createContext();

export function KpiProvider({ children }) {
  const [model, setModel] = useState(() => {
    let initialData = null;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) initialData = JSON.parse(s);
    } catch (e) { console.error(e); }
    if (!initialData) initialData = JSON.parse(JSON.stringify(SEED));

    // MIGRATION: Split CRM Dispatch and Payment
    const crm = initialData.departments.find(d => d.id === 'crm');
    if (crm) {
      const newCrmMetrics = [];
      crm.metrics.forEach(m => {
        if (m.id === 'otd') {
          newCrmMetrics.push({ ...m, id: 'planned_dispatch', name: 'Planned Dispatch' });
          newCrmMetrics.push({ ...m, id: 'ontime_dispatch', name: 'On-Time Dispatch', actual: m.ontime || m.actual });
        } else if (m.id === 'paycoll') {
          newCrmMetrics.push({ ...m, id: 'planned_payment', name: 'Planned Payment' });
          newCrmMetrics.push({ ...m, id: 'ontime_payment', name: 'On-Time Payment', actual: m.ontime || m.actual });
        } else if (m.id !== 'planned_dispatch' && m.id !== 'ontime_dispatch' && m.id !== 'planned_payment' && m.id !== 'ontime_payment') {
          newCrmMetrics.push(m);
        }
      });
      // Delete ontime from all crm metrics
      newCrmMetrics.forEach(m => { delete m.ontime; });
      crm.metrics = newCrmMetrics;
    }

    // MIGRATION: Remove any existing onboard metrics
    const hiring = initialData.departments.find(d => d.id === 'hiring');
    if (hiring) {
      const newMetrics = [];
      hiring.metrics.forEach(m => {
        if (!m.id.endsWith('_onboard') && m.id !== 'onboard') {
          newMetrics.push(m);
        }
      });
      hiring.metrics = newMetrics;
    }
    return initialData;
  });

  const [connState, setConnState] = useState('offline'); // offline, online, syncing, error
  const [canEdit, setCanEdit] = useState(false);
  const [activeWeek, setActiveWeek] = useState(model.weeks[0]?.id || null);

  useEffect(() => {
    // Initial fetch
    pullFromCloud();
  }, []);

  const saveToLocal = (newModel) => {
    setModel(newModel);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newModel)); } catch (e) { }
  };

  const updateValue = (deptId, metricId, field, weekId, value) => {
    if (BACKEND_URL && !canEdit) {
      alert('You are in view mode. Please unlock editing first.');
      return;
    }
    const newModel = { ...model };
    const dept = newModel.departments.find(d => d.id === deptId);
    const metric = dept.metrics.find(m => m.id === metricId);
    if (!metric[field]) metric[field] = {};
    metric[field][weekId] = value === '' ? '' : Number(value);

    saveToLocal(newModel);

    // Debounce cloud push
    if (window._pushTimer) clearTimeout(window._pushTimer);
    window._pushTimer = setTimeout(() => pushToCloud(newModel), 800);
  };

  const unlockEditing = () => {
    const k = prompt('Enter the editor passphrase to enable editing:');
    if (k === null) return;
    if (k === EDIT_KEY) {
      setCanEdit(true);
      alert('Editing unlocked on this device.');
    } else {
      alert('Wrong passphrase. You can still view, but not edit.');
    }
  };

  const pullFromCloud = async () => {
    if (!BACKEND_URL) { setConnState('offline'); return; }
    setConnState('syncing');
    try {
      const r = await fetch(BACKEND_URL + '?action=get&t=' + Date.now());
      const j = await r.json();
      const payload = j.data ? j.data : j;
      if (payload && payload.departments) {
        saveToLocal(payload);
        if (!payload.weeks.some(w => w.id === activeWeek)) {
          setActiveWeek(payload.weeks[0]?.id || null);
        }
        setConnState('online');
      } else {
        setConnState('error');
      }
    } catch (e) {
      console.error('pullFromCloud error:', e);
      setConnState('error');
    }
  };

  const pushToCloud = async (currentModel) => {
    if (!BACKEND_URL || !canEdit) return;
    setConnState('syncing');
    try {
      const dataToPush = JSON.parse(JSON.stringify(currentModel, (k, v) => (k && k[0] === '_') ? undefined : v));
      const r = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save', key: EDIT_KEY, data: dataToPush })
      });
      let j = {};
      try { j = await r.json(); } catch (e) { }

      // If it returned ok status, we assume it's good. 
      // If it returned j.ok === false, it might be an auth error.
      if (r.ok || (j && j.ok)) {
        setConnState('online');
      } else {
        setConnState('error');
      }

      if (j && j.ok === false && j.error === 'auth') {
        alert('Edit key rejected by server.');
      }
    } catch (e) {
      console.error('pushToCloud error:', e);
      setConnState('error');
    }
  };

  const addWeek = (label, range) => {
    const id = 'w' + Date.now().toString(36);
    const newModel = { ...model };
    newModel.weeks.push({ id, label, range });
    newModel.departments.forEach(d => {
      d.metrics.forEach(m => {
        m.plan[id] = '';
        m.actual[id] = '';
        if (m.promised) m.promised[id] = '';
      });
    });
    setActiveWeek(id);
    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const editWeek = (id, newLabel, newRange) => {
    const newModel = { ...model };
    const w = newModel.weeks.find(w => w.id === id);
    if (w) {
      w.label = newLabel;
      w.range = newRange;
      saveToLocal(newModel);
      pushToCloud(newModel);
    }
  };

  const removeWeek = (id) => {
    const newModel = { ...model };
    newModel.weeks = newModel.weeks.filter(w => w.id !== id);
    newModel.departments.forEach(d => {
      d.metrics.forEach(m => {
        delete m.plan[id];
        delete m.actual[id];
        if (m.promised) delete m.promised[id];
      });
    });
    if (activeWeek === id) setActiveWeek(newModel.weeks[0]?.id || null);
    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const addHiringRole = (recruiter, role) => {
    const newModel = { ...model };
    const hiring = newModel.departments.find(d => d.id === 'hiring');
    if (!hiring) return;

    const safeId = role.toLowerCase().replace(/[^a-z0-9]/g, '');
    const recSafe = recruiter.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseId = `pos_${recSafe}_${safeId}`;

    const stages = [
      { id: `${baseId}_apps`, name: `${role} — Applications`, sub: `Recruiter: ${recruiter} · Position: ${role} · Applications` },
      { id: `${baseId}_final`, name: `${role} — Final Rounds`, sub: `Recruiter: ${recruiter} · Position: ${role} · Final Rounds` },
      { id: `${baseId}_offer`, name: `${role} — Offer Given To`, sub: `Recruiter: ${recruiter} · Position: ${role} · Offer Given To` }
    ];

    stages.forEach(s => {
      // Don't add if it already exists
      if (hiring.metrics.some(m => m.id === s.id)) return;
      
      const newMetric = {
        id: s.id,
        name: s.name,
        sub: s.sub,
        unit: '',
        dir: 'higher',
        total: false,
        plan: {},
        actual: {}
      };
      // initialize weeks
      newModel.weeks.forEach(w => {
        newMetric.plan[w.id] = '';
        newMetric.actual[w.id] = '';
      });
      hiring.metrics.push(newMetric);
    });

    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const removeHiringRole = (recruiter, role) => {
    const newModel = { ...model };
    const hiring = newModel.departments.find(d => d.id === 'hiring');
    if (!hiring) return;
    
    const recSafe = `Recruiter: ${recruiter} `;
    const posSafe = `Position: ${role} `;
    
    hiring.metrics = hiring.metrics.filter(m => {
      const sub = m.sub || '';
      // We look for exact matches in the sub string to be safe
      return !(sub.includes(`Recruiter: ${recruiter}`) && sub.includes(`Position: ${role}`));
    });

    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const resetData = () => {
    const newModel = JSON.parse(JSON.stringify(SEED));
    saveToLocal(newModel);
    setActiveWeek(newModel.weeks[0].id);
    if (canEdit) pushToCloud(newModel);
  };

  return (
    <KpiContext.Provider value={{
      model,
      connState,
      canEdit,
      activeWeek,
      setActiveWeek,
      updateValue,
      unlockEditing,
      addWeek,
      editWeek,
      removeWeek,
      addHiringRole,
      removeHiringRole,
      resetData,
      setModel: saveToLocal
    }}>
      {children}
    </KpiContext.Provider>
  );
}
