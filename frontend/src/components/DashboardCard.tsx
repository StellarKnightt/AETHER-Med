/**
 * DashboardCard Component
 * Glassmorphism metric card with gradient accent.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DashboardCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  gradient: 'teal' | 'purple' | 'pink' | 'amber';
  delay?: number;
}

const gradientMap = {
  teal: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
  purple: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  pink: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  amber: 'linear-gradient(135deg, #f59e0b, #f97316)',
};

const trendColors = {
  up: '#10b981',
  down: '#ef4444',
  neutral: '#64748b',
};

export default function DashboardCard({
  label,
  value,
  change,
  trend = 'neutral',
  icon,
  gradient,
  delay = 0,
}: DashboardCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        animationDelay: `${delay}ms`,
        opacity: 0,
      }}
    >
      {/* Top row: icon + trend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: gradientMap[gradient],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${gradient === 'teal' ? 'rgba(20,184,166,0.25)' : gradient === 'purple' ? 'rgba(139,92,246,0.25)' : gradient === 'pink' ? 'rgba(236,72,153,0.25)' : 'rgba(245,158,11,0.25)'}`,
          }}
        >
          {icon}
        </div>
        {change && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: `${trendColors[trend]}15`,
              fontSize: '12px',
              fontWeight: 500,
              color: trendColors[trend],
            }}
          >
            <TrendIcon size={12} />
            {change}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#f1f5f9',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginTop: '4px',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
