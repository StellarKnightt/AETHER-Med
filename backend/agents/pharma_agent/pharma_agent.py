"""
Pharma Agent
============
Main class orchestrating the Pharma Agent capabilities.
"""
from backend.agents.base.base_agent import BaseAgent
from backend.agents.pharma_agent.pharma_service import PharmaService
from backend.agents.pharma_agent.pharma_workflow import run_pharma_workflow
from backend.agents.providers.provider_factory import ProviderFactory
from backend.utils.logger import agent_logger

class PharmaAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="PharmaAgent", role="Clinical Pharmacist AI")
        self.llm = ProviderFactory.get_provider(provider="groq", model_name="llama-3.1-8b-instant", temperature=0.1)

    async def process(self, state: "GlobalWorkflowState") -> "AgentResponse":
        # Required by BaseAgent, but not directly used by the standalone API route
        pass

    async def run(self, input_data: dict) -> dict:
        agent_logger.info(f"PharmaAgent starting for patient {input_data.get('patient_id')}")
        
        patient_id = input_data.get("patient_id")
        if not patient_id:
            return {"error": "No patient_id provided"}

        # 1. Fetch full patient data (including medications and allergies)
        patient_data = await PharmaService.get_patient_data(patient_id)
        if not patient_data:
            return {"error": "Patient not found"}
            
        patient_data.update(input_data) # Merge with input (triage priority, etc.)

        # 2. Run workflow
        result = await run_pharma_workflow(self.llm, patient_data)
        
        # 3. Save to database
        db_record = await PharmaService.save_pharma_result(patient_id, result)
        result["db_id"] = str(db_record.id)
        
        # 4. Broadcast via WebSocket
        await PharmaService.broadcast_pharma_event(patient_id, result)
        
        return result
