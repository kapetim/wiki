// Task model — the single source of truth for task JSON cards.
// Every task card (.json) follows this template exactly, shaped as a
// GitHub issue payload (title / labels / body) plus recurrence fields.

export const TASK_KEYS = ['title', 'labels', 'body', 'priority', 'tag', 'recurrence', 'interval', 'deadline', 'enabled'];

export const KEY_ORDER = new Map(TASK_KEYS.map((k, i) => [k, i]));

export const RECURRENCE = ['days', 'weeks', 'months', 'years'];

export const TAGS = ['government', 'health', 'housekeeping'];

export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 4;
