// DEAD CODE — BarPulse-era login hero widget. Only used by LoginBrandPanel, which is itself unimported. Safe to delete in a later cleanup pass.
import { useEffect, useState } from 'react';

const LoginPulseChart = () => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Generate EKG-style pulse path
  const generatePulsePath = () => {
    const width = 200;
    const height = 60;
    const midY = height / 2;
    
    let path = `M 0 ${midY}`;
    
    // Create repeating pulse pattern
    const pulseWidth = 50;
    const numPulses = Math.ceil(width / pulseWidth) + 1;
    
    for (let i = 0; i < numPulses; i++) {
      const x = i * pulseWidth - (offset % pulseWidth);
      
      // Flat line
      path += ` L ${x + 15} ${midY}`;
      // Small dip
      path += ` L ${x + 18} ${midY + 5}`;
      // Sharp spike up
      path += ` L ${x + 22} ${midY - 25}`;
      // Sharp spike down
      path += ` L ${x + 26} ${midY + 15}`;
      // Return to baseline
      path += ` L ${x + 30} ${midY}`;
      // Flat to next pulse
      path += ` L ${x + pulseWidth} ${midY}`;
    }
    
    return path;
  };

  return (
    <div className="bg-[#1A2332]/80 backdrop-blur-sm rounded-xl p-5 border border-white/[0.06] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">Live Activity</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Active</span>
        </span>
      </div>
      
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <svg 
          viewBox="0 0 200 60" 
          className="w-full h-12"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06D6A0" stopOpacity="0" />
              <stop offset="50%" stopColor="#06D6A0" stopOpacity="1" />
              <stop offset="100%" stopColor="#00E5CC" stopOpacity="0.5" />
            </linearGradient>
            <filter id="pulseGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line 
              key={i}
              x1="0" 
              y1={i * 15} 
              x2="200" 
              y2={i * 15}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          ))}
          
          {/* Pulse line */}
          <path
            d={generatePulsePath()}
            fill="none"
            stroke="url(#pulseGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#pulseGlow)"
          />
        </svg>
      </div>

      {/* Mini stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
        <div className="text-center">
          <span className="text-lg font-semibold text-white">24</span>
          <span className="text-[10px] text-muted-foreground block">Orders/hr</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold text-amber-400">$847</span>
          <span className="text-[10px] text-muted-foreground block">Revenue</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold text-primary">12m</span>
          <span className="text-[10px] text-muted-foreground block">Avg Ticket</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPulseChart;
