import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type CreateCommerceBody = {
  id?: string;
  name: string;
  logo_url?: string | null;

  // dueño
  owner_email: string;
  owner_phone?: string;
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
  return Math.random().toString(36).slice(-8);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        error: "Missing server env vars",
        details: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body as CreateCommerceBody;

    // Validaciones mínimas
    if (!body?.name || body.name.trim().length < 2) {
      return res.status(400).json({ error: "name is required" });
    }

    if (!body?.owner_email) {
      return res.status(400).json({ error: "owner_email is required" });
    }

    const commerceId = body.id?.trim() || slugifyId(body.name);
    const tempPassword = body.owner_password || generateTempPassword();

    // ======================
    // 1. Crear comercio
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
        error: "Error creating commerce",
        details: commerceError.message,
      });
    }

    // ======================
    // 2. Crear usuario dueño
    // ======================

    const userPayload = {
      email: body.owner_email.trim(),
      password: tempPassword,
      name: body.name.trim() + " Owner",
      phone: body.owner_phone ?? null,
      role: "COMMERCE_OWNER",
      commerce_id: commerceId,
      is_active: true,
    };

    const { error: userError } = await supabase
      .from("users")
      .insert(userPayload);

    if (userError) {
      return res.status(400).json({
        error: "Commerce created but user failed",
        details: userError.message,
      });
    }

    // ======================
    // 3. Respuesta final
    // ======================

    return res.status(200).json({
      ok: true,
      commerce: commerceData,
      tempPassword,
    });

  } catch (err: any) {
    return res.status(500).json({
      error: "Unhandled error",
      details: err?.message || String(err),
    });
  }
}
