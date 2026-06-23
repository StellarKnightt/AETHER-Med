import { useState, useEffect } from 'react';
import { BookOpen, Database, Activity, Target, Zap, Server } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';

interface RagMetrics {
  total_queries: number;
  average_latency_ms: number;
  total_documents_retrieved: number;
  success_rate_percent: number;
  failed_queries: number;
}

export default function KnowledgeCenter() {
  const [metrics, setMetrics] = useState<RagMetrics | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/rag/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch RAG metrics:", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(145deg, #0b1120, #0f172a)',
        padding: '32px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(147,197,253,0.2))',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(59,130,246,0.2)',
            }}>
              <BookOpen size={32} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
                Knowledge Center
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '6px 0 0', fontWeight: 500 }}>
                Retrieval-Augmented Generation (RAG) Monitoring
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <DashboardCard
          label="Total RAG Queries"
          value={metrics?.total_queries || 0}
          icon={<Database size={20} color="#fff" />}
          change="+ Active"
          trend="up"
          gradient="teal"
        />
        <DashboardCard
          label="Success Rate"
          value={`${metrics?.success_rate_percent?.toFixed(1) || 100}%`}
          icon={<Target size={20} color="#fff" />}
          change={metrics?.failed_queries ? `${metrics.failed_queries} failed` : "All success"}
          trend={metrics?.failed_queries === 0 ? "up" : "down"}
          gradient="purple"
        />
        <DashboardCard
          label="Avg Latency"
          value={`${metrics?.average_latency_ms?.toFixed(0) || 0} ms`}
          icon={<Zap size={20} color="#fff" />}
          change="Responsive"
          trend="neutral"
          gradient="amber"
        />
        <DashboardCard
          label="Documents Retrieved"
          value={metrics?.total_documents_retrieved || 0}
          icon={<Server size={20} color="#fff" />}
          change="Across 6 agents"
          trend="neutral"
          gradient="pink"
        />
      </div>

      {/* RAG TOPOLOGY */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        padding: '28px',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Activity size={18} color="#f59e0b" />
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px' }}>
            Domain-Specific Collections
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {['Triage', 'Pharma', 'Scheduler', 'Bed', 'Sentinel', 'Meta'].map((agent) => (
            <div key={agent} style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>{agent} Knowledge Base</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>ChromaDB • all-MiniLM-L6-v2</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
