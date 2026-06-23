import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PipelineStep {
  icon: LucideIcon;
  label: string;
}

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

interface HorizontalPipelineProps {
  steps: PipelineStep[];
  currentStep: number;           // -1 = not started, 0..n = active step index
  isProcessing: boolean;
  agentColor: string;            // e.g., '#a855f7'
}

export default function HorizontalPipeline({ steps, currentStep, isProcessing, agentColor }: HorizontalPipelineProps) {
  const [animatedStep, setAnimatedStep] = useState(-1);

  useEffect(() => {
    if (currentStep >= 0) {
      const timer = setTimeout(() => setAnimatedStep(currentStep), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimatedStep(-1);
    }
  }, [currentStep]);

  const getStepStatus = (index: number): StepStatus => {
    if (index < animatedStep) return 'completed';
    if (index === animatedStep && isProcessing) return 'active';
    if (index === animatedStep && !isProcessing) return 'completed';
    return 'pending';
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '16px 0' }}>
      <style>{`
        @keyframes pipelinePulse {
          0%, 100% { box-shadow: 0 0 8px ${hexToRgba(agentColor, 0.4)}; }
          50% { box-shadow: 0 0 24px ${hexToRgba(agentColor, 0.8)}, 0 0 48px ${hexToRgba(agentColor, 0.3)}; }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes nodeEnter {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '0px',
        minWidth: `${steps.length * 160}px`,
        justifyContent: 'center',
      }}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          const status = getStepStatus(i);
          const isActive = status === 'active';
          const isCompleted = status === 'completed';
          const isPending = status === 'pending';

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
              {/* Node */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '10px',
                minWidth: '80px',
                flex: '0 0 auto',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCompleted
                    ? hexToRgba(agentColor, 0.25)
                    : isActive
                      ? hexToRgba(agentColor, 0.15)
                      : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${
                    isCompleted ? agentColor
                    : isActive ? agentColor
                    : 'rgba(255,255,255,0.1)'
                  }`,
                  animation: isActive 
                    ? 'pipelinePulse 1.5s ease-in-out infinite, nodeEnter 0.3s ease forwards' 
                    : isCompleted 
                      ? 'nodeEnter 0.3s ease forwards' 
                      : 'none',
                  transition: 'all 0.4s ease',
                  position: 'relative',
                }}>
                  {isActive ? (
                    <Loader2 size={20} color={agentColor} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : isCompleted ? (
                    <Check size={20} color={agentColor} />
                  ) : (
                    <Icon size={20} color={isPending ? '#475569' : agentColor} />
                  )}
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive || isCompleted ? 700 : 500,
                  color: isActive ? '#f1f5f9' : isCompleted ? '#cbd5e1' : '#475569',
                  textAlign: 'center',
                  maxWidth: '100px',
                  lineHeight: '1.3',
                  letterSpacing: '0.2px',
                  transition: 'color 0.3s ease',
                }}>
                  {step.label}
                </span>

                {isActive && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: agentColor,
                    letterSpacing: '0.5px',
                    animation: 'nodeEnter 0.3s ease forwards',
                  }}>
                    PROCESSING
                  </span>
                )}
              </div>

              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1,
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  minWidth: '40px',
                }}>
                  {/* Background line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'rgba(255,255,255,0.06)',
                    transform: 'translateY(-50%)',
                  }} />
                  {/* Active/completed overlay */}
                  {(isCompleted || (isActive && !isProcessing)) && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '0',
                      right: '0',
                      height: '2px',
                      background: `linear-gradient(90deg, ${agentColor}, ${hexToRgba(agentColor, 0.5)})`,
                      transform: 'translateY(-50%)',
                      transformOrigin: 'left',
                      animation: 'lineGrow 0.5s ease forwards',
                      boxShadow: `0 0 8px ${hexToRgba(agentColor, 0.4)}`,
                    }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
