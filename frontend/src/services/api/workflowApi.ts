const API_URL = '/api/v1';

export const workflowApi = {
  startWorkflow: async (patientId: string) => {
    const res = await fetch(`${API_URL}/workflow/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId }),
    });
    if (!res.ok) throw new Error('Failed to start workflow');
    return res.json();
  },

  batchWorkflow: async (patientIds: string[] | null, autoApprove: boolean = false) => {
    const res = await fetch(`${API_URL}/workflow/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_ids: patientIds, auto_approve: autoApprove }),
    });
    if (!res.ok) throw new Error('Failed to start batch workflow');
    return res.json();
  },

  getBatchStatus: async (patientIds: string[]) => {
    const res = await fetch(`${API_URL}/workflow/batch/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_ids: patientIds }),
    });
    if (!res.ok) throw new Error('Failed to fetch batch status');
    return res.json();
  },

  resumeWorkflow: async (executionId: string, action: 'approve' | 'reject') => {
    const res = await fetch(`${API_URL}/workflow/${executionId}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, action }),
    });
    if (!res.ok) throw new Error('Failed to resume workflow');
    return res.json();
  },

  getPatientWorkflow: async (patientId: string) => {
    const res = await fetch(`${API_URL}/workflow/patient/${patientId}`);
    if (!res.ok) throw new Error('Failed to fetch patient workflow');
    return res.json();
  },

  getAllWorkflows: async () => {
    const res = await fetch(`${API_URL}/workflow/all`);
    if (!res.ok) throw new Error('Failed to fetch all workflows');
    return res.json();
  }
};
