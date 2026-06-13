import { useEffect, useState } from 'react';

interface LoginScoreGaugeProps {
  score: number;
  grade: string;
}

const LoginScoreGauge = ({ score, grade }: LoginScoreGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const increment = score / steps;
      let current = 0;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(interval);
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(interval);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [score]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="bg-[#1A2332]/80 backdrop-blur-sm rounded-xl p-5 border border-white/[0.06] flex flex-col items-center justify-center">
      <span className="text-xs text-muted-foreground mb-3">Overall Score</span>
      
      <div className="relative w-28 h-28">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          {/* Animated progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(6, 214, 160, 0.4))'
            }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06D6A0" />
              <stop offset="100%" stopColor="#00E5CC" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white tabular-nums">
            {animatedScore}
          </span>
          <span 
            className={`text-xs font-semibold px-2 py-0.5 rounded-md mt-1 transition-all duration-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.2), rgba(0, 229, 204, 0.2))',
              color: '#06D6A0'
            }}
          >
            {grade}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginScoreGauge;
