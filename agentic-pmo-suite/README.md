# Agentic PMO Suite

[![Try the app](https://img.shields.io/badge/Try_the_app-live_demo-2ea44f?style=for-the-badge)](https://vjra03an.github.io/automation-agents/agentic-pmo-suite/pmo-agent-suite.html)

*Work in progress. Opens with sample data; the "Generate with AI" buttons need the Claude API and will not run in the hosted version.*

## Start here

| | What it is | Read time |
|---|---|---|
| 📄 **[Overview (PDF)](Agentic-PMO-Suite-Overview.pdf)** | One page: what the suite does, capability by capability, and why each matters | 2 min |
| 🗺️ **[PfMO Function Map (PDF)](PfMO-Function-Map.pdf)** | One page: the 14 standard Portfolio Management Office functions, mapped against what this prototype covers today | 2 min |
| ▶️ **[Try the app](https://vjra03an.github.io/automation-agents/agentic-pmo-suite/pmo-agent-suite.html)** | Click through the portfolio tracker, priority ranking, **rigor meter**, intake and TPM capacity views with sample data | 5 min |
| 💻 **[Source (`pmo-agent-suite.html`)](pmo-agent-suite.html)** | The full single-file app | — |

> **Status:** work in progress, a personal prototype. In the hosted version the screens, scoring and overrides all work; the "Generate with AI" buttons need the Claude API and won't run there (see *Known limitation* below). The `.docx` versions of both one-pagers are also in this folder if you'd like to edit or comment on them.

## Quick tour (5 minutes)

[Open the app](https://vjra03an.github.io/automation-agents/agentic-pmo-suite/pmo-agent-suite.html). It loads with sample programs, TPMs and intake requests, so you can click around right away. Nothing you do is saved; reload to start over.

1. **See the portfolio.** Start on **Portfolio Tracker** for status, budget and TPM allocation across all programs. Then open **Priority Ranking** to see every program and request ranked by the same scoring rubric, with the cut line set by TPM capacity.
2. **Submit a request.** Go to **Intake** and fill in **Submit New Request**: a name, a short description, the sponsor, a rough budget, and the rigor questions (complexity, integration, stack layers, release type). The request is scored right away and gets a rigor level.
3. **Review it like a PMO lead.** Click any request in the Intake list to see its score breakdown. Override a score if you disagree; the override is badged and can always be reverted.
4. **Approve it.** Click **approve** and assign a TPM. The app blocks any assignment that would put a TPM above 80% capacity (check **TPM Team** to see why). The approved request becomes a program and **keeps its rigor level**, so it starts with its process already decided.
5. **Check the process and the trail.** Open **Rigor Meter** to see each program's level and recommended process; move the slider to override it. Then open **Audit Log**: every score, override, approval and rigor change is recorded with who made it (set your name under **Acting as**).

**Want more?** Open any program from **Programs** to see the seven document agents (charter, plan, status report, risk register and more). The **Generate with AI** buttons need the Claude API, so they don't run in this hosted version; see *Known limitation* below.

---

A single-file, agentic Program/Project Management Office (PMO) tool. Instead of one generic chatbot, it uses a set of purpose-built, named AI agents — each with its own system prompt — to draft every standard PMO artifact for a program, and to run intake triage and prioritization scoring.

Built as a working tool and as a demonstration of agentic-AI PMO/TPM tooling design.

## What it does

- **Program Tracker** — a portfolio view of all active programs, their RAG status, phase, budget, and TPM (Technical Program Manager) allocations.
- **Intake** — a lightweight submission form (name, description, Executive Sponsor, rough budget — the only fields a human must supply) that an **Intake Agent** triages: it drafts the problem statement, checks value-proposition quality, assesses OKR alignment, and drafts the fuller charter-feeding content (requirements, success criteria, scope, constraints, known risks) for a human reviewer to accept or override.
- **Prioritization scoring** — every intake request and program is scored by a **Prioritization Agent** against a fixed rubric:
  - **OKR tie is a hard gate** — if a request isn't tied to a company OKR, it scores 0 regardless of size or complexity.
  - Size (S–XXL), team spread (with a global bonus), and complexity.
  - A 9-point value/quality component that branches by initiative type:
    - **Product** initiatives are scored on customer impact %, new customers, and net-new revenue.
    - **Platform** initiatives are scored on existing-customer coverage %, customers at risk of churn, and revenue at risk — so infrastructure/reliability work isn't structurally penalized just because it doesn't generate new revenue directly.
  - Every agent-generated score can be overridden by a PMO/engineering leader, with the override clearly badged and always revertible back to the agent's original assessment — the system never silently overwrites a human decision.
- **TPM capacity governance** — no TPM can be allocated above 80% of their stated capacity; both the Intake approval flow and manual allocation changes are gated on this.
- **Rigor meter (right-sized process)** — one method doesn't fit every program. Each program is scored on four parameters: complexity, integration (none, internal teams, or an external partner), the parts of the stack it touches (front end, back end, middleware, data, reporting), and release type (maintenance, enhancement, new build). The 0–8 score sets a rigor level, and each level comes with a recommended process:
  - **High** (score 6–8): stage gates with formal sign-off, a steering committee, a full RAID log, formal change control, weekly executive status.
  - **Medium** (3–5): milestone reviews, RAID-lite, bi-weekly status, a change log decided at Director level.
  - **Low** (0–2): short iterations that ship early and learn ("go ugly early"), team-level tracking, status in the team channel.

  The rigor profile is **captured at intake**: every request is scored when it's submitted, shown in the intake list and on a pipeline view, and **inherited by the program on approval**, so programs enter execution with their process already decided.

  A leader can move a slider to override the level; like score overrides, it is badged, always revertible, and recorded in the Audit Log. The approach comes from a rigor meter I first built as Director of Quality & Process at Genesys, where 3-week maintenance releases carried waterfall overhead and long-running work ran full waterfall when it should have iterated.
- **Seven grounded artifact agents**, one per program, each generating from a shared program-context object (objective, value proposition, requirements, success criteria, scope, constraints, known risks, quantified impact metrics) rather than inventing content from scratch:
  1. Charter
  2. Project Plan
  3. Status Report
  4. Risk Register
  5. Dependency Tracker
  6. OKR Report
  7. Program Landing Page

  Each artifact type is generated against a **fixed section template** (see `ARTIFACT_TEMPLATES` in the source) — the agent is instructed to use the exact section headers, in order, so output is structurally consistent and checkable run over run, not freeform markdown that varies each time.

- **Voice/transcript intake** — an intake submitter can paste a meeting transcript (or use best-effort live browser dictation) and a **Transcript Parser Agent** fills the intake form fields directly.
- **Structural, non-agent guardrail**: an OKR-vs-metrics consistency check flags when a program's named OKR (e.g. a cost-reduction objective) doesn't actually match the category of metric it's tracking (e.g. churn-risk/coverage figures) — catching a real data-quality gap the system should catch itself rather than relying on an agent to notice it inconsistently.

## Architecture

This is intentionally a **single self-contained HTML file** (`pmo-agent-suite.html`) — plain JS, a small client-side state object, and direct calls to the Anthropic Messages API. Each "agent" (`charter-agent-v1`, `intake-agent-v1`, `prioritization-agent-v1`, `transcript-parser-agent-v1`, etc.) is a differently-prompted call to the same model, not a separate service — the separation is in the prompt design and the structured output contract (fenced blocks like ` ```score ``` ` / ` ```draft ``` ` that get parsed back into state), not in infrastructure.

## Known limitation — running this outside Claude.ai

The `fetch()` calls to `https://api.anthropic.com/v1/messages` work when this file is opened as a Claude.ai artifact, which injects API access into that sandboxed context. **Opened as a plain HTML file anywhere else (including from this repo), the "Generate with AI" buttons will not work** — there's no API key in this file (a real key can't safely ship in client-side JS anyway).

To actually run the AI generation outside of Claude.ai, you'd need to add:
1. A backend proxy (a small serverless function or server) that holds a real `ANTHROPIC_API_KEY` and forwards requests
2. A change to the `fetch()` calls in this file to hit that proxy instead of the Anthropic API directly

That restructuring (splitting this into `index.html` / `app.js` / a backend function, plus a deploy target) is a planned follow-up, not yet done here.

## State / persistence

All state (programs, TPMs, intake queue, generated artifacts) lives in `window.storage` (in-artifact persistence) or, when run as a plain page, in memory only — it resets on reload unless wired to real storage.
