"""
Scheduler Agent
===============
Main class orchestrating the Scheduler Agent capabilities.
"""
from backend.agents.base.base_agent import BaseAgent
from backend.agents.scheduler_agent.scheduler_service import SchedulerService
from backend.agents.scheduler_agent.scheduler_workflow import run_scheduler_workflow
from backend.agents.providers.provider_factory import ProviderFactory
from backend.utils.logger import agent_logger

class SchedulerAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="SchedulerAgent", role="Operations Coordinator AI")
        self.llm = ProviderFactory.get_provider(provider="groq", model_name="llama-3.1-8b-instant", temperature=0.1)

    async def process(self, state: "GlobalWorkflowState") -> "AgentResponse":
        # Required by BaseAgent
        pass

    async def run(self, input_data: dict) -> dict:
        agent_logger.info(f"SchedulerAgent starting for patient {input_data.get('patient_id')}")
        
        patient_id = input_data.get("patient_id")
        if not patient_id:
            return {"error": "No patient_id provided"}

        # 1. Fetch patient data (including Triage and Pharma context)
        patient_data = await SchedulerService.get_patient_data(patient_id)
        if not patient_data:
            return {"error": "Patient not found"}
            
        patient_data.update(input_data)

        # 2. Fetch staff data
        staff_data = await SchedulerService.get_staff_data()

        # 3. Run workflow
        result = await run_scheduler_workflow(self.llm, patient_data, staff_data)
        
        # 4. Save to database
        db_record = await SchedulerService.save_scheduler_result(patient_id, result)
        result["id"] = str(db_record.id)
        
        # 5. Broadcast via WebSocket
        await SchedulerService.broadcast_scheduler_event(patient_id, result)
        
        return result
