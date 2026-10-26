// Retirement projection engine — rebuilt from the Sept 2026 longevity model,
// extended for early retirement (paycheck saving, 59½ rules, ACA, Roth ladders).
// Pure functions, no DOM. Year-by-year, nominal dollars.
(function (root) {
  'use strict';

  // ---------- 2026 federal tables ----------
  // Brackets: IRS Rev. Proc. 2025-32. IRMAA: CMS 2026. Limits: IRS Notice for 2026 plan year.
  // Social Security: SSA 2026 wage base and PIA bend points. ACA: Rev. Proc. 2025-25, 2025 HHS poverty guidelines.
  const T = {
    baseYear: 2026,
    brackets: {
      MFJ: [[24800, .10], [100800, .12], [211400, .22], [403550, .24], [512450, .32], [768700, .35], [Infinity, .37]],
      Single: [[12400, .10], [50400, .12], [105700, .22], [201775, .24], [256225, .32], [640600, .35], [Infinity, .37]],
    },
    stdDed: { MFJ: 32200, Single: 16100 },
    age65Add: { MFJ: 1650, Single: 2050 },          // per qualifying person
    seniorBonus: 6000, seniorBonusPhase: { MFJ: 150000, Single: 75000 }, seniorBonusYears: [2025, 2028],
    ltcg: { MFJ: [98900, 613700], Single: [49450, 545500] },
    niit: { MFJ: 250000, Single: 200000 },           // not indexed
    ssBase: { MFJ: [32000, 44000], Single: [25000, 34000] }, // not indexed
    irmaa: {
      MFJ: [218000, 274000, 342000, 410000, 750000],
      Single: [109000, 137000, 171000, 205000, 500000],
      partB: [202.90, 284.10, 405.80, 527.50, 649.20, 689.90],
      partD: [0, 14.50, 37.50, 60.40, 83.30, 91.00],
    },
    // Payroll tax
    ssWageBase: 184500, ficaSS: 0.062, ficaMed: 0.0145, addlMed: 0.009, addlMedTh: { MFJ: 250000, Single: 200000 },
    // Contribution limits
    k401: 24500, k401Catch: 8000, ira: 7500, iraCatch: 1100,
    // Social Security benefit formula (today's dollars)
    pia: [1286, 7749],
    // ACA: poverty line for the household (base + per extra person), applicable % bands, age rating
    fpl: [15650, 5500],
    acaBands: [[1.33, .021, .021], [1.5, .0314, .0419], [2.0, .0419, .066], [2.5, .066, .0844], [3.0, .0844, .0996], [4.0, .0996, .0996]],
    acaAge: [[0, .765], [21, 1.0], [25, 1.004], [30, 1.135], [35, 1.222], [40, 1.278], [45, 1.5], [50, 1.786], [55, 2.23], [60, 2.714], [64, 3.0]],
  };

  // IRS Uniform Lifetime Table (2022+)
  const ULT = { 72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6 };
  const rmdFactor = age => ULT[Math.min(age, 105)] || 27.4;
  const rmdStartAge = birthYear => birthYear >= 1960 ? 75 : birthYear >= 1951 ? 73 : 72;
  const num = v => { const n = +v; return isFinite(n) ? n : 0; };
  const has = v => v !== undefined && v !== null && v !== '';

  // Full retirement age in months
  function fraMonths(by) {
    if (by >= 1960) return 67 * 12;
    if (by <= 1954) return 66 * 12;
    return 66 * 12 + (by - 1954) * 2;
  }
  function ownFactor(by, claimAge) {
    const d = Math.round(claimAge * 12) - fraMonths(by);
    if (d >= 0) return 1 + Math.min(d, 70 * 12 - fraMonths(by)) * (2 / 300); // 8%/yr
    const m = -d;
    return 1 - Math.min(m, 36) * (5 / 900) - Math.max(m - 36, 0) * (5 / 1200);
  }
  function spousalFactor(by, claimAge) {
    const m = Math.max(0, fraMonths(by) - Math.round(claimAge * 12));
    return 1 - Math.min(m, 36) * (25 / 3600) - Math.max(m - 36, 0) * (5 / 1200);
  }

  // ---------- Social Security estimate from earnings (today's dollars) ----------
  function piaFromAime(aime) {
    const [b1, b2] = T.pia;
    return 0.9 * Math.min(aime, b1) + 0.32 * Math.max(0, Math.min(aime, b2) - b1) + 0.15 * Math.max(0, aime - b2);
  }
  // Past years are estimated by walking today's salary back by the raise rate.
  function ssEstimate(P, y0, stopYear) {
    const raise = num(P.raise), sal = num(P.salary), cap = T.ssWageBase, yrs = [];
    const past = Math.max(0, Math.round(num(P.yearsWorked)));
    for (let k = 1; k <= past; k++) yrs.push(Math.min(cap, sal / Math.pow(1 + raise, k)));
    for (let y = y0; y < stopYear; y++) yrs.push(Math.min(cap, sal * Math.pow(1 + raise, y - y0)));
    yrs.sort((a, b) => b - a);
    const aime = yrs.slice(0, 35).reduce((s, x) => s + x, 0) / 420;
    return piaFromAime(aime);
  }
  // Monthly benefit at full retirement age, today's dollars.
  // Without a work history the statement figure is used as-is (original behavior).
  function effectiveSS(P, y0, retireYear) {
    if (!has(P.yearsWorked)) return num(P.ssFRA);
    const actual = ssEstimate(P, y0, retireYear);
    const full = ssEstimate(P, y0, P.birthYear + 67);
    if (num(P.ssFRA) > 0) return full > 0 ? num(P.ssFRA) * actual / full : num(P.ssFRA);
    return actual;
  }
  const retYearOf = P => has(P.retireAge) ? num(P.birthYear) + num(P.retireAge) : num(P.retireYear);

  function taxOnBrackets(income, br, idx) {
    let tax = 0, prev = 0;
    for (const [top, rate] of br) {
      const t = top * idx;
      if (income > prev) tax += (Math.min(income, t) - prev) * rate;
      prev = t;
      if (income <= t) break;
    }
    return tax;
  }
  function bracketTop(rate, status, idx) {
    for (const [top, r] of T.brackets[status]) if (r === rate) return top * idx;
    return 0;
  }

  // Federal + state income tax for one year.
  function computeTax(o) {
    const { status, idx, wages, ordinaryOther, ss, ltcg, n65, year, stateRate } = o;
    const medical = o.medical || 0;
    const otherInc = wages + ordinaryOther + ltcg;
    const prov = otherInc + 0.5 * ss;
    const [b1, b2] = T.ssBase[status];
    let taxableSS = 0;
    if (prov > b1) {
      taxableSS = Math.min(0.5 * (prov - b1), 0.5 * ss, 0.5 * (b2 - b1));
      if (prov > b2) taxableSS = Math.min(0.85 * ss, taxableSS + 0.85 * (prov - b2));
    }
    const ordinary = wages + ordinaryOther + taxableSS;
    const agi = ordinary + ltcg;
    // Standard deduction, or itemized medical costs above 7.5% of AGI if that is larger
    const itemized = Math.max(0, medical - 0.075 * agi);
    let ded = Math.max(T.stdDed[status] * idx + T.age65Add[status] * idx * n65, itemized);
    if (year >= T.seniorBonusYears[0] && year <= T.seniorBonusYears[1] && n65 > 0) {
      const ph = T.seniorBonusPhase[status];
      ded += Math.max(0, T.seniorBonus * n65 - 0.06 * Math.max(0, agi - ph));
    }
    const taxableOrd = Math.max(0, ordinary - ded);
    const leftover = Math.max(0, ded - ordinary);
    const gains = Math.max(0, ltcg - leftover);
    const ordTax = taxOnBrackets(taxableOrd, T.brackets[status], idx);
    const [z, f] = T.ltcg[status].map(x => x * idx);
    const start = taxableOrd, end = taxableOrd + gains;
    const seg = (lo, hi) => Math.max(0, Math.min(end, hi) - Math.max(start, lo));
    const gt = seg(z, f) * 0.15 + seg(f, Infinity) * 0.20;
    const niit = 0.038 * Math.max(0, Math.min(ltcg, agi - T.niit[status]));
    const stateTax = stateRate * Math.max(0, agi - T.stdDed[status] * idx);
    const fed = ordTax + gt + niit;
    let marg = 0.10;
    for (const [top, r] of T.brackets[status]) { marg = r; if (taxableOrd < top * idx) break; }
    return { fed, state: stateTax, total: fed + stateTax, agi, taxableSS, taxableOrd, marg, niit, itemized: itemized > T.stdDed[status] * idx + T.age65Add[status] * idx * n65 };
  }

  function irmaaTier(magi, status, idx) {
    const th = T.irmaa[status];
    let tier = 0;
    for (let i = 0; i < th.length; i++) if (magi > th[i] * idx) tier = i + 1;
    return tier;
  }

  // ACA: share of income expected toward the benchmark plan; null above the 400% cliff.
  function acaApplicable(ratio) {
    if (ratio > 4) return null;
    if (ratio <= 1.33) return T.acaBands[0][1];
    let lo = 1.33;
    for (const [top, a, b] of T.acaBands) {
      if (ratio <= top) return top === lo ? a : a + (b - a) * (ratio - lo) / (top - lo);
      lo = top;
    }
    return null;
  }
  function acaAgeFactor(age) {
    const t = T.acaAge;
    if (age >= 64) return 3.0;
    for (let i = t.length - 1; i >= 0; i--) {
      if (age >= t[i][0]) {
        const [a0, f0] = t[i], nx = t[i + 1];
        return nx ? f0 + (nx[1] - f0) * (age - a0) / (nx[0] - a0) : f0;
      }
    }
    return 1;
  }

  // ---------- Monthly investing (SIP) fund types ----------
  // eq: share in stocks (null = follows the plan's glide path); ex: return vs. the plan's stock/bond
  // assumptions; fee: default expense ratio. Returns follow the plan's year-by-year stock and bond
  // returns, so recessions, rebounds and random markets apply to SIPs too.
  const FUNDS = {
    sp500:    { name: 'S&P 500 index fund',            eq: 1,    ex: 0,      fee: 0.0003 },
    totalus:  { name: 'Total US stock market fund',    eq: 1,    ex: 0,      fee: 0.0003 },
    intl:     { name: 'International stock index fund', eq: 1,   ex: -0.005, fee: 0.0008 },
    target:   { name: 'Target-date fund',              eq: null, ex: 0,      fee: 0.0012 },
    balanced: { name: 'Balanced 60/40 fund',           eq: 0.6,  ex: 0,      fee: 0.0015 },
    bond:     { name: 'Bond index fund',               eq: 0,    ex: 0,      fee: 0.0004 },
    custom:   { name: 'Other / custom',                eq: 1,    ex: 0,      fee: 0.0050 },
  };
  function sipReturn(s, r, planEq) {
    const F = FUNDS[s.fund] || FUNDS.custom;
    const e = s.fund === 'target' ? planEq : s.fund === 'custom' ? Math.min(1, Math.max(0, has(s.eqShare) ? num(s.eqShare) : 1)) : F.eq;
    const fee = has(s.fee) ? num(s.fee) : F.fee;
    return e * r.eq + (1 - e) * r.bd + F.ex - fee;
  }

  // ---------- Term life insurance price estimate ----------
  // MoneyGeek 2026 averages: 20-year term, non-smoker, average health (Standard Plus), monthly $
  // for $250K / $500K / $1M at ages 25–65. Other terms, health classes and smokers are scaled.
  const LIFE = {
    ages: [25, 30, 35, 40, 45, 50, 55, 60, 65],
    m: [[23, 32, 67], [26, 38, 74], [28, 47, 85], [35, 59, 109], [44, 90, 170], [77, 137, 262], [100, 231, 440], [215, 395, 771], [245, 591, 1195]],
    f: [[22, 30, 54], [23, 32, 60], [24, 37, 68], [28, 47, 86], [35, 69, 130], [59, 102, 194], [75, 168, 317], [157, 286, 545], [178, 415, 806]],
    term: { 10: 0.70, 15: 0.82, 20: 1.0, 25: 1.30, 30: 1.75 },
    health: { pp: 0.59, p: 0.73, sp: 1.0, s: 1.12, smoker: 3.3 },
  };
  function termPrice({ age, sex, health, coverage, term }) {
    const tbl = LIFE[sex === 'f' ? 'f' : 'm'], A = LIFE.ages;
    const a = Math.min(65, Math.max(25, num(age)));
    let i = 0; while (i < A.length - 2 && a > A[i + 1]) i++;
    const fr = (a - A[i]) / (A[i + 1] - A[i]);
    const row = tbl[i].map((v, k) => v + (tbl[i + 1][k] - v) * fr);
    const c = Math.max(0, num(coverage)), pts = [250000, 500000, 1000000];
    let m;
    if (c <= pts[0]) m = row[0] * Math.max(0.5, c / pts[0]);
    else if (c <= pts[1]) m = row[0] + (row[1] - row[0]) * (c - pts[0]) / (pts[1] - pts[0]);
    else if (c <= pts[2]) m = row[1] + (row[2] - row[1]) * (c - pts[1]) / (pts[2] - pts[1]);
    else m = row[2] * c / pts[2] * 0.95;
    const tk = Object.keys(LIFE.term).map(Number).reduce((b, k) => Math.abs(k - num(term)) < Math.abs(b - num(term)) ? k : b, 20);
    return m * LIFE.term[tk] * (LIFE.health[health] || 1);
  }
  // Monthly premium for a policy: your own quote if entered, otherwise the estimate at the start age.
  function policyMonthly(pol, P, startYear) {
    if (has(pol.quote) && num(pol.quote) > 0) return num(pol.quote);
    return termPrice({ age: num(pol.start || startYear) - num(P.birthYear), sex: pol.sex, health: pol.health, coverage: pol.coverage, term: pol.term });
  }

  // ---------- Medical events: out-of-pocket by coverage (2026 CMS / KFF figures, today's $) ----------
  const MED_2026 = { partADed: 1736, partBDed: 283, maMoop: 9250, partBShare: 0.35 };
  function medicalOutOfPocket(ev) {
    const bill = num(ev.amount), M = MED_2026;
    switch (ev.cover) {
      case 'medigap':   return Math.min(bill, M.partBDed);                         // Plan G: only the Part B deductible
      case 'advantage': return Math.min(bill, M.maMoop);                            // capped at the in-network maximum
      case 'original':  return Math.min(bill, M.partADed + M.partBDed + 0.2 * Math.max(0, M.partBShare * bill - M.partBDed)); // no cap on Part B's 20%
      case 'custom':    return bill * (has(ev.pay) ? num(ev.pay) : 1);
      default:          return bill;                                                // not covered: you pay it all
    }
  }

  // ---------- Return path ----------
  function eventYears(p, retA) {
    return (p.stress.enabled ? p.stress.events : []).map(e => ({
      ...e, y: has(e.retireOffset) ? retA + num(e.retireOffset) : num(e.year),
    }));
  }
  function yearReturns(p, year, rng, evs) {
    const ev = evs.find(e => e.y === year);
    let eq = p.returns.equity, bd = p.returns.bond, tag = '';
    if (rng) {
      eq = p.returns.equity + rng.normal() * p.mc.equitySd;
      bd = p.returns.bond + rng.normal() * p.mc.bondSd;
    }
    if (ev) { eq = +ev.equity; if (has(ev.bond)) bd = +ev.bond; tag = 'recession'; }
    else if (p.stress.enabled && p.stress.recoveryYears > 0 && !rng) {
      if (evs.some(e => e.y < year && year - e.y <= p.stress.recoveryYears)) { eq = p.stress.recoveryEquity; tag = 'recovery'; }
    }
    return { eq, bd, tag };
  }

  function equityWeight(p, age) {
    const g = p.glide;
    if (!g.enabled) return g.startEq;
    if (age <= g.startAge) return g.startEq;
    if (age >= g.endAge) return g.endEq;
    return g.startEq + (g.endEq - g.startEq) * (age - g.startAge) / (g.endAge - g.startAge);
  }

  // ---------- Projection ----------
  function project(p, opts = {}) {
    const rng = opts.rng || null;
    const y0 = p.startYear;
    const A = p.a, B = p.b, couple = p.filing === 'MFJ';
    const endYear = A.birthYear + p.endAge;
    const retA = retYearOf(A), retB = couple ? retYearOf(B) : retA;
    const FA = effectiveSS(A, y0, retA), FB = couple ? effectiveSS(B, y0, retB) : 0;
    const evs = eventYears(p, retA);
    const H = p.health || {};
    let ira = num(p.accounts.ira), roth = num(p.accounts.roth), tax = num(p.accounts.taxable);
    let basis = tax * num(p.accounts.taxableBasisPct);
    // Roth ordering: contributions, then conversions oldest first, then earnings
    let rothContrib = has(p.accounts.rothBasis) ? Math.min(roth, num(p.accounts.rothBasis)) : roth;
    const convs = [];
    const rows = [];
    const investLeftover = !(p.saving && p.saving.investLeftover === false);
    const sips = (p.sips || []).map(s => ({ ...s, bal: 0, basis: 0, paid: 0, merged: false }));
    let sipAtRetire = 0;
    const magiHist = {}; magiHist[y0 - 2] = p.priorMagi; magiHist[y0 - 1] = p.priorMagi;
    let totalMedical = 0;
    let shortfallYear = null, totalTax = 0, totalIrmaa = 0, totalShort = 0, totalPen = 0, totalHealth = 0;
    const deathA = has(A.deathAge) ? A.birthYear + +A.deathAge : Infinity;
    const deathB = couple && has(B.deathAge) ? B.birthYear + +B.deathAge : Infinity;

    for (let y = y0; y <= endYear; y++) {
      const t = y - y0;
      const infl = Math.pow(1 + p.inflation, t);
      const idx = infl;
      const ageA = y - A.birthYear, ageB = couple ? y - B.birthYear : null;
      const aliveA = y <= deathA, aliveB = couple && y <= deathB;
      if (!aliveA && !aliveB) break;
      const status = couple && aliveA && aliveB ? 'MFJ' : 'Single';
      const survivor = couple && !(aliveA && aliveB);
      const n65 = (aliveA && ageA >= 65 ? 1 : 0) + (aliveB && ageB >= 65 ? 1 : 0);

      // ----- SIPs stop at retirement and join the other savings -----
      if (y >= retA) for (const s of sips) {
        if (s.merged) continue;
        s.merged = true; sipAtRetire += s.bal / Math.pow(1 + p.inflation, t);
        if (s.account === 'roth') { roth += s.bal; rothContrib += s.paid; }
        else { tax += s.bal; basis += s.basis; }
        s.bal = 0;
      }

      // ----- Paycheck -----
      const wageOf = (P, alive, ret) => alive && y < ret ? num(P.salary) * infl * Math.pow(1 + num(P.raise), t) : 0;
      const wA = wageOf(A, aliveA, retA), wB = couple ? wageOf(B, aliveB, retB) : 0;
      const wages = wA + wB;
      const contrib = (P, w, age) => {
        if (w <= 0) return { pre: 0, r401: 0, match: 0, rira: 0 };
        const lim = (T.k401 + (age >= 50 ? T.k401Catch : 0)) * infl;
        let pre = w * num(P.k401Pct), r401 = w * num(P.roth401kPct);
        const tot = pre + r401; if (tot > lim) { const s = lim / tot; pre *= s; r401 *= s; }
        const match = w * num(P.matchPct);
        const rira = Math.min(num(P.rothIra) * infl, (T.ira + (age >= 50 ? T.iraCatch : 0)) * infl);
        return { pre, r401, match, rira };
      };
      const cA = contrib(A, wA, ageA), cB = couple ? contrib(B, wB, ageB) : contrib(B, 0, 0);
      const pre = cA.pre + cB.pre, r401 = cA.r401 + cB.r401, match = cA.match + cB.match, rira = cA.rira + cB.rira;
      // SIP contributions, paid from take-home pay while working
      let sipOut = 0;
      const iraRoom = Math.max(0, (T.ira + (ageA >= 50 ? T.iraCatch : 0)) * infl - cA.rira);
      let rothRoomLeft = iraRoom;
      for (const s of sips) {
        s.out = 0;
        if (s.merged || wages <= 0) continue;
        const from = num(s.from), yrs = num(s.years);
        if (y < from || (yrs > 0 && y >= from + yrs) || y >= retA) continue;
        let amt = num(s.monthly) * 12 * infl * Math.pow(1 + num(s.stepUp), y - from);
        if (s.account === 'roth') { amt = Math.min(amt, rothRoomLeft); rothRoomLeft -= amt; }
        s.out = Math.max(0, amt); sipOut += s.out;
      }
      const wagesTaxable = wages - pre;
      const wagesCash = wages - pre - r401 - rira;
      const fica = T.ficaSS * (Math.min(wA, T.ssWageBase * infl) + Math.min(wB, T.ssWageBase * infl))
        + T.ficaMed * wages + T.addlMed * Math.max(0, wages - T.addlMedTh[status]);
      const anyWorking = wages > 0;

      // ----- Social Security -----
      const ssPerson = (P, fra, by) => {
        const claimYear = by + Math.floor(P.ssClaimAge);
        if (y < claimYear) return { own: 0, months: 0 };
        const months = y === claimYear ? Math.max(0, 12 - (P.birthMonth - 1) - Math.round((P.ssClaimAge % 1) * 12)) : 12;
        return { own: fra * ownFactor(by, P.ssClaimAge) * infl, months };
      };
      const sa = ssPerson(A, FA, A.birthYear);
      const sb = couple ? ssPerson(B, FB, B.birthYear) : { own: 0, months: 0 };
      let ssA = 0, ssB = 0;
      if (couple && aliveA && aliveB) {
        const both = sa.months > 0 && sb.months > 0;
        const spA = both ? Math.max(0, 0.5 * FB * infl * spousalFactor(A.birthYear, A.ssClaimAge) - sa.own) : 0;
        const spB = both ? Math.max(0, 0.5 * FA * infl * spousalFactor(B.birthYear, B.ssClaimAge) - sb.own) : 0;
        ssA = (sa.own + spA) * sa.months; ssB = (sb.own + spB) * sb.months;
      } else if (couple) {
        const [sS, sD, fD] = aliveA ? [sa, sb, FB] : [sb, sa, FA];
        const decBen = sD.own > 0 ? Math.max(sD.own, fD * infl * 0.825) : fD * infl;
        const amt = Math.max(sS.own, decBen) * sS.months;
        if (aliveA) ssA = amt; else ssB = amt;
      } else {
        ssA = sa.own * sa.months;
      }
      const ss = ssA + ssB;

      const pension = (p.pension.annual && y >= p.pension.startYear)
        ? p.pension.annual * (p.pension.cola ? infl : 1) * (survivor ? p.pension.survivorPct : 1) : 0;

      // ----- Spending -----
      let base = p.spending.base;
      if (num(p.spending.retireBase) > 0 && y >= retA) base = num(p.spending.retireBase);
      for (const ph of p.spending.phases) if (y >= +ph.from && y <= +ph.to && ph.amount !== '') base = +ph.amount;
      if (p.spending.lateTrimAge && ageA >= p.spending.lateTrimAge) base *= (1 - p.spending.lateTrimPct);
      let spend = base * infl;
      for (const a of p.spending.adjustments) if (y >= +a.from && y <= +a.to) spend += +a.amount * (a.inflates ? infl : 1);
      if (survivor) spend *= p.spending.survivorPct;
      let oneOrd = 0, oneGain = 0, oneCash = 0, oneExpense = 0;
      for (const e of p.oneTime) {
        if (+e.year !== y) continue;
        if (e.kind === 'expense') oneExpense += +e.amount;
        else { oneCash += +e.amount; if (e.kind === 'ordinary') oneOrd += +e.amount; else oneGain += +e.amount * (+e.gainPct); }
      }
      spend += oneExpense;

      // ----- Medical stress test: hospital stays / home nursing at chosen ages -----
      let medical = 0;
      const MED = p.medical || {};
      if (MED.enabled) for (const ev of (MED.events || [])) {
        const isB = ev.who === 'b' && couple, P = isB ? B : A;
        if (y !== num(P.birthYear) + num(ev.age) || !(isB ? aliveB : aliveA)) continue;
        medical += medicalOutOfPocket(ev) * infl * Math.pow(1 + num(MED.extra), t);
      }
      spend += medical;

      // ----- Term life: level premiums while insured and alive; tax-free payout if the insured dies in the term -----
      let lifePrem = 0, lifePayout = 0;
      for (const pol of (p.life || [])) {
        const P = pol.who === 'b' && couple ? B : A, dYear = pol.who === 'b' && couple ? deathB : deathA;
        const from = num(pol.start || y0), to = from + num(pol.term);
        if (y < from || y >= to) continue;
        if (y < dYear) lifePrem += policyMonthly(pol, P, y0) * 12;
        else if (y === dYear) lifePayout += num(pol.coverage);
      }
      spend += lifePrem; oneCash += lifePayout;

      // ----- Health insurance before Medicare (only once nobody in the household works) -----
      let healthFull = 0, hh = 0;
      if (H.enabled && !anyWorking) {
        const per = num(H.premium40) / 1.278 * infl;
        if (aliveA && ageA < 65) { healthFull += per * acaAgeFactor(ageA); hh++; }
        if (couple && aliveB && ageB < 65) { healthFull += per * acaAgeFactor(ageB); hh++; }
      }
      const hhSize = couple && aliveA && aliveB ? 2 : 1;
      const fplNow = (T.fpl[0] + T.fpl[1] * (hhSize - 1)) * infl;
      const healthCost = agi => {
        if (healthFull <= 0) return 0;
        if (!H.subsidy) return healthFull;
        const pct = acaApplicable(Math.max(0, agi) / fplNow);
        if (pct == null) return healthFull;
        // Below the poverty line there is no tax credit (Medicaid may apply instead);
        // charge as if income were at the poverty line rather than assuming free coverage.
        return Math.min(healthFull, pct * Math.max(agi, fplNow));
      };

      // ----- RMD -----
      let owner = p.iraOwner === 'b' && couple ? B : A;
      if (couple && !(owner === A ? aliveA : aliveB)) owner = owner === A ? B : A;
      const ownerAge = y - owner.birthYear;
      const rmd = ownerAge >= rmdStartAge(owner.birthYear) ? ira / rmdFactor(ownerAge) : 0;
      const early = ownerAge < 59 || (ownerAge === 59 && num(owner.birthMonth) > 6);

      // ----- IRMAA -----
      let irmaa = 0, tierNow = 0;
      if (n65 > 0) {
        const lb = magiHist[y - 2];
        const lbStatus = magiHist['s' + (y - 2)] || status;
        tierNow = irmaaTier(lb == null ? 0 : lb, lbStatus, infl);
        irmaa = n65 * 12 * ((T.irmaa.partB[tierNow] - T.irmaa.partB[0]) + T.irmaa.partD[tierNow]) * infl;
      }

      // ----- Roth conversion -----
      let conv = 0;
      const rc = p.roth;
      const cFrom = rc.ladder ? retA : rc.from, cTo = rc.ladder ? owner.birthYear + 59 : rc.to;
      const preIra = Math.max(0, ira + pre + match - rmd);
      let capVal = Infinity;
      if (rc.irmaaCap) capVal = Math.min(capVal, T.irmaa[status][0] * infl - 1000);
      if (rc.acaCap && H.subsidy && healthFull > 0) capVal = Math.min(capVal, 4 * fplNow - 500);
      if (rc.enabled && y >= cFrom && y <= cTo && preIra > 0) {
        if (rc.mode === 'fixed') conv = Math.min(preIra, rc.amount * infl);
        else {
          const est = computeTax({ status, idx, wages: wagesTaxable, ordinaryOther: pension + rmd + oneOrd, ss, ltcg: oneGain, n65, year: y, stateRate: 0 });
          const ded = T.stdDed[status] * idx + T.age65Add[status] * idx * n65;
          const room = bracketTop(rc.bracket, status, idx) + ded - (wagesTaxable + pension + rmd + oneOrd + est.taxableSS);
          conv = Math.max(0, Math.min(preIra, room));
          if (capVal < Infinity) conv = Math.max(0, Math.min(conv, capVal - est.agi));
        }
      }

      // ----- Withdrawals: iterate until taxes, penalties and health premiums settle -----
      const seasoned = convs.filter(c => y - c.y >= 5).reduce((s, c) => s + c.amt, 0);
      const order = early ? ['taxable', 'rothA', 'ira', 'rothE']
        : p.withdrawOrder === 'protect-ira' ? ['taxable', 'rothA', 'ira'] : ['taxable', 'ira', 'rothA'];
      let wTax = 0, wIra = 0, wRoth = 0, wRothE = 0, gain = 0, taxRes = null, need = 0, short = 0, pen = 0, health = 0;
      let taxGuess = 0;
      const inflow = wagesCash - sipOut + ss + pension + oneCash;
      const solve = () => {
        taxGuess = 0; health = healthCost(0);
        for (let it = 0; it < 16; it++) {
          need = spend + irmaa + fica + health + taxGuess;
          let gap = need - (inflow + rmd);
          wTax = 0; wIra = 0; wRoth = 0; wRothE = 0;
          const rothTot = roth + r401 + rira + conv;
          const access = early ? Math.min(rothTot, rothContrib + r401 + rira + seasoned) : rothTot;
          const bal = { taxable: tax, ira: Math.max(0, ira + pre + match - rmd - conv), rothA: access, rothE: early ? Math.max(0, rothTot - access) : 0 };
          if (gap > 0) {
            for (const k of order) {
              if (gap <= 0) break;
              const take = Math.min(gap, bal[k]);
              if (k === 'taxable') wTax = take; else if (k === 'ira') wIra = take; else if (k === 'rothA') wRoth = take; else wRothE = take;
              gap -= take;
            }
          }
          short = Math.max(0, gap);
          const gf = tax > 0 ? Math.max(0, 1 - basis / tax) : 0;
          gain = wTax * gf;
          taxRes = computeTax({ status, idx, wages: wagesTaxable, ordinaryOther: pension + rmd + wIra + wRothE + conv + oneOrd, ss, ltcg: gain + oneGain, n65, year: y, stateRate: p.stateRate, medical });
          pen = early ? 0.10 * (wIra + wRothE) : 0;
          const newHealth = healthCost(taxRes.agi);
          const tg = taxRes.total + pen;
          const done = Math.abs(tg - taxGuess) < 1 && Math.abs(newHealth - health) < 1;
          taxGuess = tg;
          // damp the ACA cliff so the loop settles instead of flipping
          health = it < 8 ? newHealth : Math.max(health, newHealth);
          if (done) break;
        }
      };
      solve();
      if (conv > 0 && rc.mode !== 'fixed' && capVal < Infinity) {
        for (let k = 0; k < 5 && taxRes.agi > capVal && conv > 0; k++) { conv = Math.max(0, conv - (taxRes.agi - capVal) - 500); solve(); }
      }
      need = spend + irmaa + fica + health + taxGuess;
      const surplus = Math.max(0, inflow + rmd + wTax + wIra + wRoth + wRothE - need);
      // Without "invest leftover pay", spare take-home pay is assumed spent; other surpluses are still invested.
      const invested = investLeftover || !anyWorking ? surplus : Math.max(0, surplus - Math.max(0, wagesCash - sipOut));

      // ----- Apply flows -----
      const begin = ira + roth + tax + sips.reduce((a, s) => a + s.bal, 0);
      const gFrac = tax > 0 ? Math.max(0, 1 - basis / tax) : 0;
      basis -= wTax * (1 - gFrac);
      tax -= wTax;
      ira += pre + match - rmd - conv - wIra;
      roth += r401 + rira + conv - wRoth - wRothE;
      rothContrib += r401 + rira;
      if (conv > 0) convs.push({ y, amt: conv });
      let left = wRoth + wRothE;
      const fromContrib = Math.min(left, rothContrib); rothContrib -= fromContrib; left -= fromContrib;
      for (const c of convs) { if (left <= 0) break; const k = Math.min(left, c.amt); c.amt -= k; left -= k; }
      tax += invested; basis += invested;
      for (const s of sips) if (s.out > 0) { s.bal += s.out; s.basis += s.out; s.paid += s.out; }
      ira = Math.max(0, ira); roth = Math.max(0, roth); tax = Math.max(0, tax); basis = Math.max(0, Math.min(basis, tax));
      rothContrib = Math.min(rothContrib, roth);

      // ----- Growth (withdrawals and contributions at start of year) -----
      const r = yearReturns(p, y, rng, evs);
      const w = equityWeight(p, ageA);
      const blended = w * r.eq + (1 - w) * r.bd;
      ira *= 1 + blended; roth *= 1 + blended; tax *= 1 + blended;
      let sipBal = 0;
      for (const s of sips) if (!s.merged) { s.bal *= 1 + sipReturn(s, r, w); sipBal += s.bal; }

      magiHist[y] = taxRes.agi; magiHist['s' + y] = status;
      if (short > 1 && shortfallYear == null) shortfallYear = y;
      const allTax = taxRes.total + fica + pen;
      totalMedical += medical / infl;
      totalTax += allTax; totalIrmaa += irmaa; totalShort += short; totalPen += pen; totalHealth += health;

      rows.push({
        year: y, ageA: aliveA ? ageA : null, ageB: couple && aliveB ? ageB : null, status, survivor,
        begin, spend, wages, ss, pension, oneCash, rmd, conv, wTax, wIra, wRoth: wRoth + wRothE,
        lifePrem, lifePayout, medical, itemized: taxRes.itemized,
        contrib: pre + r401 + match + rira + sipOut, saved: pre + r401 + match + rira + sipOut + invested, sipOut, sipBal,
        fica, pen, health, healthFull, incomeTax: taxRes.total,
        fedTax: taxRes.fed, stateTax: taxRes.state, tax: allTax, marg: taxRes.marg, agi: taxRes.agi,
        irmaa, irmaaTier: tierNow, short, eqW: w, ret: blended, tag: r.tag, working: anyWorking,
        ira, roth, taxable: tax, end: ira + roth + tax + sipBal,
      });
    }
    const last = rows[rows.length - 1];
    const minRow = rows.reduce((m, r) => r.end < m.end ? r : m, rows[0]);
    return {
      rows, shortfallYear, totalMedical, totalTax, totalIrmaa, totalShort, totalPen, totalHealth,
      endBalance: last.end, endReal: last.end / Math.pow(1 + p.inflation, last.year - y0),
      minRow, success: shortfallYear == null, endYear: last.year,
      retireYear: retA, ssFRA: { a: FA, b: FB },
      sipAtRetire: sipAtRetire || rows.length && sips.reduce((a, s) => a + s.bal, 0) / Math.pow(1 + p.inflation, last.year - y0),
    };
  }

  // ---------- Retirement-year search ----------
  function withRetireYear(p, yearA) {
    const q = JSON.parse(JSON.stringify(p));
    const couple = q.filing === 'MFJ';
    const off = couple ? retYearOf(q.b) - retYearOf(q.a) : 0;
    q.a.retireAge = ''; q.a.retireYear = yearA;
    if (couple && num(q.b.salary) > 0) { q.b.retireAge = ''; q.b.retireYear = yearA + off; }
    return q;
  }
  // Earliest year Person A can stop working and still last to the plan's end age.
  function earliestRetirement(p, maxAge = 70) {
    const last = num(p.a.birthYear) + maxAge;
    for (let y = p.startYear; y <= last; y++) {
      const r = project(withRetireYear(p, y));
      if (r.success) return { year: y, age: y - p.a.birthYear, result: r };
    }
    return null;
  }

  // ---------- Monte Carlo ----------
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function makeRng(seed) {
    const u = mulberry32(seed); let spare = null;
    return { normal() { if (spare != null) { const s = spare; spare = null; return s; } let a, b, s; do { a = u() * 2 - 1; b = u() * 2 - 1; s = a * a + b * b; } while (!s || s >= 1); const m = Math.sqrt(-2 * Math.log(s) / s); spare = b * m; return a * m; } };
  }
  // randomOnly: drop the fixed recession years, since random markets already include crashes.
  function monteCarlo(p, n = 500, seed = 20261, successOnly = false, randomOnly = false) {
    if (randomOnly) { p = JSON.parse(JSON.stringify(p)); p.stress.enabled = false; }
    const paths = []; let ok = 0;
    for (let i = 0; i < n; i++) {
      const r = project(p, { rng: makeRng(seed + i * 7919) });
      if (r.success) ok++;
      if (!successOnly) paths.push(r.rows.map(x => x.end));
    }
    if (successOnly) return { successRate: ok / n, n };
    const len = paths[0].length, pct = q => { const out = []; for (let j = 0; j < len; j++) { const col = paths.map(pa => pa[j] ?? 0).sort((a, b) => a - b); out.push(col[Math.floor(q * (col.length - 1))]); } return out; };
    return { successRate: ok / n, p10: pct(0.10), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9), n };
  }

  const api = { T, FUNDS, LIFE, MED_2026, medicalOutOfPocket, termPrice, policyMonthly, sipReturn, project, monteCarlo, computeTax, ownFactor, rmdStartAge, rmdFactor, irmaaTier, equityWeight,
    earliestRetirement, withRetireYear, effectiveSS, ssEstimate, acaApplicable, acaAgeFactor, retYearOf };
  if (typeof module !== 'undefined') module.exports = api; else root.RetireEngine = api;
})(this);
