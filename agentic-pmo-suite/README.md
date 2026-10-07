# Agentic PMO Suite

## Start here

| | What it is | Read time |
|---|---|---|
| 📄 **[Overview (PDF)](Agentic-PMO-Suite-Overview.pdf)** | One page: what the suite does, capability by capability, and why each matters | 2 min |
| 🗺️ **[PfMO Function Map (PDF)](PfMO-Function-Map.pdf)** | One page: the 14 standard Portfolio Management Office functions, mapped against what this prototype covers today | 2 min |
| ▶️ **[Try the app](https://vjra03an.github.io/automation-agents/agentic-pmo-suite/pmo-agent-suite.html)** | Click through the portfolio tracker, priority ranking, intake and TPM capacity views with sample data | 5 min |
| 💻 **[Source (`pmo-agent-suite.html`)](pmo-agent-suite.html)** | The full single-file app | — |

> **Status:** work in progress, a personal prototype. In the hosted version the screens, scoring and overrides all work; the "Generate with AI" buttons need the Claude API and won't run there (see *Known limitation* below). The `.docx` versions of both one-pagers are also in this folder if you'd like to edit or comment on them.

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
