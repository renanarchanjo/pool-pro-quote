import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Wait for auth state to be ready before fetching
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchStoreData();
      } else {
        setProfile(null);
        setStore(null);
        setStoreSettings(null);
        setRole(null);
        setLoading(false);
      }
    });

    // Also check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchStoreData();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStoreData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      if (!profileData?.store_id) {
        setLoading(false);
        return;
      }

      // Fetch store
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", profileData.store_id)
        .single();

      setStore(storeData);

      // Fetch store settings
      const { data: settingsData } = await supabase
        .from("store_settings")
        .select("*")
        .eq("store_id", profileData.store_id)
        .single();

      setStoreSettings(settingsData);

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setRole(roleData?.role || null);
    } catch (error) {
      console.error("Error fetching store data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchStoreData();
  };

  return { profile, store, storeSettings, role, loading, refetch };
};
