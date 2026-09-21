import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clean } from '../shared/tables.js';

const FILES = {
  registry: path.join('src', 'food', 'diet', 'ingredients.md'),
  grocery: path.join('src', 'tasks', 'housekeeping', 'perishable.json'),
  food: path.join('src', 'tasks', 'housekeeping', 'ecommerce.json'),
  pharmacy: path.join('src', 'tasks', 'health', 'solo', 'pharmacy.md'),
};

// A task card is JSON (GitHub payload); its tables live inside `body`.
async function readDoc(repoDir, rel) {
  const raw = await readFile(path.join(repoDir, rel), 'utf8');
  if (rel.endsWith('.json')) {
    const task = JSON.parse(raw);
    return (task && task.body) || '';
  }
  return raw;
}

const RECIPES = {
  'src/food/recipes/pasta.md': 'Pasta',
  'src/food/recipes/beans.md': 'Beans',
  'src/food/recipes/rice.md': 'Rice',
  'src/food/recipes/juice.md': 'Detox juice',
  'src/food/recipes/coffee.md': 'Coffee',
};

const ALIASES = [
  ['chicken breast', 'Chicken breast'],
  ['sunflower seeds', 'Sunflower seeds'],
  ['paper filter', 'Coffee paper filters'],
  ['black beans', 'Black beans'],
  ['sardines', 'Canned sardines'],
  ['pork loin', 'Pork loin'],
  ['soy oil', 'Soy oil'],
  ['beetroot', 'Beetroot'],
  ['lemon', 'Lemon'],
  ['brazil nut', 'Brazil nuts'],
  ['tangerine', 'Tangerines'],
  ['banana', 'Bananas'],
  ['pasta', 'Dry pasta'],
  ['coffee', 'Coffee'],
  ['beef', 'Beef (lean)'],
  ['rice', 'Dry white rice'],
  ['liver', 'Bovine liver'],
  ['eggs', 'Eggs'],
];

const FREE_ITEMS = ['water', 'salt', 'seasoning'];

function parseTables(md) {
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
    const cells = t.split('|').map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    if (cells.length) rows.push(cells);
  }
  return tables;
}

function canonQty(qty, unit = '') {
  let s = `${qty} ${unit}`.trim().toLowerCase();
  s = s.replace(/units?\b/gi, '');
  s = s.replace(/×/g, 'x');
  return s.replace(/\s+/g, '');
}

function numVal(s) {
  s = s
    .trim()
    .toLowerCase()
    .replace(/\b(rolls?|packs?|boxes?|bags?|jars?|tubs?|tubes?|cans?|bottles?|bundles?|units?|bunch|spool)\b/g, '');
  let m = s.match(/^([\d.]+)\s*[x×]\s*([\d.]+)\s*([a-z]+)?$/);
  let mult = 1;
  let v;
  let unit;
  if (m) {
    mult = +m[1];
    v = +m[2];
    unit = m[3] || '';
  } else {
    m = s.match(/^([\d.]+)\s*([a-z]+)?$/);
    if (!m) return null;
    v = +m[1];
    unit = m[2] || '';
  }
  if (unit === 'kg') v *= 1000;
  if (unit === 'l') v *= 1000;
  return mult * v;
}

function checkCadence(rows, header, baseCol, cols, file) {
  const errors = [];
  for (const row of rows.slice(1)) {
    const name = clean(row[0]);
    if (!name || name === 'Total') continue;
    const weekly = numVal(clean(row[baseCol]));
    if (weekly === null) continue;
    for (const { col, mult } of cols) {
      if (header[col] === undefined) continue;
      const v = numVal(clean(row[col]));
      const expected = weekly * mult;
      if (v !== null && Math.abs(v - expected) > 1.5) {
        errors.push(`${file}: "${name}" ${header[col]} ${row[col]} != weekly ${row[baseCol]} × ${mult} = ${expected}`);
      }
    }
  }
  return errors;
}

function parseRegistry(md) {
  const rows = [];
  const supplements = [];
  const lines = md.split('\n');
  let recipe = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^###\s+(.+)$/);
    if (h) {
      recipe = h[1].replace(/^[^\p{L}\p{N}]+/u, '').trim();
      continue;
    }
    if (lines[i].trim() !== '<!-- begin table -->') continue;
    const end = lines.slice(i + 1).findIndex((l) => l.trim() === '<!-- end table -->');
    if (end === -1) continue;
    const tableLines = lines.slice(i + 1, i + 1 + end);
    const cells = tableLines
      .map((l) => l.trim().split('|').map((c) => c.trim()).filter(Boolean))
      .filter((c) => c.length && !c.every((x) => /^:?-{3,}:?$/.test(x)));
    if (!cells.length) {
      i += end;
      continue;
    }
    const header = cells[0];
    if (header[0] === 'Supplement') {
      for (const row of cells.slice(1)) {
        if (row.length) supplements.push(clean(row[0]));
      }
    } else if (header[0] === 'Ingredient') {
      const idx = {
        name: header.indexOf('Ingredient'),
        qty: header.indexOf('Qty'),
        freq: header.indexOf('×/wk'),
        weekly: header.indexOf('Weekly'),
        buy: header.indexOf('Buy'),
      };
      for (const row of cells.slice(1)) {
        if (!row.length) continue;
        rows.push({
          recipe,
          name: clean(row[idx.name]),
          qty: clean(row[idx.qty]),
          freq: clean(row[idx.freq]),
          weekly: clean(row[idx.weekly]),
          buy: clean(row[idx.buy]),
        });
      }
    }
    i += end;
  }
  return { rows, supplements };
}

function extractIngredients(md) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^##\s+.+[Ii]ngredients/.test(l));
  if (start === -1) return [];
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines
    .slice(start + 1, end === -1 ? lines.length : end)
    .filter((l) => /^[-*]/.test(l.trim()))
    .map((l) => l.trim().replace(/^[-*]\s*/, ''));
}

export async function checkFood(repoDir) {
  const errors = [];
  const read = async (rel) => readDoc(repoDir, rel);

  const [registryMd, groceryMd, foodMd, pharmacyMd] = await Promise.all([
    read(FILES.registry),
    read(FILES.grocery),
    read(FILES.food),
    read(FILES.pharmacy),
  ]);

  const { rows, supplements } = parseRegistry(registryMd);
  if (!rows.length) {
    errors.push(`${FILES.registry}: no ingredient rows found`);
    return errors;
  }

  const knownRecipes = new Set([...Object.values(RECIPES), 'Morning', 'Seasoning']);
  const inPerson = new Map();
  const remote = new Map();
  for (const r of rows) {
    if (!r.name) continue;
    if (!/^\d+(?:\.\d+)?$/.test(r.freq) || +r.freq <= 0) {
      errors.push(`${FILES.registry}: "${r.name}" has invalid ×/wk "${r.freq}"`);
      continue;
    }
    if (r.buy !== 'In-person' && r.buy !== 'Remote') {
      errors.push(`${FILES.registry}: "${r.name}" has invalid Buy label "${r.buy}"`);
      continue;
    }
    if (!r.weekly) {
      errors.push(`${FILES.registry}: "${r.name}" is missing Weekly qty`);
      continue;
    }
    if (!knownRecipes.has(r.recipe)) {
      errors.push(`${FILES.registry}: unknown recipe "${r.recipe}"`);
    }
    const expected = numVal(r.qty) === null ? null : numVal(r.qty) * +r.freq;
    const actual = numVal(r.weekly);
    if (expected !== null && actual !== null && Math.abs(expected - actual) > 1.5) {
      errors.push(`${FILES.registry}: "${r.name}" weekly ${r.weekly} != ${r.qty} × ${r.freq} = ${expected}`);
    }
    const q = canonQty(r.weekly);
    const target = r.buy === 'In-person' ? inPerson : remote;
    if (target.has(r.name)) errors.push(`${FILES.registry}: duplicate ingredient "${r.name}"`);
    target.set(r.name, q);
  }

  // --- grocery (in-person): weekly need must match the registry ---
  const groceryRows = parseTables(groceryMd).find(
    (t) => clean(t[0][0]) === 'Item' && t[0].includes('Weekly') && t[0].includes('Unit'),
  );
  if (!groceryRows) {
    errors.push(`${FILES.grocery}: shopping list table not found`);
  } else {
    const groceryHeader = groceryRows[0];
    const groceryWeekly = groceryHeader.indexOf('Weekly');
    const groceryUnit = groceryHeader.indexOf('Unit');
    const groceryCadence = [
      { col: groceryHeader.indexOf('½ wk'), mult: 0.5 },
      { col: groceryHeader.indexOf('1½ wk'), mult: 1.5 },
      { col: groceryHeader.indexOf('2 wk'), mult: 2 },
    ];
    const groceryMap = new Map();
    for (const row of groceryRows.slice(1)) {
      const name = clean(row[0]);
      if (!name || name === 'Total') continue;
      if (groceryMap.has(name)) errors.push(`${FILES.grocery}: duplicate item "${name}"`);
      groceryMap.set(name, canonQty(clean(row[groceryWeekly]), clean(row[groceryUnit])));
    }
    errors.push(...checkCadence(groceryRows, groceryHeader, groceryWeekly, groceryCadence, FILES.grocery));
    for (const [name, qty] of inPerson) {
      if (!groceryMap.has(name)) {
        errors.push(`${FILES.grocery}: missing registry item "${name}" (in-person, ${qty})`);
      } else if (groceryMap.get(name) !== qty) {
        errors.push(`${FILES.grocery}: "${name}" qty ${groceryMap.get(name)} != registry weekly ${qty}`);
      }
    }
    for (const [name, qty] of groceryMap) {
      if (!inPerson.has(name)) {
        errors.push(`${FILES.grocery}: "${name}" not in registry (in-person)`);
      } else if (inPerson.get(name) !== qty) {
        errors.push(`${FILES.grocery}: "${name}" qty ${qty} != registry weekly ${inPerson.get(name)}`);
      }
    }
  }

  // --- e-commerce (remote): weekly need must match the registry ---
  const foodCandidates = parseTables(foodMd).filter(
    (t) => clean(t[0][0]) === 'Item' && t[0].includes('1 wk'),
  );
  const foodRows = foodCandidates.find((t) =>
    t.slice(1).some((row) => remote.has(clean(row[0]))),
  );
  if (!foodRows) {
    errors.push(`${FILES.food}: buy-plan table not found (no table matches the registry remote items)`);
  } else {
    const foodHeader = foodRows[0];
    const foodWeekly = foodHeader.indexOf('1 wk');
    const foodCadence = [
      { col: foodHeader.indexOf('2 wk'), mult: 2 },
      { col: foodHeader.indexOf('4 wk'), mult: 4 },
      { col: foodHeader.indexOf('8 wk'), mult: 8 },
      { col: foodHeader.indexOf('16 wk'), mult: 16 },
    ];
    const foodMap = new Map();
    for (const row of foodRows.slice(1)) {
      const name = clean(row[0]);
      if (!name) continue;
      if (foodMap.has(name)) errors.push(`${FILES.food}: duplicate item "${name}"`);
      foodMap.set(name, canonQty(clean(row[foodWeekly])));
    }
    errors.push(...checkCadence(foodRows, foodHeader, foodWeekly, foodCadence, FILES.food));
    for (const [name, qty] of remote) {
      if (!foodMap.has(name)) {
        errors.push(`${FILES.food}: missing registry item "${name}" (remote, ${qty})`);
      } else if (foodMap.get(name) !== qty) {
        errors.push(`${FILES.food}: "${name}" weekly ${foodMap.get(name)} != registry weekly ${qty}`);
      }
    }
    for (const [name, qty] of foodMap) {
      if (!remote.has(name)) {
        errors.push(`${FILES.food}: "${name}" not in registry (remote)`);
      } else if (remote.get(name) !== qty) {
        errors.push(`${FILES.food}: "${name}" weekly ${qty} != registry weekly ${remote.get(name)}`);
      }
    }
  }

  for (const name of inPerson.keys()) {
    if (remote.has(name)) errors.push(`${FILES.registry}: "${name}" appears in both in-person and remote lists`);
  }

  // --- supplements: every registry supplement must be on the pharmacy buy list ---
  const pharmacyRows = parseTables(pharmacyMd).find((t) => clean(t[0][0]) === 'Item');
  if (!pharmacyRows) {
    errors.push(`${FILES.pharmacy}: shopping list table not found`);
  } else {
    const pharmNames = pharmacyRows
      .slice(1)
      .map((row) => clean(row[0]))
      .filter((n) => n && n !== 'Total');
    for (const s of supplements) {
      const matched = pharmNames.some(
        (n) => n.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(n.toLowerCase()),
      );
      if (!matched) {
        errors.push(`${FILES.pharmacy}: missing supplement "${s}" from registry`);
      }
    }
    // the supplement name-match above relies on the first Item table being the
    // supplements table — make that loud instead of silently breaking
    const hasSupplement = supplements.some(
      (s) => pharmNames.some(
        (n) => n.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(n.toLowerCase()),
      ),
    );
    if (!hasSupplement) {
      errors.push(`${FILES.pharmacy}: first table must hold the supplements (found: ${pharmNames.join(', ')})`);
    }
  }

  // --- cadence on non-food tables (cleaning/hygiene in ecommerce.md, pharmacy list) ---
  for (const [file, md, skipNames] of [
    [FILES.food, foodMd, new Set([...remote.keys()])],
    [FILES.pharmacy, pharmacyMd, new Set()],
  ]) {
    for (const t of parseTables(md)) {
      if (clean(t[0][0]) !== 'Item' || !t[0].includes('1 wk')) continue;
      if (skipNames.size && t.slice(1).some((r) => skipNames.has(clean(r[0])))) continue;
      const header = t[0];
      const weekly = header.indexOf('1 wk');
      const cadence = [
        { col: header.indexOf('2 wk'), mult: 2 },
        { col: header.indexOf('4 wk'), mult: 4 },
        { col: header.indexOf('8 wk'), mult: 8 },
        { col: header.indexOf('16 wk'), mult: 16 },
      ];
      errors.push(...checkCadence(t, header, weekly, cadence, file));
    }
  }

  // --- recipes: registry ingredients must be mentioned in the recipe files ---
  for (const [rel, recipeName] of Object.entries(RECIPES)) {
    const recipeRows = rows.filter((r) => r.recipe === recipeName);
    if (!recipeRows.length) {
      errors.push(`${FILES.registry}: no rows for recipe "${recipeName}" (${rel})`);
      continue;
    }
    let md;
    try {
      md = await read(rel);
    } catch {
      errors.push(`${rel}: recipe file not found`);
      continue;
    }
    const expectedNames = new Set(recipeRows.map((r) => r.name));
    const found = new Set();
    for (const line of extractIngredients(md)) {
      const norm = line.toLowerCase();
      if (FREE_ITEMS.some((f) => norm.includes(f))) continue;
      const matched = ALIASES.filter(([a]) => norm.includes(a)).map(([, c]) => c);
      if (!matched.length) errors.push(`${rel}: unknown ingredient mention "${line}"`);
      for (const c of matched) found.add(c);
    }
    for (const name of expectedNames) {
      if (!found.has(name)) errors.push(`${rel}: registry ingredient "${name}" not mentioned in Ingredients`);
    }
    for (const name of found) {
      if (!expectedNames.has(name)) errors.push(`${rel}: mentions "${name}" but registry has no "${recipeName}" row for it`);
    }
  }

  return errors;
}

// --- buy-plan files: every file must carry its required buy-plan table ---
export async function checkBuyTables(repoDir) {
  const errors = [];
  const required = {
    'src/tasks/housekeeping/perishable.json': (t) =>
      clean(t[0][0]) === 'Item' && t[0].includes('Weekly') && t[0].includes('Unit'),
    'src/tasks/housekeeping/ecommerce.json': (t) =>
      clean(t[0][0]) === 'Item' && t[0].includes('1 wk'),
    'src/tasks/health/solo/pharmacy.md': (t) =>
      clean(t[0][0]) === 'Item' && t[0].includes('1 wk'),
  };
  for (const [rel, predicate] of Object.entries(required)) {
    let md;
    try {
      md = await readDoc(repoDir, rel);
    } catch {
      errors.push(`${rel}: file not found`);
      continue;
    }
    if (!parseTables(md).some(predicate)) {
      errors.push(`${rel}: missing required buy-plan table`);
    }
  }
  return errors;
}

// --- buy plans: Example column, duplicates, alphabetical order, units convention ---
export async function checkBuyPlans(repoDir) {
  const errors = [];
  const read = async (rel) => readDoc(repoDir, rel);

  const [registryMd, ecommMd, pharmMd, groceryMd] = await Promise.all([
    read(FILES.registry),
    read(FILES.food),
    read(FILES.pharmacy),
    read(FILES.grocery),
  ]);

  const registry = parseRegistry(registryMd);
  const remote = new Set(registry.rows.filter((r) => r.buy === 'Remote').map((r) => r.name));

  const UNIT_RE = /\b(mg|ml|kg|l|g)\b/i;
  const COUNTABLE_RE = /\b(rolls?|bags?|packs?|boxes?|cloths?|tubes?|cans?|bottles?|units?)\b/i;
  const ITEM_COUNTABLE_RE = /sponge|toothbrush|razor|brush|cloth|bag|roll/i;
  const NA_RE = /^n\/a$/i;

  const checkTable = (t, file, opts = {}) => {
    const header = t[0];
    const exIdx = header.indexOf('Example');
    const szIdx = header.indexOf('Size');
    const wkIdx = header.indexOf('1 wk');
    if (opts.requireExample && exIdx === -1) {
      errors.push(`${file}: table missing "Example" column`);
    }
    if (opts.requireExample && szIdx === -1) {
      errors.push(`${file}: table missing "Size" column`);
    }
    const names = [];
    for (const row of t.slice(1)) {
      const name = clean(row[0]);
      if (!name || name === 'Total') continue;
      if (names.includes(name)) errors.push(`${file}: duplicate item "${name}"`);
      names.push(name);
      if (opts.requireExample) {
        if (exIdx === -1 || !clean(row[exIdx])) {
          errors.push(`${file}: "${name}" missing Example`);
        }
        if (szIdx === -1 || !clean(row[szIdx])) {
          errors.push(`${file}: "${name}" missing Size`);
        } else if (!NA_RE.test(clean(row[szIdx])) && !/\d/.test(clean(row[szIdx]))) {
          errors.push(`${file}: "${name}" Size "${clean(row[szIdx])}" needs a value or n/a`);
        }
      }
      if (opts.unitsRule && wkIdx !== -1) {
        const wk = clean(row[wkIdx]);
        if (!UNIT_RE.test(wk) && !COUNTABLE_RE.test(wk) && !ITEM_COUNTABLE_RE.test(name)) {
          errors.push(`${file}: "${name}" 1 wk "${wk}" needs ml/g unit or a countable item`);
        }
      }
    }
    for (let i = 1; i < names.length; i++) {
      if (names[i - 1].toLowerCase() > names[i].toLowerCase()) {
        errors.push(`${file}: items not sorted alphabetically — "${names[i - 1]}" before "${names[i]}"`);
        break;
      }
    }
  };

  for (const t of parseTables(ecommMd)) {
    if (clean(t[0][0]) !== 'Item') continue;
    const isFood = t.slice(1).some((row) => remote.has(clean(row[0])));
    checkTable(t, FILES.food, { requireExample: true, unitsRule: !isFood });
  }
  for (const t of parseTables(pharmMd)) {
    if (clean(t[0][0]) !== 'Item') continue;
    checkTable(t, FILES.pharmacy, { requireExample: true });
  }
  const grocery = parseTables(groceryMd).find(
    (t) => clean(t[0][0]) === 'Item' && t[0].includes('Weekly') && t[0].includes('Unit'),
  );
  if (grocery) checkTable(grocery, FILES.grocery);

  return errors;
}

// --- nutrition: every registry ingredient/supplement must have a nutrition
//     section in nutrition.md, and vice versa (no stale sections) ---
const NUTRITION_NUTRITION_MD = path.join('src', 'food', 'diet', 'nutrition.md');
const NUTRITION_EXCLUDED = /(coffee paper filters|seasoning|water|salt)/i;

function normNutrition(s) {
  return String(s)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

function nutritionMatch(name, section) {
  const a = normNutrition(name);
  const b = normNutrition(section);
  return a.includes(b) || b.includes(a);
}

export async function checkNutrition(repoDir) {
  const errors = [];
  const read = async (rel) => readFile(path.join(repoDir, rel), 'utf8');
  const [registryMd, nutritionMd] = await Promise.all([
    read(FILES.registry),
    read(NUTRITION_NUTRITION_MD),
  ]);

  const { rows, supplements } = parseRegistry(registryMd);
  const registryNames = [
    ...rows.map((r) => r.name).filter((n) => n && !NUTRITION_EXCLUDED.test(n)),
    ...supplements.filter((n) => n && !NUTRITION_EXCLUDED.test(n)),
  ];

  const sections = [...nutritionMd.matchAll(/^###\s+(.+)$/gm)]
    .map((m) => clean(m[1]))
    .filter(Boolean);

  for (const name of registryNames) {
    if (!sections.some((s) => nutritionMatch(name, s))) {
      errors.push(`${NUTRITION_NUTRITION_MD}: missing nutrition section for "${name}"`);
    }
  }
  for (const s of sections) {
    if (!registryNames.some((name) => nutritionMatch(name, s))) {
      errors.push(`${NUTRITION_NUTRITION_MD}: section "${s}" has no matching registry item`);
    }
  }

  return errors;
}
