# FS-203 — Multi-Step Onboarding Reliability

## Overview

This project implements a reliable multi-step onboarding flow for CloudForge Technologies.

The prototype addresses two key reliability problems:

1. **Resumable onboarding** — accepted onboarding steps are persisted so users can recover after a network interruption.
2. **Idempotent final submission** — retrying the final submission does not create duplicate workspaces.

The implementation uses:

* React + TypeScript
* Node.js + Express + TypeScript
* REST APIs
* In-memory persistence for the prototype
* Vitest for service-level testing

---

## Problem Statement

Customers may lose onboarding configuration when a network interruption occurs halfway through setup.

For example:

```text
Step 1 → Saved successfully
Step 2 → Network interruption
User reconnects
        ↓
Previously accepted Step 1 must remain available
        ↓
User continues from Step 2
```

A second reliability issue occurs when the user submits the completed onboarding but the response is lost.

```text
Client → Submit
       → Workspace created
       → Network interruption
       → Client does not receive response
       → Client retries
```

The retry must return the existing workspace rather than creating another workspace.

---

## Solution

The prototype uses a server-managed onboarding draft.

Each draft contains:

* Draft ID
* Onboarding data
* Completed steps
* Draft version
* Last updated timestamp
* Submission status
* Workspace ID after successful submission

Example:

```json
{
  "id": "onboarding-123",
  "data": {
    "company": {
      "companyName": "Demo Corp",
      "industry": "Software"
    }
  },
  "completedSteps": ["company"],
  "status": "draft",
  "version": 1
}
```

### Resumable Steps

Each completed step is saved independently through the backend.

```text
Company Details
      ↓
PATCH /api/onboarding/:id/steps
      ↓
Server stores accepted step
      ↓
Admin Details
      ↓
PATCH /api/onboarding/:id/steps
      ↓
Plan Configuration
```

If the network fails while saving a step, the previously accepted steps remain stored.

---

## Idempotent Submission

Final submission requires an `Idempotency-Key` header.

Example:

```http
POST /api/onboarding/:id/submit
Idempotency-Key: unique-submission-key
```

The backend stores the result associated with the key.

First request:

```json
{
  "workspaceId": "workspace-1",
  "onboardingId": "onboarding-123",
  "status": "created"
}
```

Retry with the same key:

```json
{
  "workspaceId": "workspace-1",
  "onboardingId": "onboarding-123",
  "status": "already_created"
}
```

A completed onboarding is also prevented from creating another workspace when a different idempotency key is used.

---

## Project Structure

```text
FS-203-Multi-Step-Onboarding-Reliability/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── onboardingRoutes.ts
│   │   ├── services/
│   │   │   └── onboardingService.ts
│   │   ├── types/
│   │   │   └── onboarding.ts
│   │   ├── validation/
│   │   │   └── onboardingValidation.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   │   └── onboardingService.test.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── app.css
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── T01-business-technical-contract.md
│   ├── T02-baseline-reproduction.md
│   ├── T03-architecture-decision.md
│   ├── T04-failure-modes-tradeoffs.md
│   ├── T05-validation-report.md
│   └── T06-handover-note.md
│
├── .gitignore
└── README.md
```

---

## Backend API

### Create Draft

```http
POST /api/onboarding
```

Creates a new onboarding draft.

### Get Draft

```http
GET /api/onboarding/:id
```

Returns the current saved onboarding state.

### Save Step

```http
PATCH /api/onboarding/:id/steps
```

Request:

```json
{
  "step": "company",
  "data": {
    "companyName": "Demo Corp",
    "industry": "Software"
  }
}
```

Supported steps:

```text
company
admin
plan
```

### Submit Onboarding

```http
POST /api/onboarding/:id/submit
```

Requires:

```http
Idempotency-Key: <unique-key>
```

---

## Running the Project

### Backend

Open a terminal:

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:5001
```

Health check:

```text
http://localhost:5001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "fs-203-onboarding"
}
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

Open the URL in a browser.

---

## Testing

Backend tests:

```bash
cd backend
npm test
```

The test suite covers:

* Normal onboarding flow
* Incomplete onboarding submission
* Network interruption recovery
* Idempotent submission retry
* Different idempotency keys after submission
* Unknown onboarding draft
* Missing idempotency key

Build verification:

```bash
npm run build
```

---

## Reliability Demonstration

The UI includes a **Reliability Demo Controls** section.

### Scenario 1 — Network Failure

1. Start a new onboarding.
2. Enter Company Details.
3. Click **Save & Continue**.
4. Confirm Company is marked **Saved**.
5. Click **Simulate Network Failure**.
6. Attempt to save Admin Details.
7. The save should fail.
8. Click **Restore Network**.
9. The saved Company step should remain available.
10. Continue the onboarding.

### Scenario 2 — Idempotent Submission

1. Complete all three onboarding steps.
2. Click **Submit Onboarding**.
3. Confirm a workspace is created.
4. Retry submission.
5. The existing workspace should be returned instead of creating another workspace.

Expected behavior:

```text
First submission
    ↓
workspace-1
status: created

Retry
    ↓
workspace-1
status: already_created
```

---

## Acceptance Criteria

### AC01 — Network Failure and Duplicate Prevention

**Expected:**

* Previously accepted steps remain saved after a network interruption.
* Users can resume onboarding after network recovery.
* Repeated final submissions do not create duplicate workspaces.

**Prototype status:** Implemented and covered by tests.

### AC02 — Reproducible Examples

The prototype provides reproducible normal, boundary, and failure scenarios.

**Prototype status:** Implemented and documented in the validation report.

### AC03 — Handover and Safety

The project uses synthetic fixture data only.

No real customer information, credentials, secrets, or sensitive production values are included.

**Prototype status:** Documented.

### AC04 — Architecture and Rollback

The project documents the proposed architecture, ownership, rollout gates, rollback approach, risks, and production considerations.

**Prototype status:** Documented in the architecture and handover documents.

---

## Prototype Limitations

This implementation intentionally uses **in-memory storage** to keep the assessment prototype simple and runnable.

Therefore:

* Drafts are lost when the backend process restarts.
* Idempotency records are stored in memory.
* The prototype does not demonstrate multi-instance persistence.
* There is no production database transaction or distributed locking.
* Authentication and authorization are outside the scope of this synthetic assessment.

These limitations would need to be addressed before production deployment.

---

## Production Evolution

A production implementation could use persistent database storage with:

```text
OnboardingDraft
      │
      ├── completed steps
      ├── version
      ├── status
      └── workspace ID

IdempotencyRecord
      │
      ├── idempotency key
      ├── onboarding ID
      ├── response
      └── created timestamp
```

A database transaction and unique constraints should protect workspace creation against concurrent requests.

The production design should also include:

* Persistent draft storage
* Unique idempotency-key constraint
* Transactional workspace creation
* Request correlation IDs
* Structured logging
* Metrics and alerts
* Authentication and authorization
* Data retention policy
* Monitoring of submission failures and retry rates

---

## Technology Choices

### React + TypeScript

Used for the onboarding interface and strongly typed client-side state.

### Node.js + Express

Used for the REST API and onboarding business logic.

### TypeScript

Used across frontend and backend to reduce contract mismatches.

### Vitest

Used for automated service-level tests covering normal, boundary, and failure scenarios.

### In-Memory Storage

Used for the as
