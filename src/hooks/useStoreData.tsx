import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  store_id: string | null;
  full_name: string | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  plan_status: string | null;
  plan_expires_at: string | null;
  nome_fantasia: string | null;
}

interface StoreSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export const useStoreData = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resetState = useCallback(() => {
    setProfile(null);
    setStore(null);
    setStoreSettings(null);
    setRole(null);
  }, []);

  const fetchStoreData = useCallback(async (attempt = 0, silent = false) => {
    try {
      if (attempt >= 3) {
        resetState();
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        resetState();
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, store_id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData?.store_id) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        return fetchStoreData(attempt + 1, silent);
      }

      const [{ data: storeData, error: storeError }, { data: settingsData, error: settingsError }, { data: roleData, error: roleError }] = await Promise.all([
        supabase
          .from("stores")
          .select("id, name, slug, city, state, whatsapp, plan_status, plan_expires_at, nome_fantasia")
          .eq("id", profileData.store_id)
          .maybeSingle(),
        supabase
          .from("store_settings")
          .select("logo_url, primary_color, secondary_color")
          .eq("store_id", profileData.store_id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (storeError) throw storeError;
      if (settingsError) throw settingsError;
      if (roleError) throw roleError;

      if (!storeData || !roleData?.role) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        return fetchStoreData(attempt + 1, silent);
      }

      setProfile(profileData);
      setStore(storeData ?? null);
      setStoreSettings(settingsData ?? null);
      setRole(roleData?.role ?? null);
    } catch (error) {
      console.error("Error fetching store data:", error);
    } finally {
      setLoading(false);
    }
  }, [resetState]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setLoading(true);
        void fetchStoreData();
      } else {
        resetState();
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setLoading(true);
        void fetchStoreData();
      } else {
        resetState();
        setLoading(false);
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchStoreData(0, true);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchStoreData, resetState]);

  const refetch = useCallback(() => {
    setLoading(true);
    void fetchStoreData();
  }, [fetchStoreData]);

  /** Re-verify role from DB before critical actions */
  const verifyRole = useCallback(async (requiredRole: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    return data?.role === requiredRole;
  }, []);

  return { profile, store, storeSettings, role, loading, refetch, verifyRole };
};
