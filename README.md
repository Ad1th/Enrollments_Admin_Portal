# 🚀 MFC Admin Portal - Recruitments '25

![Version](https://img.shields.io/badge/version-1.0.0-FC7A00.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success.svg?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-MERN-blue.svg?style=for-the-badge)

> A premium, high-performance admin dashboard for managing recruitment enrollments, engineered with **React** and **Express**.

---

## ✨ Features

- **🎨 Sexy Dark UI**: Signature "MFC Black & Orange" theme (`#fc7a00`) with sleek glassmorphism.
- **📊 Live Dashboard**: Real-time applicant tracking and statistics.
- **⚡ Lightning Search**: Instant filtering by Name, Registration Number, or Email.
- **📂 Domain Control**: Specialized workflows for **Tech**, **Design**, and **Management**.
- **📝 Deep Dive**: interactive modals to review applicant profiles and task submissions in detail.
- **🔐 Secure Core**: Industrial-strength JWT authentication.

## 🛠️ The Tech Stack

Built on a robust modern architecture:

| Frontend | Backend | Database |
| :--- | :--- | :--- |
| ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) **Vite** | ![Node](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white) **Express** | ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white) |

## 🚀 Getting Started

Follow these steps to deploy the portal locally.

### 1. Clone & Install

```bash
git clone https://github.com/Ad1th/Enrollments_Admin_Portal.git
cd Enrollments_Admin_Portal
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
PORT=5003
CONNECT_STRING=your_mongodb_connection_string
ACCESS_TOKEN_SECERT=your_secret_key
AUTH_EMAIL=admin_email_config
```

> **Note**: This project operates on port **5003** by default to remain independent.

### 3. Ignite ⚡

Open two terminal sessions to run the full stack:

**Terminal A (Frontend):**
```bash
npm run dev
```

**Terminal B (Backend):**
```bash
node backend/server.js
```

Access the portal at `http://localhost:5173`

## 🎨 Design System

The UI is strictly typed to the MFC Brand Identity:

- **Primary**: `#fc7a00` (Blaze Orange)
- **Void**: `#121212` (True Black Background)
- **Surface**: `#2c2c2c` (Elevated Elements)

---

<p align="center">
  Made with 🧡 for <strong>MFC</strong>
</p>

## Review tools

| Feature | Where | Needs |
| --- | --- | --- |
| AI second opinion (scores answers against rubrics, flags prompt injection) | candidate modal, `A` | `LLM_API_KEY` (+ optional `LLM_BASE_URL`, `LLM_MODEL`). Defaults to Groq's free tier (`llama-3.3-70b-versatile`); xAI Grok, OpenRouter or any OpenAI-compatible API also work. |
| Copy check (near-duplicate answers, shared links) | Copy check page | nothing, runs locally |
| Reviewer scores 1–5 with panel mean | candidate modal, keys `1`–`5` | nothing |
| GitHub repo reports (fork, commit spread, owner match, tests/CI/README) | under any answer with a GitHub link | optional `GITHUB_TOKEN` for higher rate limits |
| Inline Figma previews | under answers with Figma links | nothing |
| Keyboard review (`J`/`K`, `P`/`X`/`U`, `?`) and ⌘K palette | everywhere | nothing |
| Rubric editor | Questions & rubrics page | nothing |

Run the backend smoke test against a local copy of the data:
`SMOKE_MONGO=mongodb://127.0.0.1:27099/mfc_migrate npm run smoke`

## Operations

| Page | What it does |
| --- | --- |
| Interviews | Every booking by day with its panel, status (incl. no-show) and Meet link. Editing a panel updates the Calendar invite and refuses anyone already on another panel at that time. |
| Interviewers | Who can interview, for which domains/expertise, daily caps, unavailable blocks and current load. Bulk paste import. The candidate backend's auto-panel assignment reads this. |
| Comms | Templated mail to any slice of applicants (domain, round, submitted, interview booked, offer status) with a live preview, batched sending, retries and open tracking. |
| Stats | Funnels, sign-ups, submit-time heatmap, subdomain selection rates, interviewer load, AI score vs decisions. |
| Onboarding | Links revealed to candidates when they accept an offer. Selecting someone (round 2) creates the offer automatically; moving them back revokes a pending one. |

## Environment

```env
PORT=5003
CONNECT_STRING=            # same database as the candidate backend
ACCESS_TOKEN_SECERT=       # same value as the candidate backend

LLM_API_KEY=               # AI reviewer (Groq by default)
LLM_BASE_URL=              # optional, any OpenAI-compatible API
LLM_MODEL=                 # optional
GITHUB_TOKEN=              # optional, higher rate limit for repo reports

MFC_EMAIL=                 # Gmail + app password for Comms
MFC_EMAIL_PASSWORD=
CANDIDATE_PORTAL_URL=      # used by {{portalUrl}} in mails

GOOGLE_CLIENT_ID=          # same OAuth client as the candidate backend, to edit panels on Calendar
GOOGLE_CLIENT_SECRET=

VAPID_PUBLIC_KEY=          # same pair as the candidate backend, for status-change pushes
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```
