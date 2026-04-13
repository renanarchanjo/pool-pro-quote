import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import * as Sentry from "@sentry/react";

interface AuthState {
  userId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useAuth = (redirectTo?: string): AuthState => {
  const [state, setState] = useState<AuthState>({
    userId: null,
    isAuthenticated: false,
    loading: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }
      setState({
        userId: session?.user.id ?? null,
        isAuthenticated: !!session,
        loading: false,
      });
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        Sentry.setUser(null);
        setState({ userId: null, isAuthenticated: false, loading: false });
        if (redirectTo) navigate(redirectTo, { replace: true });
        return;
      }
      setState({
        userId: session?.user.id ?? null,
        isAuthenticated: !!session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  return state;
};
