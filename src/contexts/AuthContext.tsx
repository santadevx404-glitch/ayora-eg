import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AdminPermission = "orders" | "products" | "users";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  permissions: AdminPermission[];
  hasPermission: (p: AdminPermission) => boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = ["santadevx404@gmail.com", "ayarashad@ayora.com"];

  const ensureAdminInDb = async (userId: string) => {
    await supabase.from("user_roles").insert({ user_id: userId, role: "admin" }).select();
    await supabase.from("admin_permissions").insert([
      { user_id: userId, permission: "orders" },
      { user_id: userId, permission: "products" },
      { user_id: userId, permission: "users" },
    ]).select();
  };

  const loadUserData = async (userId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const email = currentUser?.email ?? "";

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    let admin = !!roleData;

    if (!admin && ADMIN_EMAILS.includes(email)) {
      await ensureAdminInDb(userId);
      admin = true;
    }

    setIsAdmin(admin);

    if (admin) {
      const { data: permsData } = await supabase
        .from("admin_permissions")
        .select("permission")
        .eq("user_id", userId);
      setPermissions((permsData ?? []).map((p: any) => p.permission as AdminPermission));
    } else {
      setPermissions([]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setTimeout(() => loadUserData(currentUser.id), 0);
      } else {
        setIsAdmin(false);
        setPermissions([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) loadUserData(currentUser.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (p: AdminPermission) => permissions.includes(p);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, permissions, hasPermission, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
