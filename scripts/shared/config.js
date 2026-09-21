import path from 'node:path';

export const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(import.meta.dirname, '..', '..');
