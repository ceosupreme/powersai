// DEAD CODE — BarPulse-era login hero panel. No longer imported (Login.tsx now renders a clean centered card). Safe to delete in a later cleanup pass, along with LoginScoreGauge and LoginPulseChart.
import { Activity, BarChart3, CheckCircle, Zap } from 'lucide-react';
import LoginScoreGauge from './LoginScoreGauge';
import LoginPulseChart from './LoginPulseChart';

const LoginBrandPanel = () => {
  return (
    <div className="w-full h-full flex flex-col p-8 xl:p-12 relative">
      {/* Gradient overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.03) 0%, transparent 50%, rgba(139, 92, 246, 0.02) 100%)'
        }}
      />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 mb-12 animate-fade-in">
        <div className="relative group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">Supreme Team Media</span>
      </div>

      {/* Tagline */}
      <div className="relative z-10 mb-12 animate-fade-in stagger-1">
        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
          Your bar's
          <br />
          <span className="bg-gradient-to-r from-primary via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            operating system.
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Daily monitoring, weekly scorecards, and actionable insights.
        </p>
      </div>

      {/* Data visualization area */}
      <div className="relative z-10 flex-1 flex flex-col gap-6 animate-fade-in stagger-2">
        {/* Score gauge and pulse chart */}
        <div className="grid grid-cols-2 gap-4">
          <LoginScoreGauge score={87} grade="B+" />
          <LoginPulseChart />
        </div>

        {/* Pillar bars */}
        <div className="bg-[#1A2332]/80 backdrop-blur-sm rounded-xl p-5 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white">Weekly Performance</span>
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Revenue', value: 92, color: 'from-emerald-500 to-emerald-400' },
              { label: 'Labor', value: 78, color: 'from-amber-500 to-yellow-400' },
              { label: 'Delivery', value: 85, color: 'from-blue-500 to-cyan-400' },
              { label: 'Guest', value: 88, color: 'from-purple-500 to-violet-400' },
              { label: 'Marketing', value: 71, color: 'from-pink-500 to-rose-400' },
            ].map((pillar, index) => (
              <div key={pillar.label} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">{pillar.label}</span>
                  <span className="text-xs font-medium text-white">{pillar.value}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${pillar.color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${pillar.value}%`,
                      animationDelay: `${index * 100}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature bullets */}
      <div className="relative z-10 mt-8 space-y-3 animate-fade-in stagger-3">
        {[
          { icon: Zap, text: 'Catch issues daily — refund spikes, ticket time, labor drift' },
          { icon: BarChart3, text: 'Weekly scorecards your team actually understands' },
          { icon: CheckCircle, text: 'Turn insights into tasks with one click' },
        ].map((feature, index) => (
          <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
            <feature.icon className="w-4 h-4 text-primary shrink-0" />
            <span>{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Social proof */}
      <div className="relative z-10 mt-auto pt-8 animate-fade-in stagger-4">
        <p className="text-xs text-muted-foreground/60">
          Trusted by operators managing 50+ venues across the country.
        </p>
      </div>
    </div>
  );
};

export default LoginBrandPanel;
