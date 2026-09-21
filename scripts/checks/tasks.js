import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { parseTables, clean } from '../shared/tables.js';
import { TASK_KEYS, KEY_ORDER, RECURRENCE, TAGS, PRIORITY_MIN, PRIORITY_MAX } from './task-model.js';

const RECURRENCE_SET = new Set(RECURRENCE);
const TAGS_SET = new Set(TAGS);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

async function readJsonTask(full) {
  const text = await readFile(full, 'utf8');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'invalid JSON' };
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'task JSON must be an object' };
  }
  return { data };
}

export async function checkTasks(repoDir) {
  const errors = [];
  const root = path.join(repoDir, 'src', 'tasks');
  const names = new Map();
  const counts = new Map();
  for (const tag of TAGS) counts.set(tag, 0);

  const stack = [[root, 0]];
  while (stack.length) {
    const [dir, depth] = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(repoDir, full);
      if (e.isDirectory()) {
        if (depth === 0) {
          if (!TAGS_SET.has(e.name)) {
            errors.push(`${rel}: unknown task folder "${e.name}" (expected one of ${[...TAGS].sort().join(', ')})`);
          } else {
            stack.push([full, depth + 1]);
          }
        }
        // depth >= 1: content subfolder (details live with the tag) — not a task, skipped
      } else if (e.name.endsWith('.json')) {
        if (depth === 0) {
          errors.push(`${rel}: unexpected loose task file — each task must live in its tag folder`);
          continue;
        }

        const folder = path.basename(dir);
        const { data, error } = await readJsonTask(full);
        if (error) {
          errors.push(`${rel}: ${error}`);
          continue;
        }

        for (const key of TASK_KEYS) {
          if (!(key in data)) errors.push(`${rel}: missing key "${key}"`);
        }

        let lastIdx = -1;
        for (const key of Object.keys(data)) {
          const idx = KEY_ORDER.get(key);
          if (idx === undefined) {
            errors.push(`${rel}: unknown key "${key}"`);
          } else if (idx < lastIdx) {
            errors.push(`${rel}: keys out of order (got "${key}")`);
          } else {
            lastIdx = idx;
          }
        }

        if (data.title !== undefined && typeof data.title !== 'string') {
          errors.push(`${rel}: title must be a string`);
        } else if (data.title !== undefined) {
          if (data.title.trim() === '') {
            errors.push(`${rel}: title must not be empty`);
          }
          if (!/^\p{Extended_Pictographic}/u.test(data.title)) {
            errors.push(`${rel}: title should start with an emoji, got "${data.title}"`);
          } else if (!data.title.replace(/^\p{Extended_Pictographic}\s*/u, '')) {
            errors.push(`${rel}: title must have text after the emoji`);
          }
          if (data.title.length > 80) {
            errors.push(`${rel}: title too long (${data.title.length} chars, cap 80)`);
          }
        }

        if (data.labels !== undefined) {
          if (!Array.isArray(data.labels) || data.labels.length === 0) {
            errors.push(`${rel}: labels must be a non-empty array`);
          } else if (data.labels.some((l) => typeof l !== 'string' || l.trim() === '')) {
            errors.push(`${rel}: labels must be non-empty strings`);
          } else if (folder !== undefined && !data.labels.includes(folder)) {
            errors.push(`${rel}: labels must include the tag "${folder}"`);
          }
        }

        if (data.body !== undefined) {
          if (typeof data.body !== 'string' || data.body.trim() === '') {
            errors.push(`${rel}: body must be a non-empty string`);
          } else {
            if (!/^# 🧭 Steps\s*$/m.test(data.body)) {
              errors.push(`${rel}: body must contain the "# 🧭 Steps" section`);
            }
            if (!/^\s*1\.\s/m.test(data.body)) {
              errors.push(`${rel}: "# 🧭 Steps" must contain at least one numbered step (1. …)`);
            }
            if (!/^## ✅ Done when\s*$/m.test(data.body)) {
              errors.push(`${rel}: body must contain the "## ✅ Done when" section`);
            }
            const doneStart = data.body.search(/^## ✅ Done when\s*$/m);
            const doneTail = doneStart === -1 ? '' : data.body.slice(doneStart);
            if (!/^-\s/m.test(doneTail)) {
              errors.push(`${rel}: "## ✅ Done when" must contain at least one bullet (- …)`);
            }
          }
        }

        if (data.priority !== undefined) {
          const priority = data.priority;
          if (!Number.isInteger(priority) || priority < PRIORITY_MIN || priority > PRIORITY_MAX) {
            errors.push(`${rel}: priority must be an integer ${PRIORITY_MIN}-${PRIORITY_MAX}, got ${JSON.stringify(data.priority)}`);
          }
        }
        if (data.recurrence !== undefined && !RECURRENCE_SET.has(data.recurrence)) {
          errors.push(`${rel}: recurrence must be one of ${RECURRENCE.join(', ')}, got "${data.recurrence}"`);
        }
        if (data.tag !== undefined) {
          if (!TAGS_SET.has(data.tag)) {
            errors.push(`${rel}: unknown tag "${data.tag}"`);
          } else if (data.tag !== folder) {
            errors.push(`${rel}: tag "${data.tag}" does not match folder "${folder}"`);
          }
        }
        if (data.interval !== undefined) {
          const interval = data.interval;
          if (!Number.isInteger(interval) || interval <= 0) {
            errors.push(`${rel}: interval must be a positive integer, got ${JSON.stringify(data.interval)}`);
          }
        }
        if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
          errors.push(`${rel}: enabled must be true or false, got ${JSON.stringify(data.enabled)}`);
        }

        if (data.deadline !== undefined) {
          if (typeof data.deadline !== 'string' || !ISO_DATE.test(data.deadline)) {
            errors.push(`${rel}: deadline must be ISO YYYY-MM-DD, got ${JSON.stringify(data.deadline)}`);
          } else if (!isValidDate(data.deadline)) {
            errors.push(`${rel}: deadline "${data.deadline}" is not a real calendar date`);
          }
        }
        if (data.enabled === true && data.deadline !== undefined && typeof data.deadline === 'string' && ISO_DATE.test(data.deadline) && data.deadline < todayISO()) {
          errors.push(`${rel}: overdue — deadline ${data.deadline} is in the past; bump the anchor or disable the task`);
        }

        if (data.title) {
          const key = data.title.toLowerCase();
          if (names.has(key)) {
            errors.push(`${rel}: duplicate task title "${data.title}" (also ${names.get(key)})`);
          } else {
            names.set(key, rel);
          }
        }

        counts.set(folder, (counts.get(folder) || 0) + 1);
      }
    }
  }

  for (const [tag, count] of counts) {
    if (count === 0) errors.push(`src/tasks: no tasks for tag "${tag}"`);
  }

  const indexRel = path.join('src', 'tasks', 'readme.md');
  let indexMd;
  try {
    indexMd = await readFile(path.join(repoDir, indexRel), 'utf8');
  } catch {
    indexMd = null;
  }
  if (!indexMd) {
    errors.push(`${indexRel}: missing tag index readme`);
  } else {
    const table = parseTables(indexMd).find((t) => clean(t[0][0]) === 'Tag' && t[0].some((h) => clean(h).includes('Folder')));
    if (!table) {
      errors.push(`${indexRel}: missing tag index table (Tag | Folder | # Tasks)`);
    } else {
      const headers = table[0].map((h) => clean(h).toLowerCase());
      const folderIdx = headers.findIndex((h) => h.includes('folder'));
      const countIdx = headers.findIndex((h) => h.includes('task'));
      const seen = new Set();
      for (const row of table.slice(1)) {
        const tag = clean(row[0]);
        const folder = clean(row[folderIdx]).replace(/\/$/, '');
        const declared = parseInt(clean(row[countIdx]), 10);
        if (!TAGS_SET.has(tag)) errors.push(`${indexRel}: unknown tag "${tag}" in index`);
        if (folder !== tag) errors.push(`${indexRel}: folder "${folder}" does not match tag "${tag}"`);
        if (counts.get(folder) !== declared) {
          errors.push(`${indexRel}: "${folder}" declared ${declared} tasks but found ${counts.get(folder)}`);
        }
        seen.add(folder);
      }
      for (const tag of TAGS) {
        if (!seen.has(tag)) errors.push(`${indexRel}: tag "${tag}" missing from index table`);
      }
    }
  }

  return errors;
}
