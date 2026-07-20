import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { getRoleHome } from '@/types/roles';
import { Activity, ArrowLeft, Loader2 } from 'lucide-react';
import LoginAuthCard from '@/components/login/LoginAuthCard';

const Login = () => {
  const { user, isLoading } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading && !roleLoading) {
      const home = currentRole ? getRoleHome(currentRole) : '/';
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <Link
        to="/"
        className="flex items-center gap-3 mb-8 group"
        aria-label="Supreme Team Media — back to home"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center transition-transform group-hover:scale-105">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-semibold text-foreground tracking-tight">
          Supreme Team Media
        </span>
      </Link>

      <LoginAuthCard />

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to home
      </Link>
    </div>
  );
};

export default Login;
