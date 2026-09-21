#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { REPO_DIR } from '../shared/config.js';

// Next occurrence = deadline + interval × recurrence (ISO deadlines only).
// Approximate deadlines (free text) have no computable next date.
export function nextOccurrence(deadline, recurrence, interval) {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const d = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const n = Number(interval);
  if (recurrence === 'days') d.setDate(d.getDate() + n);
  else if (recurrence === 'weeks') d.setDate(d.getDate() + n * 7);
  else if (recurrence === 'months') d.setMonth(d.getMonth() + n);
  else if (recurrence === 'years') d.setFullYear(d.getFullYear() + n);
  else return null;
  return d.toISOString().slice(0, 10);
}

async function main() {
  const rel = process.argv[2];
  if (!rel) {
    console.error('usage: node scripts/tools/next-task.js <task.json path>');
    process.exit(1);
  }
  const full = path.resolve(REPO_DIR, rel);
  const task = JSON.parse(await readFile(full, 'utf8'));
  if (!task || !task.deadline) {
    console.error(`[skip] ${rel}: no ISO deadline — nothing to compute`);
    process.exit(0);
  }
  const next = nextOccurrence(task.deadline, task.recurrence, task.interval);
  if (!next) {
    console.error(`[skip] ${rel}: next occurrence not computable`);
    process.exit(0);
  }
  console.log(`${rel}: next = ${next}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
