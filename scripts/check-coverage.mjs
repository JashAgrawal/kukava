#!/usr/bin/env node
/**
 * Enforces a coverage floor so coverage cannot quietly regress.
 *
 * Reads the lcov report produced by `npm run test:coverage` and compares line
 * coverage against THRESHOLD. Exits non-zero when it falls short, which fails CI
 * before a regression lands on main.
 *
 * Override the floor with COVERAGE_THRESHOLD, e.g. COVERAGE_THRESHOLD=90.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD ?? 80);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'coverage', 'lcov.info');

let report;
try {
  report = readFileSync(reportPath, 'utf8');
} catch {
  console.error(`Could not read ${reportPath}. Run "npm run test:coverage" first.`);
  process.exit(1);
}

// lcov reports a "found" and a "hit" count per metric. They have to be tracked
// separately: summing both into one total would report every metric as 50%.
const METRICS = {
  LF: 'lines',
  LH: 'lines',
  FNF: 'functions',
  FNH: 'functions',
  BRF: 'branches',
  BRH: 'branches',
};
/** "found" keys build the denominator; only "hit" keys build the numerator. */
const FOUND_KEYS = new Set(['LF', 'FNF', 'BRF']);
const HIT_KEYS = new Set(['LH', 'FNH', 'BRH']);

const found = { lines: 0, functions: 0, branches: 0 };
const hit = { lines: 0, functions: 0, branches: 0 };

for (const rawLine of report.split('\n')) {
  const separator = rawLine.indexOf(':');
  if (separator === -1) continue;

  const key = rawLine.slice(0, separator);
  const metric = METRICS[key];
  if (!metric) continue;

  const value = Number(rawLine.slice(separator + 1));
  if (Number.isNaN(value)) continue;

  if (FOUND_KEYS.has(key)) {
    found[metric] += value;
  } else if (HIT_KEYS.has(key)) {
    hit[metric] += value;
  }
}

function percent(hitCount, foundCount) {
  return foundCount === 0 ? 100 : (hitCount / foundCount) * 100;
}

const lines = percent(hit.lines, found.lines);
const functions = percent(hit.functions, found.functions);
const branches = percent(hit.branches, found.branches);

console.log('Coverage summary');
console.log(`  lines      ${lines.toFixed(2)}%  (${hit.lines}/${found.lines})`);
console.log(`  functions  ${functions.toFixed(2)}%  (${hit.functions}/${found.functions})`);
console.log(`  branches   ${branches.toFixed(2)}%  (${hit.branches}/${found.branches})`);

if (lines < THRESHOLD) {
  console.error(
    `\nLine coverage ${lines.toFixed(2)}% is below the required ${THRESHOLD}%.`
  );
  process.exit(1);
}

console.log(`\nLine coverage meets the required ${THRESHOLD}%.`);