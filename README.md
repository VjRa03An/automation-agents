# Automation Agents

A collection of small, self-contained AI-powered agents and utilities for everyday operational automation — inbox management, financial monitoring and retirement planning, and local system organization.

Built with Python, GitHub Actions, and the Claude API.

## What's in here

### `agentic-pmo-suite/`
[![Try the app](https://img.shields.io/badge/Try_the_app-live_demo-2ea44f?style=for-the-badge)](https://vjra03an.github.io/automation-agents/agentic-pmo-suite/pmo-agent-suite.html)

A single-file agentic PMO tool: named AI agents (Charter, Project Plan, Status Report, Risk Register, Dependency Tracker, OKR Report, Landing Page, Intake, Prioritization) that draft every standard PMO artifact for a program from a shared, grounded context object, plus intake triage, OKR-gated prioritization scoring, and TPM capacity governance. See its own README for details and the current limitation on running it outside Claude.ai.

### `forex-agent/`
Daily USD→INR exchange rate digest. Checks multiple rate providers, compares against a target threshold, and emails a summary with Claude-generated commentary. Runs daily via GitHub Actions.

### `gmail-cleanup/`
A set of independent Gmail automation scripts:
- **`job_digest.py`** — scans inbox for job alert emails (LinkedIn, Indeed, etc.), parses and deduplicates listings, scores relevance with Claude Haiku, and emails a clean actionable digest. Runs daily on weekdays.
- **`auto_label.py`** — quarterly auto-labeling and archiving for inbox housekeeping.
- **`auto_delete.py`** — Gmail cleanup with dry-run, confirm-delete, and empty-trash modes (manual trigger only, by design — this one's destructive, so it doesn't run on a schedule).

### `longevity-stress-planner/`
[![Try the app](https://img.shields.io/badge/Try_the_app-live_demo-2ea44f?style=for-the-badge)](https://vjra03an.github.io/automation-agents/longevity-stress-planner/)

A single-page retirement planner in two versions: **[Climb Up](https://vjra03an.github.io/automation-agents/longevity-stress-planner/young-adult/)** (when can I stop working?) for people still saving, and **[Glide Down](https://vjra03an.github.io/automation-agents/longevity-stress-planner/)** (will my money last?) for people near or in retirement. It projects savings year by year and stress-tests the plan against recessions (with rebound years), a spouse's death, Roth conversions, Medicare IRMAA surcharges and 2026 federal taxes, plus a 500-run Monte Carlo. Runs entirely in the browser with no setup; opens with a made-up example household. Works as a template: fill in your own numbers, then save them as a file or as your own copy of the planner. See its own README for features and assumptions.

### `gas-tracker-pwa/`
A small installable web app (PWA) for tracking nearby gas prices, deployed via Netlify with a serverless proxy function.

### `mac-organizer/`
Local utility scripts for macOS file management:
- **`scan_my_files.py`** — safe-mode scan of Desktop/Downloads/Documents that reports duplicates and large files (no files are moved or deleted).
- **`cleanup.py`** — removes known junk/cache files.
- **`delete_installers.py`** — clears out old installer files.

## Setup

Each agent that runs via GitHub Actions expects its secrets configured under **Settings → Secrets and variables → Actions**:

| Secret | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | forex-agent, job_digest.py |
| `SMTP_USER` / `SMTP_PASS` / `DIGEST_EMAIL` | forex-agent, job_digest.py, auto_delete.py |
| `GMAIL_TOKEN_JSON` / `GMAIL_CREDENTIALS_JSON` | job_digest.py, auto_label.py, auto_delete.py |

Local-only scripts (`mac-organizer/`) and browser apps (`longevity-stress-planner/`, `agentic-pmo-suite/`) need no secrets.

## Notes

These are personal automation projects, shared as-is for reference. Feel free to fork and adapt.
