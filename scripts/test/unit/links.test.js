import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { checkLinks } from '../../checks/links.js';

async function repo(files) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'links-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await (await import('node:fs/promises')).mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content);
  }
  return dir;
}

test('links: correct same-file anchor passes', async () => {
  const dir = await repo({
    'a.md': '# 🗂️ Secondary accounts\n\n[Go](#%EF%B8%8F-secondary-accounts)\n',
  });
  try {
    assert.deepEqual(await checkLinks(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('links: variation-selector anchor missing fails', async () => {
  const dir = await repo({
    'a.md': '# 🗂️ Secondary accounts\n\n[Go](#-secondary-accounts)\n',
  });
  try {
    const errors = await checkLinks(dir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /broken anchor -> #-secondary-accounts/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('links: leading-dash missing fails', async () => {
  const dir = await repo({
    'a.md': '# 🎡 Life dream\n\n[Go](#life-dream-and-rat-wheel)\n',
  });
  try {
    const errors = await checkLinks(dir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /broken anchor/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('links: cross-file anchor resolves against target file', async () => {
  const dir = await repo({
    'a.md': '[Go](./b.md#%EF%B8%8F-mega)\n',
    'b.md': '# 🗄️ Mega\n',
  });
  try {
    assert.deepEqual(await checkLinks(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('links: broken cross-file anchor fails', async () => {
  const dir = await repo({
    'a.md': '[Go](./b.md#-mega)\n',
    'b.md': '# 🗄️ Mega\n',
  });
  try {
    const errors = await checkLinks(dir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /broken anchor -> \.\/b\.md#-mega/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('links: broken target file fails', async () => {
  const dir = await repo({
    'a.md': '[Go](./missing.md#x)\n',
  });
  try {
    const errors = await checkLinks(dir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /broken link/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
