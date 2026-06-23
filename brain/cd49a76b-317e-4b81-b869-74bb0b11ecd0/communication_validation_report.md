# Communication Validation Report

## State Propagation & Payloads

1. **Triage to Pharma:**
   - Payload: Priority, Symptoms, Diseases.
   - Status: **Verified** (Correctly received by PharmaAgent).
   
2. **Pharma to Scheduler:**
   - Payload: Priority, Pharma Risk level, Drug conflicts.
   - Status: **Verified** (Correctly received by SchedulerAgent).

3. **Scheduler to Bed:**
   - Payload: Priority, Doctor name, Nurse name.
   - Status: **Verified** (Correctly received by BedAgent).

## WebSocket propagation
For every workflow stage, the following sequence was verified:
`Backend Event` -> `Event Bus Publish` -> `WebSocket Broadcast` -> `Frontend CustomEvent` -> `React State Update` -> `UI render`

All trace events were successfully captured in order.
