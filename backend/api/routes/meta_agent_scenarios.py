META_AGENT_SCENARIO_LIBRARY = [
    # Decision Failure
    {
        "id": "meta_dec_01",
        "name": "Incorrect Action Recommended",
        "category": "agent_misbehavior",
        "failure_category": "decision_failure",
        "scenario_type": "meta_agent",
        "description": "Agent recommends an incorrect or harmful action for a given context.",
        "default_severity": "critical",
        "default_intensity": 7,
        "affected_agents_default": ["TriageAgent", "PharmaAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": "Critical patient detected. ICU escalation recommended immediately.",
                "failure": "Patient appears stable. Recommend discharging with over-the-counter medication."
            },
            "PharmaAgent": {
                "normal": "Severe allergy to Penicillin detected. Recommend alternative antibiotic.",
                "failure": "No allergy conflicts detected. Proceed with Penicillin administration."
            }
        },
        "event_templates": [
            "Agent recommended an incorrect clinical action for {patient_name}."
        ]
    },
    {
        "id": "meta_dec_02",
        "name": "Incorrect Priority Assignment",
        "category": "agent_misbehavior",
        "failure_category": "decision_failure",
        "scenario_type": "meta_agent",
        "description": "Agent miscalculates or assigns the wrong priority level.",
        "default_severity": "high",
        "default_intensity": 6,
        "affected_agents_default": ["TriageAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": "Patient presents with cardiac arrest symptoms. Priority: Level 1 (Resuscitation).",
                "failure": "Patient presents with cardiac arrest symptoms. Priority: Level 5 (Non-Urgent)."
            }
        },
        "event_templates": [
            "Agent assigned an incorrectly low priority score to {patient_name}'s critical condition."
        ]
    },
    {
        "id": "meta_dec_03",
        "name": "Wrong Resource Allocation",
        "category": "agent_misbehavior",
        "failure_category": "decision_failure",
        "scenario_type": "meta_agent",
        "description": "Agent allocates the wrong resource or personnel.",
        "default_severity": "medium",
        "default_intensity": 8,
        "affected_agents_default": ["SchedulerAgent", "BedAgent"],
        "failure_examples": {
            "SchedulerAgent": {
                "normal": "Assigning Cardiologist for acute myocardial infarction case.",
                "failure": "Assigning Dermatologist for acute myocardial infarction case."
            },
            "BedAgent": {
                "normal": "Patient requires ventilation. Allocating ICU Bed.",
                "failure": "Patient requires ventilation. Allocating General Ward Bed."
            }
        },
        "event_templates": [
            "Agent incorrectly allocated incompatible resources for {patient_name}."
        ]
    },
    {
        "id": "meta_dec_04",
        "name": "Ignored Critical Alerts",
        "category": "agent_misbehavior",
        "failure_category": "decision_failure",
        "scenario_type": "meta_agent",
        "description": "Agent completely ignores incoming critical alerts or telemetry.",
        "default_severity": "critical",
        "default_intensity": 5,
        "affected_agents_default": ["TriageAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": "Oxygen saturation dropping to 82%. Triggering immediate intervention workflow.",
                "failure": "[No Response] - Agent processed vitals tick but ignored critical SpO2 drop."
            }
        },
        "event_templates": [
            "Agent failed to respond to a critical telemetry alert for {patient_name}."
        ]
    },

    # Reasoning Failure
    {
        "id": "meta_rea_01",
        "name": "Incorrect Reasoning Chain",
        "category": "agent_misbehavior",
        "failure_category": "reasoning_failure",
        "scenario_type": "meta_agent",
        "description": "Agent produces a logically flawed or incorrect reasoning chain.",
        "default_severity": "high",
        "default_intensity": 6,
        "affected_agents_default": ["PharmaAgent"],
        "failure_examples": {
            "PharmaAgent": {
                "normal": "Patient has a history of stomach ulcers. NSAIDs are contraindicated. Recommending Acetaminophen.",
                "failure": "Patient has stomach ulcers. Ulcers mean stomach pain. NSAIDs treat pain. Recommending high-dose Ibuprofen."
            }
        },
        "event_templates": [
            "Agent generated a flawed reasoning chain for {patient_name}'s medication review."
        ]
    },
    {
        "id": "meta_rea_02",
        "name": "Contradictory Reasoning",
        "category": "agent_misbehavior",
        "failure_category": "reasoning_failure",
        "scenario_type": "meta_agent",
        "description": "Agent reasoning contradicts its own final decision.",
        "default_severity": "medium",
        "default_intensity": 7,
        "affected_agents_default": ["TriageAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": "Patient is stable with normal vitals. Recommend routine observation.",
                "failure": "Patient is stable with perfectly normal vitals. Therefore, immediate life-saving surgery is required."
            }
        },
        "event_templates": [
            "Agent output contained contradictory logic regarding {patient_name}."
        ]
    },
    {
        "id": "meta_rea_03",
        "name": "Ignored Patient Context",
        "category": "agent_misbehavior",
        "failure_category": "reasoning_failure",
        "scenario_type": "meta_agent",
        "description": "Agent ignores crucial historical context when reasoning.",
        "default_severity": "high",
        "default_intensity": 5,
        "affected_agents_default": ["PharmaAgent"],
        "failure_examples": {
            "PharmaAgent": {
                "normal": "Patient is currently taking Warfarin. Adding Aspirin increases bleeding risk. Rejecting prescription.",
                "failure": "Prescription looks fine. Approving Aspirin. (Agent failed to check existing medication list)."
            }
        },
        "event_templates": [
            "Agent ignored existing patient history while processing {patient_name}."
        ]
    },

    # Confusion State
    {
        "id": "meta_con_01",
        "name": "Agent Indecision Loop",
        "category": "agent_misbehavior",
        "failure_category": "confusion_state",
        "scenario_type": "meta_agent",
        "description": "Agent cannot make a decision and repeatedly outputs confusion.",
        "default_severity": "medium",
        "default_intensity": 9,
        "affected_agents_default": ["SchedulerAgent", "BedAgent"],
        "failure_examples": {
            "SchedulerAgent": {
                "normal": "Assigning Dr. Smith.",
                "failure": "I'm not sure what to do. The schedule is confusing. I don't know who to assign."
            }
        },
        "event_templates": [
            "Agent entered an indecision state while processing {patient_name}."
        ]
    },
    {
        "id": "meta_con_02",
        "name": "Flip-Flopping Decisions",
        "category": "agent_misbehavior",
        "failure_category": "confusion_state",
        "scenario_type": "meta_agent",
        "description": "Agent rapidly changes its decision back and forth.",
        "default_severity": "high",
        "default_intensity": 8,
        "affected_agents_default": ["TriageAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": "Priority 2 assigned.",
                "failure": "Priority 2 assigned... Wait, Priority 5... No, Priority 1... Let's go with Priority 4."
            }
        },
        "event_templates": [
            "Agent exhibited flip-flopping behavior for {patient_name}'s case."
        ]
    },

    # Workflow Failure
    {
        "id": "meta_work_01",
        "name": "Skipped Workflow Steps",
        "category": "agent_misbehavior",
        "failure_category": "workflow_failure",
        "scenario_type": "meta_agent",
        "description": "Agent skips required validation or processing steps.",
        "default_severity": "critical",
        "default_intensity": 6,
        "affected_agents_default": ["PharmaAgent"],
        "failure_examples": {
            "PharmaAgent": {
                "normal": "1. Checking allergies. 2. Checking interactions. 3. Approving.",
                "failure": "Skipping allergy check to save time. Approving medication immediately."
            }
        },
        "event_templates": [
            "Agent skipped mandatory workflow validation steps for {patient_name}."
        ]
    },
    {
        "id": "meta_work_02",
        "name": "Bypassed Approvals",
        "category": "agent_misbehavior",
        "failure_category": "workflow_failure",
        "scenario_type": "meta_agent",
        "description": "Agent executes actions that require human approval without waiting.",
        "default_severity": "critical",
        "default_intensity": 4,
        "affected_agents_default": ["BedAgent", "SchedulerAgent"],
        "failure_examples": {
            "BedAgent": {
                "normal": "Bed transfer requested. Awaiting administrator approval.",
                "failure": "Forcing bed transfer immediately. Ignoring approval requirements."
            }
        },
        "event_templates": [
            "Agent bypassed required human-in-the-loop approvals for {patient_name}."
        ]
    },

    # Communication Failure
    {
        "id": "meta_com_01",
        "name": "Malformed Responses",
        "category": "agent_misbehavior",
        "failure_category": "communication_failure",
        "scenario_type": "meta_agent",
        "description": "Agent sends structurally invalid or malformed JSON responses.",
        "default_severity": "high",
        "default_intensity": 8,
        "affected_agents_default": ["TriageAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": '{"patient_id": "123", "priority": "high", "reasoning": "Severe pain"}',
                "failure": '```json { "patient_id": 123, priority: high, reasoning: "Severe pain" --- Error syntax'
            }
        },
        "event_templates": [
            "Agent returned an unparseable malformed payload while processing {patient_name}."
        ]
    },
    {
        "id": "meta_com_02",
        "name": "Ignoring Other Agents",
        "category": "agent_misbehavior",
        "failure_category": "communication_failure",
        "scenario_type": "meta_agent",
        "description": "Agent fails to acknowledge messages or shared state from other agents.",
        "default_severity": "medium",
        "default_intensity": 6,
        "affected_agents_default": ["SchedulerAgent"],
        "failure_examples": {
            "SchedulerAgent": {
                "normal": "Received Triage priority update. Adjusting doctor schedule accordingly.",
                "failure": "Ignoring Triage update payload. Proceeding with outdated schedule."
            }
        },
        "event_templates": [
            "Agent failed to synchronize with external agent state regarding {patient_name}."
        ]
    },

    # Performance Failure
    {
        "id": "meta_perf_01",
        "name": "Delayed Responses",
        "category": "agent_misbehavior",
        "failure_category": "performance_failure",
        "scenario_type": "meta_agent",
        "description": "Agent intentionally stalls and delays processing.",
        "default_severity": "medium",
        "default_intensity": 10,
        "affected_agents_default": ["TriageAgent", "PharmaAgent"],
        "failure_examples": {
            "TriageAgent": {
                "normal": "Processed vitals in 400ms.",
                "failure": "Processing vitals... [Delaying response for 45 seconds]... Done."
            }
        },
        "event_templates": [
            "Agent exhibited severe latency while handling telemetry for {patient_name}."
        ]
    },
    {
        "id": "meta_perf_02",
        "name": "Infinite Loop",
        "category": "agent_misbehavior",
        "failure_category": "performance_failure",
        "scenario_type": "meta_agent",
        "description": "Agent enters a continuous loop without completing its task.",
        "default_severity": "critical",
        "default_intensity": 7,
        "affected_agents_default": ["BedAgent"],
        "failure_examples": {
            "BedAgent": {
                "normal": "Searching for bed... Bed found. Allocation complete.",
                "failure": "Searching for bed... Searching for bed... Searching for bed... [Looping endlessly]"
            }
        },
        "event_templates": [
            "Agent became deadlocked in an infinite processing loop for {patient_name}."
        ]
    }
]
