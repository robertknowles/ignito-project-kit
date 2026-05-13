import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isPropPathAdmin } from '@/config/proppathAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, ShieldAlert, Loader2 } from 'lucide-react';

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!isPropPathAdmin(email)) {
      setError('Access denied. This portal is restricted to PropPath admins.');
      setSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="crm-portal dark min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-card border border-border mb-4">
            <ShieldAlert size={24} className="text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">PropPath Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal CRM portal</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@proppath.com.au"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <LogIn size={16} className="mr-2" />
            )}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="crm-portal dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AdminLoginForm />;
  }

  if (!isPropPathAdmin(user.email)) {
    return (
      <div className="crm-portal dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert size={32} className="mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This portal is restricted to PropPath admins.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
