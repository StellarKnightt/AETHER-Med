# Bug Discovery and Fix Diagnostic Log

This log lists all software bugs discovered during the system stabilization audit phase.

## Discovered Bugs

### BUG-001: patient.assigned_bed_id Attribute Error in Bed Node
- **Root Cause:** The Bed node attempted to assign patient.assigned_bed_id, but the Patient database model has no assigned_bed_id column.
- **Affected Files:** backend/graph/nodes/bed_node.py
- **Fix Description:** Removed the invalid assigned_bed_id assignment; the bed allocation relationship is persisted directly in the Beds table.
- **Validation Evidence:** BedNode runs to completion without raising AttributeError, patient status transitions to 'admitted'.

---
### BUG-002: Key Mismatch in Outcome Node Consolidated Report
- **Root Cause:** Outcome node was mapping empty/None fields because it looked for scheduler.assigned_doctor and bed.assigned_bed instead of the actual LLM keys scheduler.assigned_doctor_name and bed.assigned_bed_number.
- **Affected Files:** backend/graph/nodes/outcome_node.py
- **Fix Description:** Updated key maps to match actual agent output payloads.
- **Validation Evidence:** OutcomeReport outcome_report JSON fields are fully populated (doctor, nurse, bed, ward, risk_level).

---
### BUG-003: Hardcoded Dummy Vitals in Patient Fetch Helper
- **Root Cause:** _fetch_patient helper was loading static stable vitals (SpO2 97%) for all patients, preventing cardiac/hypoxia patients from triggering critical triage status during workflow execution.
- **Affected Files:** backend/api/routes/triage.py
- **Fix Description:** Queried the patient_vitals table for the patient's latest baseline vitals before running triage.
- **Validation Evidence:** Critical patients (Marcus Sterling, Gordon Freeman) correctly escalate to 'CRITICAL' priority.

---
### BUG-004: Missing final_decision in Triage Output Payload
- **Root Cause:** The triage node was not saving final_decision in the state output, causing the Trace Viewer UI to display an empty clinical decision card.
- **Affected Files:** backend/graph/nodes/triage_node.py
- **Fix Description:** Explicitly added final_decision to the triage node transition and state output payload.
- **Validation Evidence:** Triage card displays the exact text of the triage final decision.

---
