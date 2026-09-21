import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { parseTables, clean } from '../shared/tables.js';
import { approx } from '../shared/numbers.js';

function num(s) {
  const m = String(s).replace(/\*\*/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export async function checkStatus(repoDir) {
  const errors = [];
  const rel = path.join('src', 'food', 'diet', 'status.md');
  const md = await readFile(path.join(repoDir, rel), 'utf8');
  const tables = parseTables(md);

  // body: weight / goal / height
  const body = tables.find((t) => clean(t[0][0]) === 'Field' && t.some((r) => clean(r[0]) === 'Height'));
  let weight = null;
  let goal = null;
  let height = null;
  if (body) {
    for (const r of body.slice(1)) {
      const k = clean(r[0]);
      if (k === 'Weight') weight = num(r[1]);
      if (k === 'Goal weight') goal = num(r[1]);
      if (k === 'Height') height = num(r[1]);
    }
  }
  if (weight !== null && goal !== null) {
    const diff = weight - goal;
    const text = md.match(/Weight vs goal:\s*\*\*(\d+) kg above/);
    if (text && Math.abs(num(text[1]) - diff) > 0.5) {
      errors.push(`${rel} (weight balance): weight vs goal ${text[1]} kg != ${weight} − ${goal} = ${diff}`);
    }
    // BMI goal = goal / height(m)^2
    if (height !== null) {
      const bmi = goal / Math.pow(height / 100, 2);
      const bmiText = md.match(/Goal BMI \| ~([\d.]+)/);
      if (bmiText && Math.abs(num(bmiText[1]) - bmi) > 0.3) {
        errors.push(`${rel} (body): goal BMI ${bmiText[1]} != ${goal} / ${height}² = ${bmi.toFixed(1)}`);
      }
    }
  }

  // TDEE − intake = deficit
  const tdeeText = md.match(/TDEE \(sedentary\):\s*\*\*~([\d.]+)/);
  const intakeText = md.match(/Current intake:\s*\*\*~([\d.]+)/);
  const deficitText = md.match(/Daily deficit:\s*\*\*~([\d.]+)/);
  if (tdeeText && intakeText && deficitText) {
    const tdee = num(tdeeText[1]);
    const intake = num(intakeText[1]);
    const deficit = num(deficitText[1]);
    if (!approx(tdee - intake, deficit, 3)) {
      errors.push(`${rel} (weight balance): deficit ${deficit} != TDEE ${tdee} − intake ${intake}`);
    }
  }

  // scenario rows: deficit = TDEE − intake, time = 6kg×7700/deficit
  const scenarios = tables.find((t) => clean(t[0][0]) === 'Scenario');
  if (scenarios && tdeeText) {
    const tdee = num(tdeeText[1]);
    for (const r of scenarios.slice(1)) {
      const intake = num(r[1]);
      const deficit = num(r[2]);
      const days = num(r[3]);
      if (tdee === null || intake === null) continue;
      const expDeficit = tdee - intake;
      if (deficit !== null && !approx(expDeficit, deficit, 3)) {
        errors.push(`${rel} (scenarios): "${r[0]}" deficit ${deficit} != ${tdee} − ${intake} = ${expDeficit}`);
      }
      const expDays = Math.round((6 * 7700) / expDeficit);
      if (days !== null && Math.abs(expDays - days) > 1) {
        errors.push(`${rel} (scenarios): "${r[0]}" time ${days} days != 6kg×7700/${expDeficit} = ${expDays}`);
      }
    }
  }

  // macros → kcal (P×4 + C×4 + F×9)
  const macros = tables.find((t) => clean(t[0][0]) === 'Nutrient' && t.some((r) => /Protein/.test(r[0])));
  if (macros) {
    const get = (re) => {
      const r = macros.find((x) => re.test(clean(x[0])));
      return r ? num(r[2]) : null;
    };
    const protein = get(/^Protein/);
    const carbs = get(/^Carbs/);
    const fat = get(/^Fat/);
    const kcal = get(/^Calories/);
    if (protein !== null && carbs !== null && fat !== null && kcal !== null) {
      const exp = protein * 4 + carbs * 4 + fat * 9;
      if (!approx(exp, kcal, 25)) {
        errors.push(`${rel} (energy & macros): calories ${kcal} != ${protein}×4 + ${carbs}×4 + ${fat}×9 = ${exp}`);
      }
    }
  }

  return errors;
}
