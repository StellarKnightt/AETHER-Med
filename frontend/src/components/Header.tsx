/**
 * Header Component
 * Top bar with global search, connection status, recent activity, and settings.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppStore } from '../store/appStore';
import { patientApi } from '../services/api/patientApi';
import { staffApi } from '../services/api/staffApi';
import { cleanerApi } from '../services/api/cleanerApi';
import { bedApi } from '../services/api/bedApi';
import { agentApi } from '../services/api/agentApi';
import { sentinelAgentApi } from '../services/api/sentinelAgentApi';
import { metaAgentApi } from '../services/api/metaAgentApi';
import {
  Search, Wifi, WifiOff, Clock, Settings, X,
  Users, Stethoscope, HeartPulse, SprayCan, BedDouble,
  Bot, Shield, Activity, ChevronRight,
  Monitor, Moon, Sun, Database, Radio, Info,
  Zap, RefreshCcw, Sparkles
} from 'lucide-react';

// ─── Search Result Types ────
interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ReactNode;
  page: string;
}

export default function Header() {
  const { isConnected } = useWebSocket();
  const { setActivePage } = useAppStore();
  
  // ─── Search State ────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ─── Panel State ────
  const [activityOpen, setActivityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // ─── Keyboard shortcut ⌘K / Ctrl+K ────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSettingsOpen(false);
        setActivityOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Click outside ────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Global Search ────
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    try {
      const [patients, doctors, nurses, cleaners, beds] = await Promise.allSettled([
        patientApi.getPatients(),
        staffApi.getDoctors(),
        staffApi.getNurses(),
        cleanerApi.getCleaners(),
        bedApi.getAllBeds(),
      ]);

      // Patients
      if (patients.status === 'fulfilled') {
        (patients.value as any[]).filter(p => 
          p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)
        ).slice(0, 5).forEach(p => results.push({
          id: p.id, title: p.name, subtitle: `Patient • ${p.gender} • ${p.age}y`,
          category: 'Patients', icon: <Users size={16} color="#3b82f6" />, page: 'patients'
        }));
      }

      // Doctors
      if (doctors.status === 'fulfilled') {
        (doctors.value as any[]).filter(d =>
          d.name?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q)
        ).slice(0, 5).forEach(d => results.push({
          id: d.id, title: d.name, subtitle: `Doctor • ${d.specialization}`,
          category: 'Doctors', icon: <Stethoscope size={16} color="#8b5cf6" />, page: 'doctors'
        }));
      }

      // Nurses
      if (nurses.status === 'fulfilled') {
        (nurses.value as any[]).filter(n =>
          n.name?.toLowerCase().includes(q)
        ).slice(0, 5).forEach(n => results.push({
          id: n.id, title: n.name, subtitle: `Nurse • ${n.department || 'General'}`,
          category: 'Nurses', icon: <HeartPulse size={16} color="#ec4899" />, page: 'nurses'
        }));
      }

      // Cleaners
      if (cleaners.status === 'fulfilled') {
        (cleaners.value as any[]).filter(c =>
          c.name?.toLowerCase().includes(q)
        ).slice(0, 5).forEach(c => results.push({
          id: c.id, title: c.name, subtitle: `Cleaner • ${c.availability_status}`,
          category: 'Cleaning Staff', icon: <SprayCan size={16} color="#f59e0b" />, page: 'cleaners'
        }));
      }

      // Beds
      if (beds.status === 'fulfilled') {
        (beds.value as any[]).filter(b =>
          b.bed_number?.toLowerCase().includes(q) || b.id?.toLowerCase().includes(q)
        ).slice(0, 5).forEach(b => results.push({
          id: b.id, title: b.bed_number, subtitle: `Bed • ${b.ward} • ${b.status}`,
          category: 'Beds', icon: <BedDouble size={16} color="#10b981" />, page: 'beds'
        }));
      }

      // Agents (static search)
      const agents = [
        { name: 'Triage Agent', page: 'agents' },
        { name: 'Pharma Agent', page: 'agents' },
        { name: 'Scheduler Agent', page: 'agents' },
        { name: 'Bed Agent', page: 'agents' },
        { name: 'Sentinel Agent', page: 'sentinel' },
        { name: 'Meta-Agent', page: 'meta-agent' },
      ];
      agents.filter(a => a.name.toLowerCase().includes(q)).forEach(a => results.push({
        id: a.name, title: a.name, subtitle: 'AI Agent',
        category: 'Agents', icon: <Bot size={16} color="#14b8a6" />, page: a.page
      }));

    } catch { /* silently fail search */ }

    setSearchResults(results);
    setSelectedIdx(0);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { if (searchQuery) performSearch(searchQuery); else setSearchResults([]); }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, searchResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && searchResults[selectedIdx]) {
      setActivePage(searchResults[selectedIdx].page);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  // ─── Fetch Activity ────
  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    const items: any[] = [];
    try {
      const [agentHist, sentinelIncs, metaIncs] = await Promise.allSettled([
        agentApi.getAllHistory(),
        sentinelAgentApi.getIncidents(),
        metaAgentApi.getIncidents(),
      ]);
      if (agentHist.status === 'fulfilled') {
        (agentHist.value as any[]).slice(0, 20).forEach(h => items.push({
          text: `${h.agent_id} processed ${h.patients_analyzed} patients, ${h.actions_executed} actions`,
          time: h.created_at, type: 'agent', icon: <Zap size={14} />, color: '#f59e0b'
        }));
      }
      if (sentinelIncs.status === 'fulfilled') {
        (sentinelIncs.value as any[]).slice(0, 15).forEach(i => items.push({
          text: `Security: ${i.threat_type} — ${i.recommendation?.substring(0, 80)}`,
          time: i.created_at, type: 'security', icon: <Shield size={14} />, color: '#ef4444'
        }));
      }
      if (metaIncs.status === 'fulfilled') {
        (metaIncs.value as any[]).slice(0, 15).forEach(i => items.push({
          text: `Meta-Agent: ${i.failure_type} on ${i.affected_agent}`,
          time: i.created_at, type: 'meta', icon: <RefreshCcw size={14} />, color: '#06b6d4'
        }));
      }
    } catch { /* fail silently */ }
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setActivityData(items.slice(0, 50));
    setLoadingActivity(false);
  }, []);

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
      <header
        style={{
          height: '64px',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(10, 14, 26, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* ═══ Global Search ═══ */}
        <div ref={searchRef} style={{ position: 'relative', width: '380px' }}>
          <div
            onClick={() => { setSearchOpen(true); inputRef.current?.focus(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: searchOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${searchOpen ? 'rgba(20, 184, 166, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
              transition: 'all 0.2s',
            }}
          >
            <Search size={16} color={searchOpen ? '#14b8a6' : '#64748b'} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search patients, doctors, beds, agents..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f1f5f9',
                fontSize: '13px',
                width: '100%',
              }}
            />
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#64748b',
                fontSize: '11px',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}
            >
              ⌘K
            </kbd>
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '8px',
              maxHeight: '420px',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(20px)',
              zIndex: 100,
            }}>
              {(() => {
                let lastCat = '';
                return searchResults.map((r, i) => {
                  const showCat = r.category !== lastCat;
                  lastCat = r.category;
                  return (
                    <div key={r.id + i}>
                      {showCat && (
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', padding: '8px 12px 4px' }}>
                          {r.category}
                        </div>
                      )}
                      <div
                        onClick={() => { setActivePage(r.page); setSearchOpen(false); setSearchQuery(''); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: i === selectedIdx ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; setSelectedIdx(i); }}
                        onMouseLeave={(e) => { if (i !== selectedIdx) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {r.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.subtitle}</div>
                        </div>
                        <ChevronRight size={14} color="#334155" />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* No results */}
          {searchOpen && searchQuery.length > 0 && searchResults.length === 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px', padding: '24px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', zIndex: 100,
            }}>
              <Search size={24} color="#475569" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', color: '#64748b' }}>No results for "{searchQuery}"</div>
            </div>
          )}
        </div>

        {/* ═══ Right Side ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            }}
          >
            {isConnected ? <Wifi size={14} color="#10b981" /> : <WifiOff size={14} color="#ef4444" />}
            <span style={{ fontSize: '12px', fontWeight: 500, color: isConnected ? '#10b981' : '#ef4444' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Recent Activity Button */}
          <button
            onClick={() => { setActivityOpen(true); fetchActivity(); setSettingsOpen(false); }}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <Activity size={16} />
            Recent Activity
          </button>

          {/* Settings Button */}
          <button
            onClick={() => { setSettingsOpen(!settingsOpen); setActivityOpen(false); }}
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: settingsOpen ? 'rgba(20, 184, 166, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${settingsOpen ? 'rgba(20, 184, 166, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
              cursor: 'pointer',
              color: settingsOpen ? '#14b8a6' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => { if (!settingsOpen) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#e2e8f0'; } }}
            onMouseLeave={(e) => { if (!settingsOpen) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = '#94a3b8'; } }}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ═══════════════ RECENT ACTIVITY SIDE PANEL ═══════════════ */}
      {activityOpen && (
        <>
          <div onClick={() => setActivityOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, backdropFilter: 'blur(4px)' }}></div>
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', zIndex: 70,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.99))',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.25s ease-out',
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={20} color="#14b8a6" /> Recent Activity
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Latest 50 system events</p>
              </div>
              <button onClick={() => setActivityOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex', outline: 'none' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {loadingActivity ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                  <Activity size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: '12px', marginTop: '12px' }}>Loading activity...</p>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : activityData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569', fontSize: '13px' }}>No recent activity</div>
              ) : (
                activityData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, wordBreak: 'break-word' }}>{item.text}</div>
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>{timeAgo(item.time)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ SETTINGS DROPDOWN ═══════════════ */}
      {settingsOpen && (
        <>
          <div onClick={() => setSettingsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }}></div>
          <div style={{
            position: 'fixed', top: '72px', right: '32px', width: '340px', zIndex: 60,
            background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)', animation: 'fadeInDown 0.2s ease-out',
            padding: '8px',
          }}>
            <style>{`@keyframes fadeInDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {/* Appearance */}
            <SettingsSection title="Appearance" icon={<Monitor size={14} />}>
              <SettingsRow icon={<Moon size={14} />} label="Dark Mode" value="Active" active />
              <SettingsRow icon={<Sun size={14} />} label="Light Mode" value="Coming Soon" />
              <SettingsRow icon={<Monitor size={14} />} label="System Theme" value="Coming Soon" />
            </SettingsSection>

            {/* Dashboard */}
            <SettingsSection title="Dashboard" icon={<Sparkles size={14} />}>
              <SettingsRow icon={<RefreshCcw size={14} />} label="Refresh Interval" value="8s" />
              <SettingsRow icon={<Clock size={14} />} label="Landing Page" value="Dashboard" />
            </SettingsSection>

            {/* System */}
            <SettingsSection title="System" icon={<Database size={14} />}>
              <SettingsRow icon={<Database size={14} />} label="Database" value={isConnected ? 'Connected' : 'Disconnected'} active={isConnected} />
              <SettingsRow icon={<Radio size={14} />} label="WebSocket" value={isConnected ? 'Connected' : 'Disconnected'} active={isConnected} />
              <SettingsRow icon={<Wifi size={14} />} label="Backend" value={isConnected ? 'Online' : 'Offline'} active={isConnected} />
            </SettingsSection>

            {/* About */}
            <SettingsSection title="About" icon={<Info size={14} />}>
              <SettingsRow icon={<Zap size={14} />} label="Version" value="1.0.0" />
              <SettingsRow icon={<Info size={14} />} label="Project" value="AETHER-Med" />
            </SettingsSection>
          </div>
        </>
      )}
    </>
  );
}

// ─── Settings Sub-Components ────

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px 6px', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function SettingsRow({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: string; active?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', borderRadius: '8px', transition: 'background 0.15s', cursor: 'default',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#64748b', display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: active ? '#10b981' : '#64748b' }}>{value}</span>
    </div>
  );
}
