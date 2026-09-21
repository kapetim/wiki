export function parseTables(md) {
  const tables = [];
  const lines = md.split('\n');
  let inTable = false;
  let rows = [];
  for (const line of lines) {
    const t = line.trim();
    if (t === '<!-- begin table -->') {
      inTable = true;
      rows = [];
      continue;
    }
    if (t === '<!-- end table -->') {
      inTable = false;
      if (rows.length) tables.push(rows);
      continue;
    }
    if (!inTable) continue;
    const cells = t.split(/(?<!\\)\|/).map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    if (cells.length) rows.push(cells);
  }
  return tables;
}

export function clean(s) {
  return s.replace(/\*\*/g, '').trim();
}
