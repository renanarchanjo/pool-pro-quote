import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Status = "loading" | "ok" | "unauth" | "forbidden" | "mfa_required";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "seller" | "super_admin";
  /** Where to redirect if the user lacks the required role */
  forbiddenRedirect?: string;
  /** Where to redirect if MFA verification is needed */
  mfaRedirect?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole,
  forbiddenRedirect = "/",
  mfaRedirect = "/loginmatriz",
}: ProtectedRouteProps) => {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setStatus("unauth");
        return;
      }

      // Verificar role antes de checar MFA (precisamos saber se é super_admin)
      let userRole: string | null = null;
      if (requiredRole) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!data) {
          setStatus("forbidden");
          return;
        }

        userRole = data.role;
      }

      // MFA: super_admin DEVE ter aal2 sempre; outros roles só se MFA enrolled
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (cancelled) return;

      if (userRole === "super_admin" && mfaData?.currentLevel !== "aal2") {
        setStatus("mfa_required");
        return;
      }

      if (
        userRole !== "super_admin" &&
        mfaData?.nextLevel === "aal2" &&
        mfaData?.currentLevel === "aal1"
      ) {
        setStatus("mfa_required");
        return;
      }

      if (requiredRole && userRole) {
        // super_admin pode acessar qualquer rota protegida
        if (userRole === "super_admin") {
          setStatus("ok");
          return;
        }

        if (userRole !== requiredRole) {
          setStatus("forbidden");
          return;
        }
      }

      setStatus("ok");
    };

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setStatus("unauth");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [requiredRole]);

  if (status === "loading") {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauth") return <Navigate to="/login" replace />;
  if (status === "mfa_required") return <Navigate to={mfaRedirect} replace />;
  if (status === "forbidden") return <Navigate to={forbiddenRedirect} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
