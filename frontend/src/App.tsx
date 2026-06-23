/**
 * AETHER-Med Main Application
 * Root component with sidebar layout and page routing.
 */

import { useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import Agents from './pages/Agents';
import Patients from './pages/Patients';
import SentinelSOC from './pages/SentinelSOC';
import SentinelAgent from './pages/SentinelAgent';
import MetaAgent from './pages/MetaAgent';
import Telemetry from './pages/Telemetry';
import Beds from './pages/Beds';
import Doctors from './pages/Doctors';
import Nurses from './pages/Nurses';
import CleaningStaff from './pages/CleaningStaff';
import SchedulerDashboard from './pages/SchedulerDashboard';
import KnowledgeCenter from './pages/KnowledgeCenter';
import WorkflowCenter from './pages/WorkflowCenter';
import BatchWorkflowCenter from './pages/BatchWorkflowCenter';
import { useAppStore } from './store/appStore';
import { useSimulationStore } from './store/simulationStore';
import { socketManager } from './services/websocket/socketManager';
import { simulationApi } from './services/api/simulationApi';

function App() {
  const { activePage, sidebarCollapsed } = useAppStore();

  useEffect(() => {
    socketManager.connect();
    return () => socketManager.disconnect();
  }, []);

  // Global REST polling — ensures the store has metrics even if WS is delayed
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await simulationApi.getMetrics();
        const store = useSimulationStore.getState();
        store.setMetrics(data);
        if (typeof data.is_running === 'boolean') {
          store.setIsRunning(data.is_running);
        }
      } catch { /* backend may be down */ }
    };
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'workflow-center': return <WorkflowCenter />;
      case 'batch-workflow-center': return <BatchWorkflowCenter />;
      case 'patients': return <Patients />;
      case 'doctors': return <Doctors />;
      case 'nurses': return <Nurses />;
      case 'cleaners': return <CleaningStaff />;
      case 'beds': return <Beds />;
      case 'agents': return <Agents />;
      case 'sentinel': return <SentinelAgent />;
      case 'meta-agent': return <MetaAgent />;
      case 'simulation': return <SentinelSOC />;
      case 'telemetry': return <Telemetry />;
      case 'scheduler': return <SchedulerDashboard />;
      case 'knowledge-center': return <KnowledgeCenter />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
