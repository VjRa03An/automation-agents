# Automation Agents

A collection of small, self-contained AI-powered agents and utilities for everyday operational automation — inbox management, financial monitoring, and local system organization.

Built with Python, GitHub Actions, and the Claude API.

## What's in here

### `forex-agent/`
Daily USD→INR exchange rate digest. Checks multiple rate providers, compares against a target threshold, and emails a summary with Claude-generated commentary. Runs daily via GitHub Actions.

### `gmail-cleanup/`
A set of independent Gmail automation scripts:
- **`job_digest.py`** — scans inbox for job alert emails (LinkedIn, Indeed, etc.), parses and deduplicates listings, scores relevance with Claude Haiku, and emails a clean actionable digest. Runs daily on weekdays.
- **`auto_label.py`** — quarterly auto-labeling and archiving for inbox housekeeping.
- **`auto_delete.py`** — Gmail cleanup with dry-run, confirm-delete, and empty-trash modes (manual trigger only, by design — this one's destructive, so it doesn't run on a schedule).

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

Local-only scripts (`mac-organizer/`) need no secrets — they just run against your local filesystem.

## Notes

These are personal automation projects, shared as-is for reference. Feel free to fork and adapt.
