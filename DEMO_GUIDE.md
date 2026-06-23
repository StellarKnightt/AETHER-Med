# AETHER-Med — Demo Guide

## What Is This Project?

AETHER-Med is a **Hospital Digital Twin** — a real-time simulation of a hospital environment powered by:
- A **FastAPI backend** with PostgreSQL for persistence
- A **React frontend** serving as a hospital command center
- A **Multi-Agent System (MAS)** using LangGraph + Groq LLM for intelligent triage
- **Meta-Agent Ecosystem** for monitoring, evaluating, and recovering agents
- **WebSocket streaming** for real-time vitals and event updates

The system simulates patients, streams their vitals, detects emergencies, and runs an AI-powered triage agent that analyzes conditions and recommends actions — all visualized in a futuristic dark-themed dashboard.

---

## Pre-Demo Setup (Do This Before Presenting)

### 1. Start PostgreSQL
Make sure your PostgreSQL server is running and the database exists.

### 2. Start the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # or source venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```
Wait until you see:
```
AETHER-Med v0.1.0
Database tables initialized
LangGraph workflow loaded
```

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Verify Groq API Key
The `.env` file must contain your `GROQ_API_KEY` for the LLM-powered triage to work.

---

## Demo Script — Step by Step

### Act 1: Introduction (2 min)

**What to say:**
> "This is AETHER-Med — a hospital digital twin that simulates an entire hospital environment in real time. It uses a multi-agent AI system to triage patients, coordinate workflows, and provide intelligent decision support. Let me walk you through it."

**What to show:**
- The **Hospital Command Center Dashboard** (landing page)
- Point out the sidebar navigation organized by workflow: Operations, Medical Staff, Resources, AI Agents, and Simulation.
- Show the top header features: Global Search (Cmd+K) and the Recent Activity panel.

---

### Act 2: The Hospital Command Center (3 min)

**Navigate to:** Sidebar → **Dashboard**

**What you see:** A command center overview with cards showing:
- Patient and Staff Overviews
- Agent Status Center (Triage, Pharma, Scheduler, Bed, Sentinel, Meta-Agent)
- Live Hospital Operations
- Emergency Command Center
- Bed & Resource Overview
- Security & Compliance Overview
- Meta-Agent Health Overview
- Recent Activity Feed

**What to say:**
> "This is the executive command center. It gives us a 10,000-foot view of the entire hospital. Right now the hospital is empty — no simulation is running. All these metrics are live and will update in real-time once we start the simulation."

---

### Act 3: Start the Simulation (3 min) ⭐ KEY MOMENT

**Navigate to:** Sidebar → **Simulation Control Center**

**What you see:**
- A big **"Start Simulation"** button
- Event injection controls
- Sentinel Scenarios (Security & Privacy)
- Meta-Agent Scenarios (System Failures)

**Click "Start Simulation"**

**What happens behind the scenes:**
1. The backend generates **synthetic patients** using Faker with underlying diseases.
2. Each patient's vitals (HR, BP, SpO₂, Temp) begin streaming via WebSocket.
3. Beds are **allocated**.
4. Metrics are broadcast to all connected frontend clients.

**What to say:**
> "I just started the simulation. The backend generated patients with realistic diseases. Their vitals are now streaming live via WebSocket."

**Now go back to Dashboard** — show that the Dashboard metrics are now live and updating.

---

### Act 4: Patient Records & Triage (5 min) ⭐

**Navigate to:** Sidebar → **Patients**

**What you see:**
- A table of all patients with Name, Age, Gender, Status, Priority, Ward.
- Each row has a **"Run Triage"** button.

**Demo: Click the purple "Run Triage" button on any patient row.**

**What happens:**
1. **Animated Pipeline** — 6 steps appear: Receiving Data, Analyzing Vitals, Evaluating Rules, LLM Reasoning (Groq), Retrieving Protocols, Final Decision.
2. **Results appear**:
   - Disease and symptom tags
   - Priority Banner (CRITICAL / HIGH / MODERATE / LOW)
   - Final Decision and reasoning chain generated fresh by the LLM
   - Recommended hospital actions

**What to say:**
> "This is the Triage Agent — powered by Groq's LLaMA 3.3 70B model. It analyzed this patient's vitals, diseases, and symptoms to produce a clinical priority assessment. Notice the reasoning references exact vital values."

**Demo: Click "Trigger Triage (All)"**
Show the batch triage modal where the AI analyzes all active patients simultaneously.

---

### Act 5: Bed Management & Cleaning Workflow (3 min)

**Navigate to:** Sidebar → **Bed Management**

**What you see:**
- Visual grid of hospital beds.
- Color-coded by status (Emerald = Available, Blue = Occupied, Amber = Cleaning).

**Demo: Click an occupied bed to open the Bed Profile.**
1. Shows beautiful glassmorphism profile with live telemetry.
2. Click the glowing amber **"Release Bed to Cleaning Workflow"** button.

**What happens:**
- The bed state changes to `cleaning_required` and then `cleaning`.
- A background workflow automatically finds an available Cleaner from the Cleaning Staff pool and assigns them to sanitize the bed.

**Navigate to:** Sidebar → **Cleaning Staff**
- Show the generated pool of cleaners and their current task assignments.

---

### Act 6: Sentinel SOC & Security (3 min)

**Navigate to:** Sidebar → **Simulation Control Center**
**Go to:** Sentinel Scenarios Tab

**Demo: Launch the "Unauthorized Access Attempt" scenario.**

**Navigate to:** Sidebar → **Sentinel Agent**
**What you see:**
- Live Incident Center.
- The Sentinel Agent detected the simulated security violation.
- It provides a reasoning chain and a recommended action (e.g., "Revoke token").
- Click **Approve** to execute the response action.

**What to say:**
> "The Sentinel Agent continuously monitors the hospital network for security, privacy, and compliance violations. When we injected a threat, it immediately caught it and proposed a mitigation."

---

### Act 7: Meta-Agent Ecosystem (4 min) ⭐

**Navigate to:** Sidebar → **Meta-Agent**

**What you see:**
- The "Agent of Agents" dashboard.
- Live health scores for all 5 operational agents (Reliability, Reasoning Quality, Workflow Compliance).
- A Live Detection Pipeline monitoring agent decisions.

**Navigate back to:** Sidebar → **Simulation Control Center**
**Go to:** Meta-Agent Scenarios Tab

**Demo: Launch the "Triage Agent Hallucination" scenario.**

**Navigate back to:** Sidebar → **Meta-Agent**
**What happens:**
1. The Meta-Agent detects the hallucination.
2. The Triage Agent's health score drops into the red.
3. An incident appears in the pipeline: "Reasoning Degraded".
4. The Meta-Agent proposes an autonomous recovery action: "Rollback prompt template and flush context window".
5. Click **Approve** — the Meta-Agent executes the recovery, and the Triage Agent's health score gradually recovers.

**What to say:**
> "This is the supervisory intelligence layer. In complex multi-agent systems, agents can degrade, hallucinate, or get stuck. The Meta-Agent watches them, scores their health, and when it detects a failure, it autonomously repairs them without human engineering intervention."

---

## How the Architecture Works (For Technical Q&A)

```text
Frontend (React + Vite)
    ↕ REST API (axios)
    ↕ WebSocket (real-time vitals, events, triage results)
    ↓
Backend (FastAPI)
    ├── Simulation Engine
    │   ├── PatientGenerator / VitalsStreamEngine
    │   └── EventGenerator / BedManager / CleaningManager
    │
    ├── Multi-Agent System
    │   ├── Meta-Agent (Supervisor, Evaluator, Healer)
    │   ├── TriageAgent (Groq LLM + Rule-based fallback)
    │   ├── SentinelAgent (Security & Privacy Monitoring)
    │   └── Planned: Pharma, Bed, Scheduler
    │
    └── Database (PostgreSQL)
        ├── patients, beds, cleaners
        ├── triage_results, sentinel_incidents, meta_incidents
        └── patient_vitals, hospital_events
```

## Key Technical Points to Mention

| Topic | What to Say |
|-------|-------------|
| **LLM Reasoning** | "We use Groq's LLaMA 3.3 70B for triage reasoning. It runs in ~1-2 seconds per patient." |
| **Meta-Agent** | "The Meta-Agent is a 'Supervisor of Supervisors'. It observes agent outputs, scores them against expected schemas, and executes dynamic self-healing." |
| **Real-time** | "WebSocket streaming at 2-second intervals. All connected clients see the same data simultaneously." |
| **Persistence** | "Everything persists to PostgreSQL — patients, diseases, triage results, security incidents, agent health. Nothing is lost on refresh." |
| **Modern UI/UX** | "The frontend uses a rich glassmorphism aesthetic with global search (Cmd+K) and a unified activity stream to simulate a true enterprise command center." |

---

## Quick Demo Checklist

```text
[ ] PostgreSQL running
[ ] Backend started (uvicorn)
[ ] Frontend started (npm run dev)
[ ] Browser open at localhost:5173

DEMO FLOW:
[ ] Act 1: Intro & Header (Global Search)
[ ] Act 2: Show Hospital Command Center (Dashboard)
[ ] Act 3: Start Simulation (Simulation Control Center)
[ ] Act 4: Single Patient Triage & Batch Triage (Patients)
[ ] Act 5: Release Bed to Cleaning (Beds & Cleaning Staff)
[ ] Act 6: Launch Security Threat & Approve Mitigation (Sentinel Agent)
[ ] Act 7: Launch Agent Failure & Execute Recovery (Meta-Agent)
[ ] Wrap up with Architecture Overview
```

**Total demo time: ~25 minutes**
