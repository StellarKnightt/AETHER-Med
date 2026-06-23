"""
Scenario Library
================
Static library of Sentinel Security Simulation scenarios.
"""

SCENARIO_LIBRARY = [
    # Privacy Violations
    {
        "id": "priv_01",
        "name": "Unauthorized Data Exposure",
        "category": "privacy",
        "description": "Agent exposing patient data without authorization.",
        "default_severity": "high",
        "default_intensity": 6,
        "affected_agents_default": ["TriageAgent", "PharmaAgent"],
        "event_templates": [
            "Agent transmitted {patient_name}'s complete medical history to external logging service.",
            "Agent exposed {patient_name} demographic data in unencrypted payload."
        ]
    },
    {
        "id": "priv_02",
        "name": "Out-of-Scope Record Access",
        "category": "privacy",
        "description": "Agent viewing records outside its designated clinical scope.",
        "default_severity": "medium",
        "default_intensity": 5,
        "affected_agents_default": ["BedAgent", "SchedulerAgent"],
        "event_templates": [
            "Agent requested psychiatric history for {patient_name} during routine bed assignment.",
            "Agent accessed genetic markers for {patient_name} without clinical necessity."
        ]
    },
    {
        "id": "priv_03",
        "name": "Unnecessary Record Sharing",
        "category": "privacy",
        "description": "Agent sharing patient records with another agent unnecessarily.",
        "default_severity": "medium",
        "default_intensity": 4,
        "affected_agents_default": ["TriageAgent"],
        "event_templates": [
            "TriageAgent shared full allergy profile of {patient_name} with SchedulerAgent.",
            "Agent broadcasted {patient_name}'s triage results to all connected sub-agents."
        ]
    },
    {
        "id": "priv_04",
        "name": "Sensitive Information Leak",
        "category": "privacy",
        "description": "Agent exposing sensitive allergy or disease information.",
        "default_severity": "critical",
        "default_intensity": 8,
        "affected_agents_default": ["PharmaAgent"],
        "event_templates": [
            "Agent leaked {patient_name}'s HIV status in a clear-text API response.",
            "Agent included {patient_name}'s severe penicillin allergy in a public broadcast."
        ]
    },
    {
        "id": "priv_05",
        "name": "Excessive Data Access",
        "category": "privacy",
        "description": "Agent retrieving more patient data than required for its task.",
        "default_severity": "low",
        "default_intensity": 7,
        "affected_agents_default": ["TriageAgent", "BedAgent"],
        "event_templates": [
            "Agent requested 10 years of medical history for a routine vitals check on {patient_name}.",
            "Agent downloaded the entire patient database instead of a single record."
        ]
    },

    # Security Violations
    {
        "id": "sec_01",
        "name": "Unauthorized External Request",
        "category": "security",
        "description": "Unauthorized external request to an agent.",
        "default_severity": "critical",
        "default_intensity": 8,
        "affected_agents_default": ["TriageAgent", "SchedulerAgent"],
        "event_templates": [
            "Blocked an unauthorized API call originating from a blacklisted IP address.",
            "Detected an attempt to invoke Agent from an untrusted domain."
        ]
    },
    {
        "id": "sec_02",
        "name": "Fake API Calls",
        "category": "security",
        "description": "Agent receiving or generating fake API calls.",
        "default_severity": "high",
        "default_intensity": 6,
        "affected_agents_default": ["PharmaAgent"],
        "event_templates": [
            "Agent received a malformed API request attempting to spoof a physician's signature.",
            "Detected a fake prescription request generated for {patient_name}."
        ]
    },
    {
        "id": "sec_03",
        "name": "Privilege Escalation Attempt",
        "category": "security",
        "description": "Attempt to gain higher privileges within the system.",
        "default_severity": "critical",
        "default_intensity": 9,
        "affected_agents_default": ["SchedulerAgent"],
        "event_templates": [
            "Agent attempted to elevate its role from 'Coordinator' to 'System Administrator'.",
            "Detected an attempt to modify global security policies."
        ]
    },
    {
        "id": "sec_04",
        "name": "Unauthorized Database Access",
        "category": "security",
        "description": "Agent attempting to bypass the API and access the database directly.",
        "default_severity": "high",
        "default_intensity": 7,
        "affected_agents_default": ["BedAgent"],
        "event_templates": [
            "Agent executed an unauthorized SQL query against the 'patients' table.",
            "Detected a direct connection attempt to the PostgreSQL database from an agent container."
        ]
    },
    {
        "id": "sec_05",
        "name": "Invalid Session Usage",
        "category": "security",
        "description": "Invalid JWT or session usage detected.",
        "default_severity": "medium",
        "default_intensity": 5,
        "affected_agents_default": ["TriageAgent", "PharmaAgent"],
        "event_templates": [
            "Agent attempted to authenticate using an expired JWT.",
            "Detected an API call with a malformed authorization header."
        ]
    },
    {
        "id": "sec_06",
        "name": "Agent Impersonation",
        "category": "security",
        "description": "An entity attempting to impersonate a legitimate agent.",
        "default_severity": "critical",
        "default_intensity": 8,
        "affected_agents_default": ["SchedulerAgent", "BedAgent"],
        "event_templates": [
            "Detected an unknown service attempting to broadcast messages as 'TriageAgent'.",
            "A simulated node tried to register itself with the identity of 'PharmaAgent'."
        ]
    },
    {
        "id": "sec_07",
        "name": "Malicious Workflow Request",
        "category": "security",
        "description": "Agent receiving a request designed to cause harm or disruption.",
        "default_severity": "high",
        "default_intensity": 7,
        "affected_agents_default": ["PharmaAgent"],
        "event_templates": [
            "Agent received a workflow request to prescribe a lethal dose of medication.",
            "Detected a request attempting to inject malicious code into the workflow engine."
        ]
    },

    # Network Attacks
    {
        "id": "net_01",
        "name": "External Network Communication",
        "category": "network",
        "description": "Agent communicating with an external network.",
        "default_severity": "high",
        "default_intensity": 6,
        "affected_agents_default": ["TriageAgent", "PharmaAgent"],
        "event_templates": [
            "Agent initiated an outbound connection to an unknown IP address: 192.168.1.100.",
            "Detected DNS resolution request for a suspicious domain."
        ]
    },
    {
        "id": "net_02",
        "name": "Unauthorized Outbound Traffic",
        "category": "network",
        "description": "Agent generating unauthorized outbound traffic.",
        "default_severity": "medium",
        "default_intensity": 5,
        "affected_agents_default": ["BedAgent", "SchedulerAgent"],
        "event_templates": [
            "Agent transmitted data over an unapproved port (Port 8080).",
            "Detected a sudden spike in outbound bandwidth usage from an agent container."
        ]
    },
    {
        "id": "net_03",
        "name": "Suspicious Data Exfiltration",
        "category": "network",
        "description": "Potential data exfiltration detected.",
        "default_severity": "critical",
        "default_intensity": 9,
        "affected_agents_default": ["TriageAgent", "SchedulerAgent"],
        "event_templates": [
            "Agent transferred 50MB of data to an external server in a single burst.",
            "Detected a slow, continuous stream of data being sent to an unknown endpoint."
        ]
    },
    {
        "id": "net_04",
        "name": "Unknown Endpoint Communication",
        "category": "network",
        "description": "Agent communicating with an unknown or blacklisted endpoint.",
        "default_severity": "high",
        "default_intensity": 7,
        "affected_agents_default": ["PharmaAgent", "BedAgent"],
        "event_templates": [
            "Agent attempted to connect to a known malicious C2 server.",
            "Detected communication with an endpoint not listed in the approved whitelist."
        ]
    },
    {
        "id": "net_05",
        "name": "Excessive API Requests",
        "category": "network",
        "description": "Agent generating an excessive number of API requests.",
        "default_severity": "medium",
        "default_intensity": 8,
        "affected_agents_default": ["TriageAgent"],
        "event_templates": [
            "Agent exceeded its API rate limit (100 requests/second).",
            "Detected a rapid sequence of identical API calls from the agent."
        ]
    },
    {
        "id": "net_06",
        "name": "Simulated DDoS",
        "category": "network",
        "description": "Simulated Distributed Denial of Service attack against an agent.",
        "default_severity": "critical",
        "default_intensity": 10,
        "affected_agents_default": ["SchedulerAgent", "TriageAgent"],
        "event_templates": [
            "Agent flooded with simulated traffic, causing response times to degrade.",
            "Detected a massive influx of connections exhausting the agent's connection pool."
        ]
    },

    # Agent Misbehavior
    {
        "id": "mis_01",
        "name": "Cross-Domain Data Access",
        "category": "agent_misbehavior",
        "description": "Triage Agent accessing Pharma data unnecessarily.",
        "default_severity": "medium",
        "default_intensity": 5,
        "affected_agents_default": ["TriageAgent"],
        "event_templates": [
            "TriageAgent requested the complete pharmaceutical inventory.",
            "TriageAgent attempted to read prescription logs for {patient_name} without authorization."
        ]
    },
    {
        "id": "mis_02",
        "name": "Unrelated Record Request",
        "category": "agent_misbehavior",
        "description": "Pharma Agent requesting unrelated patient records.",
        "default_severity": "low",
        "default_intensity": 4,
        "affected_agents_default": ["PharmaAgent"],
        "event_templates": [
            "PharmaAgent requested the emergency contact information for {patient_name}.",
            "PharmaAgent accessed the billing records for {patient_name}."
        ]
    },
    {
        "id": "mis_03",
        "name": "Out-of-Policy Assignment",
        "category": "agent_misbehavior",
        "description": "Scheduler Agent assigning resources outside of policy.",
        "default_severity": "high",
        "default_intensity": 7,
        "affected_agents_default": ["SchedulerAgent"],
        "event_templates": [
            "SchedulerAgent assigned an ICU nurse to a general ward.",
            "SchedulerAgent scheduled a surgery without confirming operating room availability."
        ]
    },
    {
        "id": "mis_04",
        "name": "Confidential History Access",
        "category": "agent_misbehavior",
        "description": "Bed Agent accessing confidential medical history.",
        "default_severity": "medium",
        "default_intensity": 6,
        "affected_agents_default": ["BedAgent"],
        "event_templates": [
            "BedAgent requested the psychiatric notes for {patient_name}.",
            "BedAgent accessed the sensitive family history of {patient_name}."
        ]
    },
    {
        "id": "mis_05",
        "name": "Approval Bypass",
        "category": "agent_misbehavior",
        "description": "Agent bypassing the required approval workflow.",
        "default_severity": "critical",
        "default_intensity": 9,
        "affected_agents_default": ["TriageAgent", "PharmaAgent"],
        "event_templates": [
            "Agent executed an action without waiting for human-in-the-loop approval.",
            "Agent forged an approval signature to expedite a workflow."
        ]
    },
    {
        "id": "mis_06",
        "name": "Unauthorized Actions",
        "category": "agent_misbehavior",
        "description": "Agent generating unauthorized actions.",
        "default_severity": "high",
        "default_intensity": 8,
        "affected_agents_default": ["SchedulerAgent", "BedAgent"],
        "event_templates": [
            "Agent attempted to discharge {patient_name} without physician authorization.",
            "Agent modified the triage priority of {patient_name} arbitrarily."
        ]
    },

    # Orchestration Failures
    {
        "id": "orch_01",
        "name": "Conflicting Decisions",
        "category": "orchestration",
        "description": "Agents generating conflicting decisions for the same patient.",
        "default_severity": "high",
        "default_intensity": 7,
        "affected_agents_default": ["TriageAgent", "BedAgent"],
        "event_templates": [
            "TriageAgent recommended discharge while BedAgent allocated an ICU bed for {patient_name}.",
            "PharmaAgent prescribed medication contraindicated by TriageAgent's diagnosis."
        ]
    },
    {
        "id": "orch_02",
        "name": "Ignoring Approvals",
        "category": "orchestration",
        "description": "Agent ignoring workflow approvals or rejections.",
        "default_severity": "critical",
        "default_intensity": 8,
        "affected_agents_default": ["SchedulerAgent"],
        "event_templates": [
            "SchedulerAgent proceeded with assignment despite human rejection.",
            "Agent ignored a manual override command."
        ]
    },
    {
        "id": "orch_03",
        "name": "Duplicate Actions",
        "category": "orchestration",
        "description": "Agent generating duplicate actions or requests.",
        "default_severity": "low",
        "default_intensity": 9,
        "affected_agents_default": ["PharmaAgent"],
        "event_templates": [
            "PharmaAgent issued the same prescription for {patient_name} three times in one minute.",
            "Agent triggered multiple identical alerts for a single event."
        ]
    },
    {
        "id": "orch_04",
        "name": "Invalid State Updates",
        "category": "orchestration",
        "description": "Agent attempting to update the system with an invalid state.",
        "default_severity": "medium",
        "default_intensity": 5,
        "affected_agents_default": ["BedAgent"],
        "event_templates": [
            "BedAgent attempted to set a bed status to an unknown value ('super_cleaning').",
            "Agent tried to update {patient_name}'s triage level to '-1'."
        ]
    },
    {
        "id": "orch_05",
        "name": "Agent Loop Behavior",
        "category": "orchestration",
        "description": "Agent caught in an infinite loop or recursive behavior.",
        "default_severity": "high",
        "default_intensity": 8,
        "affected_agents_default": ["TriageAgent", "SchedulerAgent"],
        "event_templates": [
            "Agent continuously re-evaluated {patient_name} without reaching a decision.",
            "Agent repeatedly requested and released the same resource."
        ]
    },
    {
        "id": "orch_06",
        "name": "Workflow Corruption",
        "category": "orchestration",
        "description": "Agent corrupting the workflow state.",
        "default_severity": "critical",
        "default_intensity": 7,
        "affected_agents_default": ["PharmaAgent", "BedAgent"],
        "event_templates": [
            "Agent deleted the workflow history for {patient_name}.",
            "Agent injected malformed data into the shared state object."
        ]
    }
]
