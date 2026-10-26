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


// ---------- Scale (early retirement) rules ----------
// Payroll tax: 7.65% on $100,000 single wages
const young = () => ({ ...plan(), filing: 'Single', startYear: 2026, endAge: 95,
  a: { birthYear: 1993, birthMonth: 6, retireAge: 55, salary: 100000, raise: 0, yearsWorked: 10, k401Pct: 0.30, roth401kPct: 0, matchPct: 0.04, rothIra: 9000, ssFRA: '', ssClaimAge: 67, deathAge: '' },
  b: { birthYear: 1993, birthMonth: 1, retireYear: 2026, salary: 0, ssFRA: 0, ssClaimAge: 67, deathAge: '' },
  accounts: { ira: 50000, roth: 20000, rothBasis: 15000, taxable: 20000, taxableBasisPct: 1 },
  spending: { base: 50000, retireBase: 50000, phases: [], lateTrimAge: 0, lateTrimPct: 0, survivorPct: 1, adjustments: [] },
  health: { enabled: true, premium40: 7500, subsidy: true },
  roth: { enabled: true, ladder: true, mode: 'fill', bracket: 0.12, amount: 0, from: 2026, to: 2052, irmaaCap: true, acaCap: true },
});
const y1 = E.project(young()).rows[0];
assert.ok(Math.abs(y1.fica - 7650) < 1, 'payroll tax 7.65%');
// 401(k) capped at $24,500 even at 30%; IRA capped at $7,500; match uncapped
assert.ok(Math.abs(y1.contrib - (24500 + 4000 + 7500)) < 1, 'contribution limits');
// Social Security is lower when you stop working at 45 than at 67
assert.ok(E.effectiveSS({ ...young().a }, 2026, 1993 + 45) < E.effectiveSS({ ...young().a }, 2026, 1993 + 67));
// ACA: 9.96% between 300-400% FPL, nothing above 400%
assert.strictEqual(E.acaApplicable(3.5), 0.0996);
assert.strictEqual(E.acaApplicable(4.01), null);
// Earliest retirement exists and retiring there lasts
const fi = E.earliestRetirement(young());
assert.ok(fi && fi.result.success && fi.age >= 33 && fi.age <= 70);
// Before 59½, early IRA withdrawals carry a 10% penalty when nothing else is left
const pen = young(); pen.a.retireAge = 34; pen.accounts = { ira: 400000, roth: 0, rothBasis: 0, taxable: 0, taxableBasisPct: 1 }; pen.roth.enabled = false;
const pr = E.project(pen).rows.find(r => r.year === 2028);
assert.ok(pr.wIra > 0 && Math.abs(pr.pen - 0.1 * pr.wIra) < 1, '10% early-withdrawal penalty');

// ---------- Monthly investing (SIP) ----------
// $1,000/month into a bond index fund for 10 years, no inflation or recessions:
// matches the annuity-due formula at 3.5% minus the 0.04% fee
const sipPlan = young(); sipPlan.inflation = 0; sipPlan.stress.enabled = false; sipPlan.a.retireAge = 60;
sipPlan.sips = [{ fund: 'bond', monthly: 1000, from: 2026, years: 10, stepUp: 0, account: 'taxable' }];
const rr = 0.035 - 0.0004, fv = 12000 * ((Math.pow(1 + rr, 10) - 1) / rr) * (1 + rr);
assert.ok(Math.abs(E.project(sipPlan).rows.find(r => r.year === 2035).sipBal - fv) < 1, 'SIP future value');
// A recession year hits a stock fund but not a bond fund
assert.ok(E.sipReturn({ fund: 'sp500' }, { eq: -0.37, bd: 0.05 }, 0.9) < -0.36);
assert.ok(E.sipReturn({ fund: 'bond' }, { eq: -0.37, bd: 0.05 }, 0.9) > 0.04);
// A bigger SIP never makes the earliest retirement age later
const sipAge = m => { const q = young(); q.saving = { investLeftover: false }; q.sips = m ? [{ fund: 'sp500', monthly: m, from: 2026, years: 0, stepUp: 0, account: 'taxable' }] : []; const e = E.earliestRetirement(q); return e ? e.age : 99; };
assert.ok(sipAge(2000) <= sipAge(500) && sipAge(500) <= sipAge(0));
// Not investing leftover pay can only push retirement later
const lo = q => { const e = E.earliestRetirement(q); return e ? e.age : 99; };
const inv = young(), spent = young(); spent.saving = { investLeftover: false };
assert.ok(lo(spent) >= lo(inv));

// ---------- Term life insurance ----------
// Estimates reproduce MoneyGeek's 2026 table points
assert.strictEqual(Math.round(E.termPrice({ age: 40, sex: 'm', health: 'sp', coverage: 500000, term: 20 })), 59);
assert.strictEqual(Math.round(E.termPrice({ age: 40, sex: 'm', health: 'sp', coverage: 500000, term: 10 })), 41);
assert.strictEqual(Math.round(E.termPrice({ age: 30, sex: 'f', health: 'sp', coverage: 1000000, term: 20 })), 60);
// Premiums run only for the term; a quote replaces the estimate
const lp = young(); lp.life = [{ who: 'a', coverage: 500000, term: 20, sex: 'm', health: 'sp', quote: 40 }];
const lr = E.project(lp).rows;
assert.strictEqual(Math.round(lr.find(r => r.year === 2045).lifePrem), 480);
assert.strictEqual(lr.find(r => r.year === 2046).lifePrem, 0);
// Death during the term pays the coverage tax-free that year
const ld = young(); ld.filing = 'MFJ'; ld.b = { ...ld.a, birthYear: 1994, retireAge: 55 }; ld.a.deathAge = 40;
ld.life = [{ who: 'a', coverage: 500000, term: 20, sex: 'm', health: 'sp', quote: '' }];
assert.strictEqual(E.project(ld).rows.find(r => r.year === 1993 + 40).lifePayout, 500000);

// ---------- Medical stress test (Glide) ----------
// Out-of-pocket on a $250,000 bill by coverage, 2026 rules
assert.strictEqual(E.medicalOutOfPocket({ amount: 250000, cover: 'none' }), 250000);
assert.strictEqual(E.medicalOutOfPocket({ amount: 250000, cover: 'medigap' }), 283);
assert.strictEqual(E.medicalOutOfPocket({ amount: 250000, cover: 'advantage' }), 9250);
// Medical costs above 7.5% of AGI are itemized when that beats the standard deduction
const noMed = E.computeTax({ status: 'MFJ', idx: 1, wages: 0, ordinaryOther: 100000, ss: 0, ltcg: 0, n65: 2, year: 2030, stateRate: 0 });
const withMed = E.computeTax({ status: 'MFJ', idx: 1, wages: 0, ordinaryOther: 100000, ss: 0, ltcg: 0, n65: 2, year: 2030, stateRate: 0, medical: 50000 });
assert.strictEqual(Math.round(noMed.fed), 7244);
assert.strictEqual(Math.round(withMed.fed), 6404);
// Two uncovered $250K events lower the ending balance; covered ones barely do
const m0 = plan(), m1 = plan(), m2 = plan();
const evs = cover => ({ enabled: true, extra: 0, events: [{ who: 'a', age: 78, amount: 250000, cover }, { who: 'b', age: 84, amount: 250000, cover }] });
m1.medical = evs('none'); m2.medical = evs('medigap');
const e0 = E.project(m0).endBalance, e1 = E.project(m1).endBalance, e2 = E.project(m2).endBalance;
assert.ok(e1 < e0 - 500000 && e2 > e0 - 50000);

// ---------- Buying a home (Scale) ----------
// $450K home, 20% down, 6.5% for 30 years, bought now with no inflation: standard amortization
const hp = young(); hp.inflation = 0; hp.stress.enabled = false; hp.saving = { investLeftover: false };
hp.home = { enabled: true, buyYear: 2026, price: 450000, downPct: 0.2, closingPct: 0.03, rate: 0.065, term: 30, propTaxPct: 0.011, insurance: 1800, hoaMonthly: 0, maintPct: 0.01, growth: 0, pmiPct: 0.006, rentMonthly: 2000, fundMonthly: 0 };
const h1 = E.project(hp).rows[0];
assert.ok(Math.abs((h1.mortInt + h1.principal) / 12 - 2275.44) < 0.01, 'monthly mortgage payment');
assert.ok(Math.abs(h1.mortInt - 23282) < 1, 'first-year interest');
assert.strictEqual(E.project(hp).rows.find(r => r.year === 2056).mortInt, 0, 'paid off after 30 years');
// SALT cap: $40,400 in 2026, phased down above $505,000 of income, $10,000 from 2030
assert.strictEqual(Math.round(E.saltCap(2026, 100000)), 40400);
assert.strictEqual(Math.round(E.saltCap(2026, 600000)), 11900);
assert.strictEqual(E.saltCap(2030, 100000), 10000);
// Rent mode runs the same plan without buying: no mortgage, no equity
const rentRows = E.project(hp, { homeMode: 'rent' }).rows;
assert.ok(rentRows.every(r => !r.mortInt && !r.equity));

// ---------- Your home (Glide): stay, downsize, sell and rent ----------
const ho = plan(); ho.own = { enabled: true, plan: 'rent', value: 750000, basis: 320000, mortBal: 0, mortRate: 0.06, mortYears: 0,
  propTaxPct: 0.011, insurance: 2400, maintPct: 0.01, hoaMonthly: 0, growth: 0, sellYear: 2030, sellCostPct: 0.06, moving: 0,
  newPrice: 450000, newHoaMonthly: 0, rentMonthly: 3000, rentFrom: '' };
ho.inflation = 0;
// Sale: $750K less 6% costs = $705K cash; profit $385K is under the $500K couple exclusion, so nothing is taxed
const sale = E.project(ho).rows.find(r => r.year === 2030);
assert.strictEqual(Math.round(sale.saleCash), 705000);
assert.strictEqual(sale.saleGainTaxable, 0);
// Profit above the exclusion is taxed: basis $100K gives $605K profit, $105K taxable
const ho2 = JSON.parse(JSON.stringify(ho)); ho2.own.basis = 100000;
assert.strictEqual(Math.round(E.project(ho2).rows.find(r => r.year === 2030).saleGainTaxable), 105000);
// Stay keeps the equity; selling to rent leaves none
assert.ok(E.project(ho, { ownMode: 'stay' }).rows.at(-1).equity > 0 && E.project(ho, { ownMode: 'rent' }).rows.at(-1).equity === 0);

console.log('All engine checks passed.');
