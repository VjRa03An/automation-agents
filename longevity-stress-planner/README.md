# Longevity Stress Planner

[![Try the app](https://img.shields.io/badge/Try_the_app-live_demo-2ea44f?style=for-the-badge)](https://vjra03an.github.io/automation-agents/longevity-stress-planner/)

A single-page retirement planner that projects a household's savings year by year and then stress-tests the plan: market recessions with rebounds, a spouse's death, Roth conversions, Medicare surcharges and taxes. It answers one question: **does the money last, and how close is it?**

It grew out of a real household's retirement spreadsheet (a concentrated stock sale timed around Medicare thresholds, a glide path, and four recessions spread across a 30-year horizon) and turns that method into a tool anyone can fill in with their own numbers.

## What it does

- **Year-by-year projection** across three account types: traditional IRA/401(k), Roth, and taxable brokerage (with cost-basis tracking for capital gains).
- **Recession stress test.** Pick the years and the stock-market drop for each, plus how many rebound years follow and at what return. Presets:
  - 4 shocks: 2030 (−30%), 2040 (−30%), 2046 (−10%), 2052 (−18%)
  - 3 × 2008-style crashes in years 5, 15 and 25
  - A crash in the first year of retirement (sequence-of-returns risk)
- **Glide path.** Stocks shift toward bonds as you age (default 40% → 30% between 67 and 90).
- **Taxes.** 2026 federal brackets, standard deduction, the 65+ additions, the 2025–2028 senior deduction, 0/15/20% capital-gains rates, 3.8% NIIT, and Social Security taxation. Brackets rise with inflation. State tax is a flat rate.
- **Medicare IRMAA.** 2026 CMS tiers applied to income from two years earlier, per person on Medicare.
- **Social Security.** Claiming-age reduction and delayed credits, the 50% spousal top-up, and cost-of-living increases.
- **Required minimum distributions** from 73 or 75 (by birth year) using the IRS Uniform Lifetime Table.
- **Survivor test.** Set an age of death for either spouse to see the widow's tax change: single brackets and IRMAA tiers, the higher Social Security check only, and lower survivor spending.
- **Roth conversions.** Fill up to the 12%, 22% or 24% bracket (optionally staying under the first IRMAA tier), or convert a fixed amount.
- **Spending phases and extra costs.** Lower-cost years abroad, rent, travel, long-term care, and a spending cut at a chosen age.
- **One-time events.** Stock or business sales, inheritances, severance, large purchases.
- **500-run Monte Carlo.** Random markets around your average returns, with your recession years kept in every run, giving a success rate and percentile bands.
- **Scenarios.** Save versions in the browser and compare outcomes side by side. Copy and paste all inputs as text to move them to another device or share them.

## Using it

Open the [live demo](https://vjra03an.github.io/automation-agents/longevity-stress-planner/), or download `index.html` and open it in any browser. It runs entirely in the browser: no server, no account, and nothing you type leaves your machine. Saved scenarios live in that browser's local storage.

The page opens with a **made-up example household** so you can see how it works. Press **Start blank** and enter your own numbers, starting with Social Security amounts from your statement at ssa.gov/myaccount.

Fields are color-coded:

- **Amber fields are your numbers.** Names, birth years, salary, Social Security, account balances, pension, spending, state tax, and the spending phases, extra costs and one-time events lists. Replace every one of these. Sections that contain them are marked with an amber dot.
- **Plain fields are assumptions.** Inflation, market returns, the glide path, recessions, survivor settings, Roth conversions and Monte Carlo volatility. They have sensible defaults; leave them or change them to test a scenario.

## Files

| File | What it is |
|---|---|
| `index.html` | The complete app in one file (engine included). |
| `engine.js` | The projection engine on its own: taxes, IRMAA, Social Security, RMDs, glide path, recessions and Monte Carlo. Pure JavaScript with no dependencies; works in Node or the browser. |
| `engine.test.js` | Sanity checks against known 2026 figures. Run `node engine.test.js`. |

If you change `engine.js`, paste the updated engine into the first `<script>` block of `index.html` so the app picks it up.

## Simplifications

- One stock/bond mix applies to every account.
- Withdrawals happen at the start of each year; growth applies to what remains.
- State tax is a flat rate on income above the standard deduction.
- Only the IRMAA surcharge above the standard Medicare premium is added. Put base premiums in spending.
- A one-time sale is entered as a single event per year rather than a multi-year schedule.

## Important

This is a planning tool, not tax, legal or investment advice. Tax brackets, IRMAA thresholds and Social Security rules reflect 2026 and change every year. Check current figures and review large decisions with a licensed professional.
