import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { roleToHomeRoute } from '@/types/roles';
import { Loader2 } from 'lucide-react';
import LoginBrandPanel from '@/components/login/LoginBrandPanel';
import LoginAuthCard from '@/components/login/LoginAuthCard';

const Login = () => {
  const { user, isLoading } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading && !roleLoading) {
      const home = currentRole ? roleToHomeRoute[currentRole] : '/';
      navigate(home, { replace: true });
    }
  }, [user, isLoading, roleLoading, currentRole, navigate]);

  if (isLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] relative overflow-hidden">
      {/* Background mesh gradient */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(6, 214, 160, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 70% 80%, rgba(236, 72, 153, 0.04) 0%, transparent 50%),
            linear-gradient(180deg, #0B1120 0%, #0F172A 100%)
          `
        }}
      />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Brand Panel - Hidden on mobile, shown on lg+ */}
        <div className="hidden lg:flex lg:w-[55%] xl:w-[60%]">
          <LoginBrandPanel />
        </div>

        {/* Auth Panel */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {/* Mobile brand header */}
          <div className="lg:hidden px-6 pt-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 blur-lg opacity-40" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">BarPulse</span>
            </div>
            <p className="text-muted-foreground text-sm">Your bar's operating system.</p>
          </div>

          {/* Auth card container */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
            <LoginAuthCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
