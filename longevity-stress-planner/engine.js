// Retirement projection engine — rebuilt from the Sept 2026 longevity model.
// Pure functions, no DOM. Year-by-year, nominal dollars.
(function (root) {
  'use strict';

  // ---------- 2026 federal tables (IRS Rev. Proc. 2025-32; CMS 2026 IRMAA) ----------
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
  };

  // IRS Uniform Lifetime Table (2022+)
  const ULT = { 72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6 };
  const rmdFactor = age => ULT[Math.min(age, 105)] || 27.4;
  const rmdStartAge = birthYear => birthYear >= 1960 ? 75 : birthYear >= 1951 ? 73 : 72;

  // Full retirement age in months
  function fraMonths(by) {
    if (by >= 1960) return 67 * 12;
    if (by <= 1954) return 66 * 12;
    return 66 * 12 + (by - 1954) * 2;
  }
  // Own-benefit factor for claiming at claimAge (years) vs FRA
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

  // Federal + state tax for one year.
  function computeTax(o) {
    const { status, idx, wages, ordinaryOther, ss, ltcg, n65, year, stateRate } = o;
    // Social Security taxation
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
    let ded = T.stdDed[status] * idx + T.age65Add[status] * idx * n65;
    if (year >= T.seniorBonusYears[0] && year <= T.seniorBonusYears[1] && n65 > 0) {
      const ph = T.seniorBonusPhase[status];
      ded += Math.max(0, T.seniorBonus * n65 - 0.06 * Math.max(0, agi - ph));
    }
    const taxableOrd = Math.max(0, ordinary - ded);
    const leftover = Math.max(0, ded - ordinary);
    const gains = Math.max(0, ltcg - leftover);
    const ordTax = taxOnBrackets(taxableOrd, T.brackets[status], idx);
    const [z, f] = T.ltcg[status].map(x => x * idx);
    let gt = 0, start = taxableOrd, end = taxableOrd + gains;
    const seg = (lo, hi) => Math.max(0, Math.min(end, hi) - Math.max(start, lo));
    gt = seg(z, f) * 0.15 + seg(f, Infinity) * 0.20;
    const niit = 0.038 * Math.max(0, Math.min(ltcg, agi - T.niit[status]));
    const stateTax = stateRate * Math.max(0, agi - T.stdDed[status] * idx);
    const fed = ordTax + gt + niit;
    // marginal ordinary rate
    let marg = 0.10;
    for (const [top, r] of T.brackets[status]) { marg = r; if (taxableOrd < top * idx) break; }
    return { fed, state: stateTax, total: fed + stateTax, agi, taxableSS, taxableOrd, marg, niit };
  }

  function irmaaTier(magi, status, idx) {
    const th = T.irmaa[status];
    let tier = 0;
    for (let i = 0; i < th.length; i++) if (magi > th[i] * idx) tier = i + 1;
    return tier;
  }

  // ---------- Return path ----------
  function yearReturns(p, year, rng) {
    const ev = (p.stress.enabled ? p.stress.events : []).find(e => +e.year === year);
    let eq = p.returns.equity, bd = p.returns.bond, tag = '';
    if (rng) {
      eq = p.returns.equity + rng.normal() * p.mc.equitySd;
      bd = p.returns.bond + rng.normal() * p.mc.bondSd;
    }
    if (ev) { eq = +ev.equity; if (ev.bond !== '' && ev.bond != null) bd = +ev.bond; tag = 'recession'; }
    else if (p.stress.enabled && p.stress.recoveryYears > 0 && !rng) {
      const prior = p.stress.events.map(e => +e.year).filter(y => y < year && year - y <= p.stress.recoveryYears);
      if (prior.length) { eq = p.stress.recoveryEquity; tag = 'recovery'; }
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
    let ira = +p.accounts.ira, roth = +p.accounts.roth, tax = +p.accounts.taxable;
    let basis = tax * p.accounts.taxableBasisPct;
    const rows = [];
    const magiHist = {}; magiHist[y0 - 2] = p.priorMagi; magiHist[y0 - 1] = p.priorMagi;
    let shortfallYear = null, totalTax = 0, totalIrmaa = 0, totalShort = 0;
    const deathA = A.deathAge ? A.birthYear + +A.deathAge : Infinity;
    const deathB = couple && B.deathAge ? B.birthYear + +B.deathAge : Infinity;

    for (let y = y0; y <= endYear; y++) {
      const t = y - y0;
      const infl = Math.pow(1 + p.inflation, t);
      const idx = infl; // brackets indexed with CPI
      const ageA = y - A.birthYear, ageB = couple ? y - B.birthYear : null;
      const aliveA = y <= deathA, aliveB = couple && y <= deathB;
      if (!aliveA && !aliveB) break;
      // filing: MFJ through year of death, then single
      const status = couple && aliveA && aliveB ? 'MFJ' : 'Single'; // death year still files jointly
      const survivor = couple && !(aliveA && aliveB);
      const n65 = (aliveA && ageA >= 65 ? 1 : 0) + (aliveB && ageB >= 65 ? 1 : 0);

      // Wages
      let wages = 0;
      if (aliveA && y < A.retireYear) wages += A.salary * Math.pow(1 + p.inflation, t);
      if (aliveB && y < B.retireYear) wages += B.salary * Math.pow(1 + p.inflation, t);

      // Social Security (monthly FRA amounts in today's $, COLA = inflation)
      const ssPerson = (P, age, by) => {
        const claimYear = by + Math.floor(P.ssClaimAge);
        if (y < claimYear) return { own: 0, months: 0 };
        const months = y === claimYear ? Math.max(0, 12 - (P.birthMonth - 1) - Math.round((P.ssClaimAge % 1) * 12)) : 12;
        return { own: P.ssFRA * ownFactor(by, P.ssClaimAge) * infl, months };
      };
      const sa = ssPerson(A, ageA, A.birthYear);
      const sb = couple ? ssPerson(B, ageB, B.birthYear) : { own: 0, months: 0 };
      let ssA = 0, ssB = 0;
      if (couple && aliveA && aliveB) {
        // spousal top-up once both have claimed
        const both = sa.months > 0 && sb.months > 0;
        const spA = both ? Math.max(0, 0.5 * B.ssFRA * infl * spousalFactor(A.birthYear, A.ssClaimAge) - sa.own) : 0;
        const spB = both ? Math.max(0, 0.5 * A.ssFRA * infl * spousalFactor(B.birthYear, B.ssClaimAge) - sb.own) : 0;
        ssA = (sa.own + spA) * sa.months; ssB = (sb.own + spB) * sb.months;
      } else if (couple) {
        // survivor keeps the higher of own benefit or the deceased's
        // (deceased's claimed benefit if they had claimed, otherwise their FRA amount)
        const [S, D, sS, sD] = aliveA ? [A, B, sa, sb] : [B, A, sb, sa];
        const decBen = sD.own > 0 ? Math.max(sD.own, D.ssFRA * infl * 0.825) : D.ssFRA * infl;
        const amt = Math.max(sS.own, decBen) * sS.months;
        if (aliveA) ssA = amt; else ssB = amt;
      } else {
        ssA = sa.own * sa.months;
      }
      const ss = ssA + ssB;

      const pension = (p.pension.annual && y >= p.pension.startYear)
        ? p.pension.annual * (p.pension.cola ? infl : 1) * (survivor ? p.pension.survivorPct : 1) : 0;

      // Spending
      let base = p.spending.base;
      for (const ph of p.spending.phases) if (y >= +ph.from && y <= +ph.to && ph.amount !== '') base = +ph.amount;
      if (p.spending.lateTrimAge && ageA >= p.spending.lateTrimAge) base *= (1 - p.spending.lateTrimPct);
      let spend = base * infl;
      let adj = 0;
      for (const a of p.spending.adjustments) {
        if (y >= +a.from && y <= +a.to) adj += +a.amount * (a.inflates ? infl : 1);
      }
      spend += adj;
      if (survivor) spend *= p.spending.survivorPct;
      // One-time events
      let oneOrd = 0, oneGain = 0, oneCash = 0, oneExpense = 0;
      for (const e of p.oneTime) {
        if (+e.year !== y) continue;
        if (e.kind === 'expense') oneExpense += +e.amount;
        else { oneCash += +e.amount; if (e.kind === 'ordinary') oneOrd += +e.amount; else oneGain += +e.amount * (+e.gainPct); }
      }
      spend += oneExpense;

      // RMD
      let owner = p.iraOwner === 'b' && couple ? B : A;
      if (couple && !(owner === A ? aliveA : aliveB)) owner = owner === A ? B : A; // spousal rollover
      const ownerAge = y - owner.birthYear;
      const rmdAge = rmdStartAge(owner.birthYear);
      const rmd = ownerAge >= rmdAge ? ira / rmdFactor(ownerAge) : 0;

      // IRMAA (lookback 2 yrs), surcharge above standard premium
      let irmaa = 0, tierNow = 0;
      if (n65 > 0) {
        const lb = magiHist[y - 2];
        const lbStatus = magiHist['s' + (y - 2)] || status;
        tierNow = irmaaTier(lb == null ? 0 : lb, lbStatus, infl); // premium-year thresholds
        irmaa = n65 * 12 * ((T.irmaa.partB[tierNow] - T.irmaa.partB[0]) + T.irmaa.partD[tierNow]) * infl;
      }

      // Roth conversion amount (decided before withdrawals)
      let conv = 0;
      const rc = p.roth;
      const preIra = Math.max(0, ira - rmd);
      if (rc.enabled && y >= rc.from && y <= rc.to && preIra > 0) {
        if (rc.mode === 'fixed') conv = Math.min(preIra, rc.amount * infl);
        else {
          // fill ordinary income up to top of chosen bracket
          const est = computeTax({ status, idx, wages, ordinaryOther: pension + rmd + oneOrd, ss, ltcg: oneGain, n65, year: y, stateRate: 0 });
          let ded = T.stdDed[status] * idx + T.age65Add[status] * idx * n65;
          const room = bracketTop(rc.bracket, status, idx) + ded - (wages + pension + rmd + oneOrd + est.taxableSS);
          conv = Math.max(0, Math.min(preIra, room));
          if (rc.irmaaCap) {
            const cap = T.irmaa[status][0] * Math.pow(1 + p.inflation, t) - 1000;
            conv = Math.max(0, Math.min(conv, cap - (est.agi)));
          }
        }
      }

      // Solve withdrawals: iterate taxes until they settle
      const order = p.withdrawOrder === 'protect-ira' ? ['taxable', 'roth', 'ira'] : ['taxable', 'ira', 'roth'];
      let wTax = 0, wIra = 0, wRoth = 0, gain = 0, taxRes = null, need = 0, short = 0;
      let taxGuess = 0;
      const inflow = wages + ss + pension + oneCash;
      const solve = () => {
        taxGuess = 0;
        for (let it = 0; it < 12; it++) {
          need = spend + irmaa + taxGuess;
          let gap = need - (inflow + rmd);
          wTax = 0; wIra = 0; wRoth = 0;
          const bal = { taxable: tax, ira: Math.max(0, ira - rmd - conv), roth: roth + conv };
          if (gap > 0) {
            for (const k of order) {
              if (gap <= 0) break;
              const take = Math.min(gap, bal[k]);
              if (k === 'taxable') wTax = take; else if (k === 'ira') wIra = take; else wRoth = take;
              gap -= take;
            }
          }
          short = Math.max(0, gap);
          const gf = tax > 0 ? Math.max(0, 1 - basis / tax) : 0;
          gain = wTax * gf;
          taxRes = computeTax({ status, idx, wages, ordinaryOther: pension + rmd + wIra + conv + oneOrd, ss, ltcg: gain + oneGain, n65, year: y, stateRate: p.stateRate });
          if (Math.abs(taxRes.total - taxGuess) < 1) { taxGuess = taxRes.total; break; }
          taxGuess = taxRes.total;
        }
      };
      solve();
      if (conv > 0 && rc.mode !== 'fixed' && rc.irmaaCap) {
        // keep the year's full MAGI (incl. gains realized to pay the tax) under IRMAA tier 1
        const cap = T.irmaa[status][0] * Math.pow(1 + p.inflation, t) - 1000;
        for (let k = 0; k < 4 && taxRes.agi > cap && conv > 0; k++) { conv = Math.max(0, conv - (taxRes.agi - cap) - 500); solve(); }
      }
      need = spend + irmaa + taxGuess;
      const surplus = Math.max(0, inflow + rmd + wTax + wIra + wRoth - need);

      // Apply flows
      const begin = ira + roth + tax;
      const gFrac = tax > 0 ? Math.max(0, 1 - basis / tax) : 0;
      basis -= wTax * (1 - gFrac);
      tax -= wTax;
      ira -= rmd + conv + wIra;
      roth += conv - wRoth;
      tax += surplus; basis += surplus;
      ira = Math.max(0, ira); roth = Math.max(0, roth); tax = Math.max(0, tax); basis = Math.max(0, Math.min(basis, tax));

      // Growth (withdrawals at start of year)
      const r = yearReturns(p, y, rng);
      const w = equityWeight(p, ageA);
      const blended = w * r.eq + (1 - w) * r.bd;
      ira *= 1 + blended; roth *= 1 + blended; tax *= 1 + blended;

      magiHist[y] = taxRes.agi; magiHist['s' + y] = status;
      if (short > 1 && shortfallYear == null) shortfallYear = y;
      totalTax += taxRes.total; totalIrmaa += irmaa; totalShort += short;

      rows.push({
        year: y, ageA: aliveA ? ageA : null, ageB: couple && aliveB ? ageB : null, status, survivor,
        begin, spend, wages, ss, pension, oneCash, rmd, conv, wTax, wIra, wRoth,
        fedTax: taxRes.fed, stateTax: taxRes.state, tax: taxRes.total, marg: taxRes.marg, agi: taxRes.agi,
        irmaa, irmaaTier: tierNow, short, eqW: w, ret: blended, tag: r.tag,
        ira, roth, taxable: tax, end: ira + roth + tax,
      });
    }
    const last = rows[rows.length - 1];
    const minRow = rows.reduce((m, r) => r.end < m.end ? r : m, rows[0]);
    return {
      rows, shortfallYear, totalTax, totalIrmaa, totalShort,
      endBalance: last.end, endReal: last.end / Math.pow(1 + p.inflation, last.year - y0),
      minRow, success: shortfallYear == null, endYear: last.year,
    };
  }

  // ---------- Monte Carlo ----------
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function makeRng(seed) {
    const u = mulberry32(seed); let spare = null;
    return { normal() { if (spare != null) { const s = spare; spare = null; return s; } let a, b, s; do { a = u() * 2 - 1; b = u() * 2 - 1; s = a * a + b * b; } while (!s || s >= 1); const m = Math.sqrt(-2 * Math.log(s) / s); spare = b * m; return a * m; } };
  }
  function monteCarlo(p, n = 500, seed = 20261) {
    const paths = []; let ok = 0;
    for (let i = 0; i < n; i++) {
      const r = project(p, { rng: makeRng(seed + i * 7919) });
      if (r.success) ok++;
      paths.push(r.rows.map(x => x.end));
    }
    const len = paths[0].length, pct = q => { const out = []; for (let j = 0; j < len; j++) { const col = paths.map(pa => pa[j] ?? 0).sort((a, b) => a - b); out.push(col[Math.floor(q * (col.length - 1))]); } return out; };
    return { successRate: ok / n, p10: pct(0.10), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9), n };
  }

  const api = { T, project, monteCarlo, computeTax, ownFactor, rmdStartAge, rmdFactor, irmaaTier, equityWeight };
  if (typeof module !== 'undefined') module.exports = api; else root.RetireEngine = api;
})(this);
