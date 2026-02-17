import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { User, UserRole } from "../types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (phone: string, code: string, businessName?: string) => Promise<boolean>;
  changePassword: (newPass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== Helpers OTP (simulado) sin db.ts =====
const OTP_STORAGE_KEY = "club_otps";

function setOtp(phone: string, code: string) {
  const raw = localStorage.getItem(OTP_STORAGE_KEY);
  const data = raw ? JSON.parse(raw) : {};
  data[phone] = { code, createdAt: Date.now() };
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(data));
}

function verifyStoredOtp(phone: string, code: string) {
  const raw = localStorage.getItem(OTP_STORAGE_KEY);
  if (!raw) return false;

  const data = JSON.parse(raw);
  const entry = data?.[phone];
  if (!entry) return false;

  // expira a los 10 min
  const ageMs = Date.now() - (entry.createdAt || 0);
  const isExpired = ageMs > 10 * 60 * 1000;

  if (isExpired) return false;
  return String(entry.code) === String(code);
}

// ===== Mapper DB -> App User =====
function mapDbUserToAppUser(row: any): User {
  // Tu tabla users tiene: id, email, password, name, role, commerce_id, is_active, created_at (+ phone si la agregaste)
  return {
    id: row.id,
    email: row.email ?? undefined,
    name: row.name ?? undefined,
    role: row.role,
    commerceId: row.commerce_id ?? undefined,
    isActive: row.is_active ?? true,
    phone: row.phone ?? undefined,
  } as any;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase client (frontend)
  const supabase = useMemo(() => {
    const url = (import.meta as any).env.VITE_SUPABASE_URL;
    const anon = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      // No tiramos error acá para no romper el build, pero sí te va a fallar login si faltan.
      console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    }

    return createClient(url, anon);
  }, []);

  const setUserAndPersist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem("club_session", JSON.stringify(u));
  };

  useEffect(() => {
    // cargar sesión
    const saved = localStorage.getItem("club_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as User;
        setUser(parsed);
      } catch {
        localStorage.removeItem("club_session");
      }
    }
    setIsLoading(false);
  }, []);

  // ===== LOGIN EMAIL/PASS (Supabase users) =====
  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const cleanEmail = (email || "").trim().toLowerCase();
      const cleanPass = (pass || "").trim();

      if (!cleanEmail || !cleanPass) return false;

      const { data, error } = await supabase
        .from("users")
        .select("id,email,password,name,role,commerce_id,is_active,phone")
        .eq("email", cleanEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("login select error:", error.message);
        return false;
      }

      if (!data) return false;

      // Comparación simple (hoy estás guardando password plano en users)
      if ((data as any).password !== cleanPass) return false;

      const appUser = mapDbUserToAppUser(data);
      setUserAndPersist(appUser);
      return true;
    } catch (e: any) {
      console.error("login error:", e?.message || e);
      return false;
    }
  };

  // ===== OTP WhatsApp (simulado) =====
  const sendOTP = async (phone: string): Promise<boolean> => {
    const cleanPhone = (phone || "").trim();
    if (!cleanPhone) return false;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[WHATSAPP SIMULATION] Enviando código ${code} a ${cleanPhone}`);

    setOtp(cleanPhone, code);
    return true;
  };

  // ===== Verificar OTP y login/registro contra Supabase =====
  const verifyOTP = async (phone: string, code: string, businessName?: string): Promise<boolean> => {
    try {
      const cleanPhone = (phone || "").trim();
      const cleanCode = (code || "").trim();

      if (!cleanPhone || cleanCode.length < 6) return false;

      const ok = verifyStoredOtp(cleanPhone, cleanCode);
      if (!ok) return false;

      // 1) buscar usuario por phone
      const { data: existing, error: findErr } = await supabase
        .from("users")
        .select("id,email,password,name,role,commerce_id,is_active,phone")
        .eq("phone", cleanPhone)
        .eq("is_active", true)
        .maybeSingle();

      if (findErr) {
        console.error("verifyOTP find error:", findErr.message);
        return false;
      }

      // 2) si existe: loguear
      if (existing) {
        setUserAndPersist(mapDbUserToAppUser(existing));
        return true;
      }

      // 3) si NO existe: crear un usuario básico
      // Nota: tu tabla users permite email NULL y commerce_id NULL.
      const payload = {
        email: null,
        password: null,
        name: businessName?.trim() ? businessName.trim() : `Usuario ${cleanPhone.slice(-4)}`,
        role: UserRole.CUSTOMER, // o el rol que uses para consumidores
        commerce_id: null,
        is_active: true,
        phone: cleanPhone,
      };

      const { data: created, error: createErr } = await supabase
        .from("users")
        .insert(payload as any)
        .select("id,email,password,name,role,commerce_id,is_active,phone")
        .single();

      if (createErr) {
        console.error("verifyOTP create error:", createErr.message);
        return false;
      }

      setUserAndPersist(mapDbUserToAppUser(created));
      return true;
    } catch (e: any) {
      console.error("verifyOTP error:", e?.message || e);
      return false;
    }
  };

  const changePassword = async (newPass: string): Promise<boolean> => {
    try {
      if (!user?.id) return false;
      const clean = (newPass || "").trim();
      if (clean.length < 4) return false;

      const { error } = await supabase
        .from("users")
        .update({ password: clean } as any)
        .eq("id", user.id);

      if (error) {
        console.error("changePassword error:", error.message);
        return false;
      }

      setUserAndPersist({ ...(user as any), password: clean } as any);
      return true;
    } catch (e: any) {
      console.error("changePassword error:", e?.message || e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("club_session");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        sendOTP,
        verifyOTP,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
