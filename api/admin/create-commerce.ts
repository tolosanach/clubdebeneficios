import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type CreateCommerceBody = {
  id?: string;
  name: string;
  logo_url?: string | null;

  // dueño
  owner_email: string;
  owner_phone: string; // lo hago obligatorio porque tu UI lo pide sí o sí
  owner_password?: string;

  enable_points?: boolean;
  points_mode?: string;
  points_value?: number;

  enable_coupon?: boolean;
  discount_percent?: number;
  discount_expiration_days?: number;

  enable_stars?: boolean;
  stars_goal?: number;
};

function slugifyId(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${base || "commerce"}-${suffix}`;
}

function generateTempPassword() {
  // 10 chars alfanumérico
  return Math.random().toString(36).slice(-10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // ✅ Env vars robustas (frontend y backend)
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SERVICE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || // ✅ tu caso real en Vercel
      process.env.SUPABASE_SERVICE_ROLE ||     // por si existe
      process.env.SUPABASE_SERVICE_KEY;        // por si existe

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing server env vars",
        details:
          "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body =
      typeof req.body === "string"
        ? (JSON.parse(req.body) as CreateCommerceBody)
        : (req.body as CreateCommerceBody);

    // ======================
    // Validaciones mínimas
    // ======================
    if (!body?.name || body.name.trim().length < 2) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }

    if (!body?.owner_email || body.owner_email.trim().length < 5) {
      return res.status(400).json({ ok: false, error: "owner_email is required" });
    }

    if (!body?.owner_phone || body.owner_phone.trim().length < 6) {
      return res.status(400).json({ ok: false, error: "owner_phone is required" });
    }

    const commerceId = body.id?.trim() || slugifyId(body.name);
    const tempPassword = (body.owner_password && body.owner_password.trim()) || generateTempPassword();

    // ======================
    // 1) Crear comercio
    // ======================
    const commercePayload = {
      id: commerceId,
      name: body.name.trim(),
      logo_url: body.logo_url ?? null,

      enable_points: body.enable_points ?? false,
      points_mode: body.points_mode ?? "FIXED",
      points_value: body.points_value ?? 0,

      enable_coupon: body.enable_coupon ?? false,
      discount_percent: body.discount_percent ?? 0,
      discount_expiration_days: body.discount_expiration_days ?? 30,

      enable_stars: body.enable_stars ?? false,
      stars_goal: body.stars_goal ?? 10,
    };

    const { data: commerceData, error: commerceError } = await supabase
      .from("commerces")
      .insert(commercePayload)
      .select("*")
      .single();

    if (commerceError) {
      return res.status(400).json({
        ok: false,
        error: "Error creating commerce",
        details: commerceError.message,
      });
    }

    // ======================
    // 2) Crear usuario dueño
    // ======================
    const userPayload = {
      email: body.owner_email.trim().toLowerCase(),
      password: tempPassword,
      name: `${body.name.trim()} Owner`,
      phone: body.owner_phone.trim(), // ✅ teléfono guardado
      role: "COMMERCE_OWNER",
      commerce_id: commerceId,
      is_active: true,
    };

    const { error: userError } = await supabase.from("users").insert(userPayload);

    if (userError) {
      // ✅ rollback: borrar el commerce recién creado para no dejar basura
      await supabase.from("commerces").delete().eq("id", commerceId);

      return res.status(400).json({
        ok: false,
        error: "Commerce created but user failed (rolled back)",
        details: userError.message,
      });
    }

    // ======================
    // 3) Respuesta final
    // ======================
    return res.status(200).json({
      ok: true,
      commerce: commerceData,
      tempPassword,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: "Unhandled error",
      details: err?.message || String(err),
    });
  }
}
