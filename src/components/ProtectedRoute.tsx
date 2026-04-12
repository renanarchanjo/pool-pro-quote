import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Status = "loading" | "ok" | "unauth" | "forbidden";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "seller" | "super_admin";
  /** Where to redirect if the user lacks the required role */
  forbiddenRedirect?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole,
  forbiddenRedirect = "/",
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

        // super_admin can access any protected route
        if (data.role === "super_admin") {
          setStatus("ok");
          return;
        }

        if (data.role !== requiredRole) {
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
  if (status === "forbidden") return <Navigate to={forbiddenRedirect} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
