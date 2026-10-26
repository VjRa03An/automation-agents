# Longevity Stress Planner

Two versions share one projection engine:

| Version | For | Answers | Try it |
|---|---|---|---|
| **Glide** | People near or in retirement | *Make it last.* Checks that the money lasts to 95 through recessions, taxes, Medicare and a spouse's death? | [![Glide](https://img.shields.io/badge/Open-Glide-2ea44f)](https://vjra03an.github.io/automation-agents/longevity-stress-planner/) |
| **Scale** | People still building savings | *Reach freedom sooner.* Finds the earliest age you can retire (financial independence / FIRE). | [![Scale](https://img.shields.io/badge/Open-Scale-0c6652)](https://vjra03an.github.io/automation-agents/longevity-stress-planner/young-adult/) |

### Share these links

Anyone can open them in a browser, with no account or install:

- **Scale** (reach freedom sooner): https://vjra03an.github.io/automation-agents/longevity-stress-planner/young-adult/
- **Glide** (make it last): https://vjra03an.github.io/automation-agents/longevity-stress-planner/

Each page also links to the other at the top.

### For testers: what to try

Both pages open with a made-up example so you can explore first. Then press **Start blank** and enter your own numbers in the amber fields; nothing you type leaves your browser.

**Scale** (if you're still saving):
1. Enter your salary, savings, and spending now and in retirement. Read the headline: your earliest retirement age and the savings it takes.
2. Add a **monthly investing (SIP)** amount and see how many years sooner you could retire.
3. Pick a **term life** policy, or click a price in the grid, and see how many years of family spending it covers.
4. Turn on **Buying a home** and compare the **Rent vs. buy** card: which path gets you free sooner?
5. Try **Crash the year you retire** and check the chance-of-success bars by retirement age.

**Glide** (if you're retired or close):
1. Enter your balances, Social Security and spending. Read the headline: does the money last to 95, and how much is left?
2. Turn on the **medical stress test** (two $250K hospital stays) and switch the coverage between "Not covered", Medigap and Medicare Advantage.
3. Turn on **Your home** and compare staying, downsizing, and selling to rent.
4. Try the **survivor test** (set an age of death) and the recession presets.

**Tell us** what confused you, which numbers looked wrong, and what's missing. Open an issue at https://github.com/VjRa03An/automation-agents/issues or reply to whoever sent you the link. Use **Save my plan** if you want to keep your inputs.

## Scale: reach freedom sooner

Built for someone in their 20s–40s. It adds what an early retirement depends on:

- **Paycheck saving:** salary with raises above inflation, 401(k) pre-tax and Roth percentages, employer match and Roth IRA, with 2026 limits ($24,500 401(k), +$8,000 from 50; $7,500 IRA). 
- **Payroll tax:** 6.2% Social Security up to $184,500, 1.45% Medicare, 0.9% above $200,000 single / $250,000 joint.
- **Monthly investing (SIP):** invest a fixed amount every month into a fund type (S&P 500 index, total US market, international, target-date, balanced 60/40, bond index, or custom), for a set number of years or until retirement, with an optional yearly increase, in a brokerage account or Roth IRA. Each fund follows the year's stock and bond returns in its own mix, minus its fee. Scale shows how many years sooner your SIPs let you retire and what they're worth at retirement.
- **Term life insurance:** choose who is insured, the coverage and the number of years (10–30), plus sex and health class for the price estimate, or enter a real quote. The planner shows the monthly price and total cost, how many years of the household's spending the payout covers, a suggested coverage (your retirement target minus today's savings) and term (years until financial independence), and a grid of monthly prices for more coverage or more years; clicking a price applies it. Premiums are added to spending, and in the survivor test a death during the term pays the coverage tax-free. Prices are estimates scaled from MoneyGeek's 2026 averages, not quotes.
- **Buying a home, rent vs. buy:** enter the price, buy year, down payment, closing costs, mortgage rate and term, property tax, insurance, HOA, upkeep, home value growth, PMI, your current rent and what you save each month for the down payment (the planner tells you how much you'd need). It amortizes the mortgage, stops rent the year you buy, and itemizes mortgage interest and state and local taxes (SALT cap $40,400 in 2026, $10,000 from 2030) only when that beats the standard deduction. A **Rent vs. buy** card runs the same plan both ways, buying, or renting with the down-payment money and any cost difference invested, and compares freedom age, monthly housing cost, interest, taxes saved, and net worth with and without home equity.
- **Leftover pay:** by default it's assumed spent, so only 401(k), Roth and SIPs count as saving. Turn on "invest all leftover pay" if you really do invest every spare dollar.
- **Spending now vs. in retirement**, plus kids, college or a mortgage as extra costs, and a down payment as a one-time event.
- **Health insurance before 65:** marketplace premiums that rise with age, with 2026 ACA tax credits (2.10%–9.96% of income for the benchmark plan, none above 400% of the poverty line).
- **The 59½ rules:** withdrawals go brokerage → Roth contributions → Roth conversions 5+ years old → 401(k)/IRA with a 10% penalty → Roth growth (taxed + 10%).
- **Roth conversion ladder:** convert each year from retirement until 59, filling a chosen bracket and staying under the ACA cliff.
- **Social Security estimate** from salary and years worked, reduced for the years skipped by retiring early. An SSA statement figure can be entered instead and is scaled down the same way.
- **Results:** the earliest retirement age under your recession test, the savings needed by then (today's dollars), the age with 90% confidence across random markets, and a chart of the chance of success for each retirement age. One click sets the plan to the earliest age.
- **Presets:** 3 × 2008-style crashes, a crash in the year you retire (sequence-of-returns risk), or a crash in year 1.

Not modeled: 72(t) payments, HSA accounts, Roth IRA income limits, kids on the ACA plan, and Medicaid eligibility.

## Glide: make it last

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
- **Your home: stay, downsize, or sell and rent.** Enter the home's value, what you paid plus improvements, any mortgage (balance, rate, years left), property tax, insurance, upkeep and HOA, then pick a plan and a sale year. Selling costs, moving costs and the mortgage payoff come out of the sale; up to $250,000 of profit ($500,000 for a couple) is tax-free and the rest is taxed as a capital gain. Downsizing buys a smaller home with cash; selling to rent adds rent from the year you choose. A comparison card shows all three plans side by side: whether the money lasts, cash freed up, tax on the sale, housing cost afterward, home equity at 85 (a reserve for long-term care), savings and net worth at 95.
- **Medical stress test.** Add hospital stays with home nursing at chosen ages; a preset adds two $250,000 events. Each event has a coverage choice, and the planner estimates what you'd actually pay under 2026 Medicare rules: about $283 with Original Medicare + Medigap Plan G, up to $9,250 with Medicare Advantage (the in-network maximum), roughly $19,000 on a $250,000 bill with Original Medicare alone (20% of Part B services has no cap), or the full bill if it isn't covered (Medicare doesn't pay for long-term custodial care). Large bills are itemized (costs above 7.5% of income) when that beats the standard deduction, and the extra withdrawals can raise Medicare premiums two years later. Results show the bills on the chart and table and how much they lower the ending balance.
- **Survivor test.** Set an age of death for either spouse to see the widow's tax change: single brackets and IRMAA tiers, the higher Social Security check only, and lower survivor spending.
- **Roth conversions.** Fill up to the 12%, 22% or 24% bracket (optionally staying under the first IRMAA tier), or convert a fixed amount.
- **Spending phases and extra costs.** Lower-cost years abroad, rent, travel, long-term care, and a spending cut at a chosen age.
- **One-time events.** Stock or business sales, inheritances, severance, large purchases.
- **500-run Monte Carlo.** Random markets around your average returns, with your recession years kept in every run, giving a success rate and percentile bands.
- **Scenarios.** Save versions in the browser and compare outcomes side by side. Copy and paste all inputs as text to move them to another device or share them.

## Using it

Open [Scale](https://vjra03an.github.io/automation-agents/longevity-stress-planner/young-adult/) or [Glide](https://vjra03an.github.io/automation-agents/longevity-stress-planner/), or download either `index.html` and open it in any browser. It runs entirely in the browser: no server, no account, and nothing you type leaves your machine.

### Saving your plan

The browser remembers your inputs between visits, but clearing browser data or switching computers loses them. To keep your plan safe, use the two buttons at the top of the page:

- **Save my plan** downloads your inputs and saved scenarios as a small `.json` file. Reopen it any time with **Open a .json file** in the Scenarios section.
- **Save a personal copy** downloads the whole planner as one `.html` file with your numbers built in. Double-click it and it opens straight to your plan, even offline. After making changes, save a copy again to keep them in the file.

Both files hold your financial details, so store them somewhere private.

The page opens with a **made-up example household** so you can see how it works. Press **Start blank** and enter your own numbers, starting with Social Security amounts from your statement at ssa.gov/myaccount.

Fields are color-coded:

- **Amber fields are your numbers.** Names, birth years, salary, Social Security, account balances, pension, spending, state tax, and the spending phases, extra costs and one-time events lists. Replace every one of these. Sections that contain them are marked with an amber dot.
- **Plain fields are assumptions.** Inflation, market returns, the glide path, recessions, survivor settings, Roth conversions and Monte Carlo volatility. They have sensible defaults; leave them or change them to test a scenario.

## Files

| File | What it is |
|---|---|
| `index.html` | Glide, complete in one file (engine included). |
| `young-adult/index.html` | Scale, complete in one file. |
| `engine.js` | The projection engine on its own: taxes, IRMAA, Social Security, RMDs, glide path, recessions and Monte Carlo. Pure JavaScript with no dependencies; works in Node or the browser. |
| `engine.test.js` | Sanity checks against known 2026 figures. Run `node engine.test.js`. |

If you change `engine.js`, paste the updated engine into the engine `<script>` block of both `index.html` files so the apps pick it up. Payroll tax and the 10% early-withdrawal penalty apply in both versions.

## Simplifications

- One stock/bond mix applies to every account.
- Withdrawals happen at the start of each year; growth applies to what remains.
- State tax is a flat rate on income above the standard deduction.
- Only the IRMAA surcharge above the standard Medicare premium is added. Put base premiums in spending.
- A one-time sale is entered as a single event per year rather than a multi-year schedule.

## Important

This is a planning tool, not tax, legal or investment advice. Tax brackets, IRMAA thresholds and Social Security rules reflect 2026 and change every year. Check current figures and review large decisions with a licensed professional.
