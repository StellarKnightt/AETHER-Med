import asyncio
import json
import uuid
import time
from sqlalchemy import select
from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.database.models.workflow_execution import WorkflowExecutionModel
from backend.database.models.scheduler_result import SchedulerResultModel
from backend.database.models.doctor import DoctorModel
from backend.graph.services.graph_executor import start_mas_workflow, resume_mas_workflow

async def main():
    print("Testing MAS Workflow Scheduler Fix...")
    async with async_session_factory() as session:
        # Get a test patient
        patient_res = await session.execute(select(Patient).limit(1))
        patient = patient_res.scalars().first()
        if not patient:
            print("No patient found. Cannot test.")
            return
        
        patient_id_str = str(patient.id)
        print(f"Using Patient ID: {patient_id_str}")

        # Record initial workload of doctors
        doc_res = await session.execute(select(DoctorModel))
        initial_docs = {str(d.id): d.current_workload_score for d in doc_res.scalars().all()}

    # 1. Start workflow
    print("Starting workflow...")
    await start_mas_workflow(patient_id_str, auto_approve=False)
    
    # 2. Wait a moment and find the execution ID
    await asyncio.sleep(2)
    async with async_session_factory() as session:
        exec_res = await session.execute(
            select(WorkflowExecutionModel)
            .where(WorkflowExecutionModel.patient_id == uuid.UUID(patient_id_str))
            .order_by(WorkflowExecutionModel.created_at.desc())
            .limit(1)
        )
        execution = exec_res.scalars().first()
        if not execution:
            print("Execution not found.")
            return
        execution_id = str(execution.id)
        print(f"Execution ID: {execution_id}")
        print(f"Status: {execution.status}")
        
        if execution.status == "awaiting_approval":
            print("Approving workflow...")
            await resume_mas_workflow(execution_id, "approve")
            await asyncio.sleep(5)  # Wait for workflow to complete
            
    # 3. Check Scheduler result
    async with async_session_factory() as session:
        sched_res = await session.execute(
            select(SchedulerResultModel)
            .where(SchedulerResultModel.patient_id == uuid.UUID(patient_id_str))
            .order_by(SchedulerResultModel.created_at.desc())
            .limit(1)
        )
        sched_record = sched_res.scalars().first()
        if not sched_record:
            print("Scheduler result not found. Workflow may have failed or not reached scheduler.")
            return
            
        print(f"Scheduler Status: {sched_record.status}")
        print(f"Assigned Doctor: {sched_record.assigned_doctor_name}")
        
        # Verify workload update
        if sched_record.assigned_doctor_id:
            doc = await session.get(DoctorModel, sched_record.assigned_doctor_id)
            old_score = initial_docs.get(sched_record.assigned_doctor_id, 0)
            print(f"Doctor Workload Update: {old_score} -> {doc.current_workload_score}")
            if doc.current_workload_score > old_score:
                print("SUCCESS: Workload updated successfully.")
            else:
                print("FAILED: Workload not updated.")
        else:
            print("FAILED: No doctor assigned.")

if __name__ == "__main__":
    asyncio.run(main())
