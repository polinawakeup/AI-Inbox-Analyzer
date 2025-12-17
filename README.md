# AI Inbox Analyzer (pre-MVP)

A lightweight, static inbox dashboard prototype that demonstrates how an **AI layer** can turn a messy email flow into an actionable, human-friendly overview — without building a full email client.

This repo is intentionally **pre-MVP**: it prioritizes **speed of iteration**, clear UX, and a strong showcase narrative over production-grade integrations.

---

## What this is

**AI Inbox Analyzer** is a static HTML/CSS/JS dashboard that:
- groups emails into practical categories,
- highlights what’s new,
- supports quick triage (Done / Snooze / Ignore),
- provides an “Inbox Assistant” summary with clickable mentions,
- and keeps interaction smooth via a simple modal.

All data is currently **synthetic** and loaded from local JSON.

---

## Why it’s useful (the value)

Email overwhelm is rarely about “more features” — it’s about **fast decisions** and **reduced cognitive load**.

This prototype demonstrates two core product ideas:
1. **Quick triage** to reduce inbox noise (without losing information).
2. A **personal assistant summary** that turns raw volume into a short, human-style briefing, with direct jumps to relevant emails.

The goal is to show how an AI-powered experience can sit *on top of existing communication streams* and make them easier to manage.

---

## Current scope (what’s implemented)

### Dashboard
- Loads dashboard model from `./data/dashboard_view_model_v1.json`
- Deterministic sorting inside each category (script-only)
- KPI counts computed **only from `model.blocks`**
- Empty state UI for panels with no items
- “New” badge for recent/unviewed items

### Quick triage
- Done / Snooze / Ignore actions
- Triage strips: Snoozed / Ignored / Done (collapsible, horizontal scroll)
- Restore from triage back to inbox
- Snooze presets (later today / tomorrow / next week)
- Storage in `localStorage`

### Inbox Assistant Summary (Mode A)
- Loads summary from `./data/assistant_summary_v1.json`
- Loads persona from `./data/assistant_persona_v1.json`
- Clickable “mentions” open the email modal
- “Listen” button is a stub (toast only)
- Assistant quick intents (Draft replies / Plan my day / Deadlines overview / Ask assistant) are stubs (toast only)

### UX
- Click email card → modal
- ESC / backdrop / close button closes modal
- Toast notifications for key actions
- No frameworks, no build tools, ES modules only

---

## What’s NOT implemented (by design)

This is a **pre-MVP showcase** — many things are stubbed or simplified:
- No real email provider integration (Gmail/Outlook/etc.)
- No backend, no auth, no server-side persistence
- No real “refresh” fetch (refresh is simulated with a delay)
- No LLM API calls yet (summary is loaded from JSON)
- No “suggested reply” generation yet
- No task system integration (e.g., calendar/todo)

---

## Tech stack

- Static HTML + CSS + Vanilla JS
- ES modules
- Local JSON as the data source
- No frameworks, no bundlers, no build pipeline

---

## Project structure (high level)

- `index.html` — entry point
- `main.js` — boots the app
- `style.css` — base styling
- `components/` — UI components (render HTML strings)
- `lib/` — data helpers, DOM helpers, triage logic
- `utils/` — small formatting/helpers
- `data/` — synthetic JSON models (not modified by the app)
- `assets/` — images/icons

---

## Run locally

Because data is loaded via `fetch`, open via a local server:

```bash
python -m http.server 8000