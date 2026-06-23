/**
 * Sidebar Component
 * Navigation sidebar with glassmorphism design.
 * Organized by hospital operational workflow.
 */

import { useAppStore } from '../store/appStore';
import {
  LayoutDashboard,
  Users,
  Bot,
  Bed,
  ChevronLeft,
  ChevronRight,
  Zap,
  Stethoscope,
  HeartPulse,
  SprayCan,
  Shield,
  ShieldCheck,
  Network,
  Calendar,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const navItems: NavItem[] = [
  // ── Operations ──
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, section: 'Operations' },
  { id: 'workflow-center', label: 'Workflow Center', icon: <Network size={20} /> },
  { id: 'batch-workflow-center', label: 'Batch MAS Workflow', icon: <Zap size={20} /> },
  { id: 'patients', label: 'Patients', icon: <Users size={20} /> },

  // ── Medical Staff ──
  { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={20} />, section: 'Medical Staff' },
  { id: 'nurses', label: 'Nurses', icon: <HeartPulse size={20} /> },

  // ── Resources ──
  { id: 'cleaners', label: 'Cleaning Staff', icon: <SprayCan size={20} />, section: 'Resources' },
  { id: 'beds', label: 'Bed Management', icon: <Bed size={20} /> },
  { id: 'scheduler', label: 'Scheduler Dashboard', icon: <Calendar size={20} /> },

  // ── AI Agents ──
  { id: 'agents', label: 'Agents', icon: <Bot size={20} />, section: 'AI Agents' },
  { id: 'sentinel', label: 'Sentinel Agent', icon: <ShieldCheck size={20} /> },
  { id: 'meta-agent', label: 'Meta-Agent', icon: <Network size={20} /> },

  // ── Management ──
  { id: 'knowledge-center', label: 'Knowledge Center', icon: <Network size={20} />, section: 'Management' },

  // ── Simulation ──
  { id: 'simulation', label: 'Simulation Control', icon: <Shield size={20} />, section: 'Simulation' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activePage, setActivePage } = useAppStore();

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: sidebarCollapsed ? '72px' : '260px',
        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 14, 26, 0.98) 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: sidebarCollapsed ? '20px 16px' : '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '72px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
          }}
        >
          <Zap size={20} color="white" />
        </div>
        {!sidebarCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.5px' }}>
              AETHER
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Med System
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <div key={item.id}>
              {/* Section Label */}
              {item.section && !sidebarCollapsed && (
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    padding: '16px 16px 6px 16px',
                    marginTop: item.section === 'Operations' ? '0' : '4px',
                  }}
                >
                  {item.section}
                </div>
              )}
              {item.section && sidebarCollapsed && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 8px', marginTop: item.section === 'Operations' ? '0' : '8px' }}></div>
              )}
              <button
                onClick={() => setActivePage(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: sidebarCollapsed ? '10px 14px' : '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#14b8a6' : '#94a3b8',
                  background: isActive
                    ? 'rgba(20, 184, 166, 0.1)'
                    : 'transparent',
                  borderLeft: isActive ? '3px solid #14b8a6' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            width: '100%',
            fontSize: '13px',
            color: '#64748b',
            background: 'rgba(255, 255, 255, 0.02)',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
