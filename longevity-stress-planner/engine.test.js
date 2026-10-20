// Sanity checks for the projection engine. Run: node engine.test.js
const assert = require('assert');
const E = require('./engine.js');

// 2026 MFJ, $100,000 wages, under 65: taxable $67,800 -> $2,480 + 12% x $43,000 = $7,640
assert.strictEqual(Math.round(E.computeTax({ status: 'MFJ', idx: 1, wages: 100000, ordinaryOther: 0, ss: 0, ltcg: 0, n65: 0, year: 2026, stateRate: 0 }).fed), 7640);

// Social Security claiming factors (born 1960+, FRA 67)
assert.ok(Math.abs(E.ownFactor(1964, 62) - 0.70) < 1e-9);
assert.ok(Math.abs(E.ownFactor(1964, 70) - 1.24) < 1e-9);

// RMD start ages under SECURE 2.0
assert.strictEqual(E.rmdStartAge(1955), 73);
assert.strictEqual(E.rmdStartAge(1964), 75);

// IRMAA: 2026 MFJ tiers start above $218,000
assert.strictEqual(E.irmaaTier(218000, 'MFJ', 1), 0);
assert.strictEqual(E.irmaaTier(218001, 'MFJ', 1), 1);

// Recessions must cost money relative to the same plan without them
const plan = () => ({
  startYear: 2026, filing: 'MFJ', endAge: 95, inflation: 0.03, stateRate: 0, priorMagi: 180000,
  a: { birthYear: 1964, birthMonth: 5, retireYear: 2027, salary: 140000, ssFRA: 3300, ssClaimAge: 67, deathAge: '' },
  b: { birthYear: 1966, birthMonth: 9, retireYear: 2026, salary: 0, ssFRA: 1400, ssClaimAge: 67, deathAge: '' },
  iraOwner: 'a', accounts: { ira: 1100000, roth: 120000, taxable: 650000, taxableBasisPct: 0.55 },
  pension: { annual: 0, startYear: 2027, cola: false, survivorPct: 0.5 },
  spending: { base: 96000, phases: [], lateTrimAge: 80, lateTrimPct: 0.1, survivorPct: 0.75, adjustments: [] },
  oneTime: [], returns: { equity: 0.07, bond: 0.035 },
  glide: { enabled: true, startEq: 0.4, startAge: 67, endEq: 0.3, endAge: 90 },
  stress: { enabled: true, recoveryYears: 3, recoveryEquity: 0.12, events: [{ year: 2030, equity: -0.3, bond: '' }, { year: 2040, equity: -0.3, bond: '' }] },
  roth: { enabled: false, mode: 'fill', bracket: 0.22, amount: 0, from: 2027, to: 2038, irmaaCap: true },
  withdrawOrder: 'protect-ira', mc: { equitySd: 0.17, bondSd: 0.06 },
});
const stressed = E.project(plan());
const q = plan(); q.stress.enabled = false;
const calm = E.project(q);
assert.ok(stressed.endBalance < calm.endBalance, 'recessions should reduce the ending balance');
assert.strictEqual(stressed.rows[0].year, 2026);
assert.strictEqual(stressed.rows[stressed.rows.length - 1].year, 1964 + 95);

// Survivor years file as Single
const s = plan(); s.a.deathAge = 78;
assert.ok(E.project(s).rows.filter(r => r.year > 1964 + 78).every(r => r.status === 'Single'));

console.log('All engine checks passed.');
