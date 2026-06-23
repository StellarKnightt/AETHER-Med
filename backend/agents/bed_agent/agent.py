"""
Bed Agent
=========
Main class orchestrating the Bed Agent capabilities.
"""

from backend.agents.base.base_agent import BaseAgent
from backend.agents.bed_agent.bed_service import BedService
from backend.agents.bed_agent.bed_workflow import run_bed_workflow
from backend.agents.providers.provider_factory import ProviderFactory
from backend.utils.logger import agent_logger

class BedAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="BedAgent", role="Hospital Bed Coordinator")
        # Initialize Groq LLM
        self.llm = ProviderFactory.get_provider(provider="groq", model_name="llama-3.1-8b-instant", temperature=0.1)

    async def process(self, state: "GlobalWorkflowState") -> "AgentResponse":
        pass

    async def run(self, input_data: dict) -> dict:
        patient_id = input_data.get("patient_id")
        agent_logger.info(f"BedAgent starting for patient {patient_id}")
        
        if not patient_id:
            return {"error": "No patient_id provided"}

        # 1. Fetch patient data
        patient_data = await BedService.get_patient_data(patient_id)
        if not patient_data:
            return {"error": "Patient not found"}
            
        patient_data.update(input_data) # Merge with input (triage priority, etc.)

        # 2. Fetch available beds
        available_beds = await BedService.get_available_beds()

        # 3. Run LLM Workflow
        result = await run_bed_workflow(self.llm, patient_data, available_beds)
        
        # 4. Save to Database
        db_record = await BedService.save_bed_result(patient_id, result)
        result["bed_result_id"] = str(db_record.id)
        if db_record.assigned_bed_id:
            result["assigned_bed_id"] = str(db_record.assigned_bed_id)
        
        # 5. Broadcast to UI via WebSocket
        await BedService.broadcast_bed_event(patient_id, result)
        
        return result
