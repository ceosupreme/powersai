import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { roleToHomeRoute } from '@/types/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'checking' | 'set-password' | 'invalid';

const ResetPassword = () => {
  const [mode, setMode] = useState<Mode>('checking');
  const [flowType, setFlowType] = useState<'invite' | 'recovery'>('recovery');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRole } = useRole();

  const next = searchParams.get('next') || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Detect flow type from URL hash before Supabase strips it
      const hash = window.location.hash || '';
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const type = hashParams.get('type');
      const hashError = hashParams.get('error') || hashParams.get('error_code');
      const errDesc = hashParams.get('error_description');

      if (hashError) {
        if (!cancelled) {
          setError(
            errDesc?.replace(/\+/g, ' ') ||
              'This link has expired or was already used.'
          );
          setMode('invalid');
        }
        return;
      }

      if (type === 'invite') setFlowType('invite');
      else if (type === 'recovery') setFlowType('recovery');

      // Give Supabase a tick to parse the hash into a session
      await new Promise((r) => setTimeout(r, 150));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setMode('set-password');
      } else {
        setMode('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    toast.success('Password set. Welcome in.');
    // Prefer role-aware home; honor ?next= only as a hint, ProtectedRoute re-gates
    const home = currentRole ? roleToHomeRoute[currentRole] : next || '/';
    navigate(next || home, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="flex items-center gap-3 mb-8 group" aria-label="Supreme Team Media">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center transition-transform group-hover:scale-105">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-semibold text-foreground tracking-tight">
          Supreme Team Media
        </span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-[#1A2332]/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 shadow-2xl shadow-black/40">
          {mode === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your link…</p>
            </div>
          )}

          {mode === 'invalid' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Link expired</h2>
              <p className="text-sm text-muted-foreground">
                {error ||
                  'This invite or reset link has expired or was already used. Ask for a new invite, or reset your password below.'}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild className="w-full h-11 rounded-xl">
                  <Link to="/auth?forgot=1">Reset password</Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-11 rounded-xl bg-transparent border-white/[0.08] text-white hover:bg-white/5">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
              </div>
            </div>
          )}

          {mode === 'set-password' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {flowType === 'invite' ? 'Welcome — set your password' : 'Reset your password'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {user?.email ? (
                    <>
                      Signed in as <span className="text-white">{user.email}</span>. Choose a password to finish.
                    </>
                  ) : (
                    'Choose a new password.'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pw" className="text-sm text-muted-foreground">New password</Label>
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-[#0B1120] border-white/[0.08] text-white rounded-xl"
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pw2" className="text-sm text-muted-foreground">Confirm password</Label>
                <Input
                  id="pw2"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 bg-[#0B1120] border-white/[0.08] text-white rounded-xl"
                  disabled={submitting}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full h-12 rounded-xl" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : flowType === 'invite' ? (
                  'Set password & continue'
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          )}
        </div>

        <Link
          to="/auth"
          className="mt-6 mx-auto flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;