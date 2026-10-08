# 🎯 Panel Scheduling System — Technical Documentation

> This document provides an architectural overview and guide for the Panel Scheduling System, detailing file changes, core logic, API specifications, and operational workflows.

---

## 📁 Modified and Created Files

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `backend/services/panelScheduler.js` | **NEW** | Core scheduling algorithm matching candidates with eligible interviewer panels |
| 2 | `backend/controllers/schedulerController.js` | **NEW** | API controller handling request validation, candidate query, execution, and persistence |
| 3 | `backend/server.js` | **UPDATED** | Registered route: `POST /admin/schedule-panels` |

> ⚠️ No existing files were deleted or redesigned. Existing database schemas and models were preserved without modifications.

---

## 🧠 Algorithm Architecture & Scheduling Logic

Consider a scenario with:
- **20 candidates** eligible for interviews in the Tech domain
- **6 Tech interviewers** (A, B, C, D, E, F)
- **3 time slots** (10:00, 10:30, 11:00)
- Target panel size = **2** interviewers per interview

### Step 1: Candidate Slot Distribution
Candidates are distributed across available time slots using round-robin distribution to balance density (e.g., approximately 7-7-6 candidates per slot).

### Step 2: Interviewer Availability & Eligibility Filtering
For each time slot, interviewers are evaluated against eligibility criteria:
- **Domain Alignment**: Must support the requested candidate domain (`tech`, `design`, or `management`).
- **Account Status**: Must be marked active (`active: true`).
- **Slot Availability**: Must not have an overlapping interview already scheduled.
- **Capacity Limits**: Must not exceed their maximum daily allocation (`maxPerDay`).
- **Absence Constraints**: Must not have conflicting time windows in their `unavailable` schedule.

### Step 3: Workload Balancing
Eligible interviewers are sorted in ascending order of their assigned interview count (`least-loaded first`). This prevents burnout and ensures fair workload distribution across the recruitment panel.

Example:
- Interviewer A: 3 assigned interviews
- Interviewer B: 1 assigned interview
- Interviewer C: 5 assigned interviews

Assignment priority order: **B → A → C**

### Step 4: Panel Continuity (Pair Preservation)
If Interviewer A and Interviewer B recently conducted an interview together and both remain available for the subsequent slot, the algorithm prioritizes keeping them paired.

**Benefits:**
- Preserves interviewer synergy and conversational flow.
- Enables potential reuse of ongoing meeting sessions.
- Minimizes context switching and panel churn.

### Step 5: Panel Formation & Assignment
Eligible interviewers are chunked into panels of `panelSize` (default: 2). Each generated panel is matched to one candidate in the given time slot.

### Step 6: Unmatched Candidate Handling (Graceful Degradation)
If candidate volume exceeds panel capacity in any slot, surplus candidates are appended to an `unmatched` collection with explanatory context. This prevents runtime errors and surfaces unallocated candidates to administrators for manual scheduling.

---

## 🔌 API Specification

### Endpoint
```http
POST /admin/schedule-panels
```

### Request Headers
```http
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "domain": "tech",
  "slots": [
    { "startTime": "2025-01-20T10:00:00Z", "endTime": "2025-01-20T10:30:00Z" },
    { "startTime": "2025-01-20T10:30:00Z", "endTime": "2025-01-20T11:00:00Z" },
    { "startTime": "2025-01-20T11:00:00Z", "endTime": "2025-01-20T11:30:00Z" }
  ],
  "panelSize": 2,
  "dryRun": true
}
```

### Field Definitions
| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | String | Yes | Target recruitment domain (`"tech"`, `"design"`, or `"management"`) |
| `slots` | Array | Yes | Array of time windows (`startTime` required, `endTime` defaults to `+30m`) |
| `panelSize` | Number | No | Number of interviewers per panel (defaults to `2`) |
| `dryRun` | Boolean | No | Preview mode (`true` skips database persistence; defaults to `false`) |

### Example Response (`200 OK`)
```json
{
  "success": true,
  "dryRun": true,
  "message": "Dry run — nothing saved. Review and re-send with dryRun: false to confirm.",
  "stats": {
    "totalEligible": 20,
    "alreadyBooked": 3,
    "toSchedule": 17,
    "assigned": 9,
    "unmatched": 8,
    "slotsProvided": 3
  },
  "assigned": [
    {
      "candidate": {
        "id": "64f1234567890abcdef12345",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "regno": "22BCE1234"
      },
      "domain": "tech",
      "slotStart": "2025-01-20T10:00:00.000Z",
      "slotEnd": "2025-01-20T10:30:00.000Z",
      "panel": [
        { "id": "64f1234567890abcdef12346", "name": "Alice Smith", "email": "alice@mfc.com" },
        { "id": "64f1234567890abcdef12347", "name": "Bob Jones", "email": "bob@mfc.com" }
      ]
    }
  ],
  "unmatched": [
    {
      "candidate": {
        "id": "64f1234567890abcdef12348",
        "name": "John Doe",
        "email": "john@example.com",
        "regno": "22BCE5678"
      },
      "domain": "tech",
      "slotStart": "2025-01-20T11:00:00.000Z",
      "slotEnd": "2025-01-20T11:30:00.000Z",
      "reason": "No available panel for this slot"
    }
  ]
}
```

---

## 🧪 Recommended Operational Workflow

1. **Simulate with `dryRun: true`**: Inspect the resulting capacity, assignments, and unmatched counts.
2. **Refine Slot Configuration**: Adjust or expand time slots if the unmatched volume is high.
3. **Persist with `dryRun: false`**: Execute the final request to create `Meet` records and `PanelAssignment` entries in MongoDB.

---

## 🛡️ Edge Cases and Fault Tolerance

| Scenario | Behavior |
|---|---|
| Zero eligible candidates at Round 1 | Returns `200 OK` with zero count stats and empty lists |
| All candidates already scheduled | Detects existing meetings and returns status without duplicate booking |
| Odd number of interviewers (e.g., 5 with panelSize 2) | Forms 2 panels; surplus interviewer remains unallocated without errors |
| Interviewer reaches daily capacity mid-run | Excluded from subsequent slots to honor limits |
| Zero available interviewers for a domain | Candidates gracefully fall back to the `unmatched` list |
| Malformed or invalid slot timestamps | Returns `400 Bad Request` with descriptive validation message |
| Missing or invalid Authorization header | Returns `401 Unauthorized` |
| Database query or write exceptions | Caught gracefully with `500 Internal Server Error` logged safely |

---

## 📂 Referenced Data Models

- **`User`**: Candidate profiles; `[domain]: 1` indicates clearance for Round 1 interviews.
- **`Interviewer`**: Reviewer records containing `domains`, `active`, `maxPerDay`, and `unavailable`.
- **`PanelAssignment`**: Tracks individual interviewer commitments with a compound index on `email + startTime`.
- **`Meet` (`MeetDetails`)**: Represents the interview meeting, containing `intervieweremail`, `scheduledTime`, and `status`.
