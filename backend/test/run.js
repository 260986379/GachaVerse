#!/usr/bin/env node
/**
 * Test runner.
 *
 * Each *.test.js file is a self-contained script that prints its own PASS/FAIL
 * lines and exits non-zero if anything failed. They run in separate processes on
 * purpose: several stub modules via require.cache (the database pool, the Enka
 * service, the auth middleware) and hold module-level state such as rate-limit
 * counters and caches. Sharing one process would leak that state between suites
 * and produce results that depend on file order.
 *
 * Usage:
 *   npm test                 run everything
 *   npm test -- client-ip    run suites whose filename contains "client-ip"
 *   npm test -- --verbose    show each suite's full output
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const filters = args.filter((a) => !a.startsWith('-'));

const dir = __dirname;
const suites = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.js'))
  .filter((f) => !filters.length || filters.some((k) => f.includes(k)))
  .sort();

if (!suites.length) {
  console.error(filters.length ? `No suites match: ${filters.join(', ')}` : 'No test suites found.');
  process.exit(1);
}

let totalPass = 0;
let totalFail = 0;
const failed = [];

console.log(`\nRunning ${suites.length} suite${suites.length === 1 ? '' : 's'}\n`);

for (const file of suites) {
  const started = Date.now();
  const res = spawnSync(process.execPath, [path.join(dir, file)], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const out = (res.stdout || '') + (res.stderr || '');
  const ms = Date.now() - started;

  const summary = out.match(/(\d+) passed, (\d+) failed/);
  const passed = summary ? Number(summary[1]) : 0;
  const failedCount = summary ? Number(summary[2]) : 0;
  totalPass += passed;
  totalFail += failedCount;

  const crashed = res.status !== 0 && !summary;
  const ok = res.status === 0 && !crashed;
  if (!ok) failed.push(file);

  const label = ok ? 'PASS' : 'FAIL';
  const counts = summary ? `${passed} assertions` : crashed ? 'crashed' : '';
  console.log(`  ${label}  ${file.padEnd(34)} ${counts.padEnd(16)} ${ms}ms`);

  // Always surface the detail for a failure; --verbose shows it for everything.
  if (verbose || !ok) {
    console.log(out.split('\n').map((l) => '        ' + l).join('\n'));
  }
}

console.log(`\n${'-'.repeat(64)}`);
if (failed.length) {
  console.log(`FAILED  ${failed.length} of ${suites.length} suites: ${failed.join(', ')}`);
  console.log(`        ${totalPass} assertions passed, ${totalFail} failed\n`);
  process.exit(1);
}
console.log(`OK      ${suites.length} suites, ${totalPass} assertions passed\n`);
