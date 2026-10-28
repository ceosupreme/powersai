import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const LoginAuthCard = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('forgot') === '1') setForgotOpen(true);
  }, [searchParams]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = forgotEmail.trim();
    if (!z.string().email().safeParse(emailTrimmed).success) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setForgotSubmitting(true);
    await supabase.auth.resetPasswordForEmail(emailTrimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSubmitting(false);
    setForgotOpen(false);
    setForgotEmail('');
    toast({
      title: 'Check your email',
      description: 'If that email is registered, we sent a reset link.',
    });
  };

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, confirmPassword, fullName });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login failed',
              description: 'Invalid email or password. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Login failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in.',
          });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to Supreme Team Media. You are now signed in.',
          });
          navigate(from, { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#1A2332]/90 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isLogin ? 'Sign in to your dashboard' : 'Get started with Supreme Team Media'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-muted-foreground">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`h-12 bg-[#0B1120] border-white/[0.08] text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-primary focus:ring-primary/20 ${errors.fullName ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-12 bg-[#0B1120] border-white/[0.08] text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-primary focus:ring-primary/20 pl-11 ${errors.email ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-12 bg-[#0B1120] border-white/[0.08] text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-primary focus:ring-primary/20 pr-12 ${errors.password ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`h-12 bg-[#0B1120] border-white/[0.08] text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-primary focus:ring-primary/20 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {isLogin && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotOpen(true);
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base relative overflow-hidden group"
            disabled={isSubmitting}
          >
            {/* Glow effect on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </form>

        {/*
          Public sign-up link intentionally hidden. Accounts are created by
          an admin (invite-user / create-user) or by invite-client-approver;
          self-signup is switched off in Supabase Auth and the signup trigger
          no longer hands out a role. The signUp code path stays for admin use.
        */}
        {!isLogin && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Already have an account?{' '}
              <span className="text-primary font-medium">Sign in</span>
            </button>
          </div>
        )}

      </div>

      {/* Footer links */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground/50">
        <button className="hover:text-muted-foreground transition-colors">Privacy</button>
        <span>•</span>
        <button className="hover:text-muted-foreground transition-colors">Terms</button>
        <span>•</span>
        <button className="hover:text-muted-foreground transition-colors">Support</button>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email and we'll send you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email</Label>
              <Input
                id="forgotEmail"
                type="email"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={forgotSubmitting}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotSubmitting}>
                {forgotSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginAuthCard;
