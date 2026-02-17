import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type CreateCommerceBody = {
  id?: string;            // opcional (si no lo mandás, generamos uno)
  name: string;
  logo_url?: string | null;
  enable_points?: boolean;
  points_mode?: string;   // ej: "FIXED"
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        error: "Missing server env vars",
        details: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as CreateCommerceBody;

    if (!body?.name || body.name.trim().length < 2) {
      return res.status(400).json({ error: "name is required" });
    }

    const commerceId = body.id?.trim() || slugifyId(body.name);

    // Mapeo a tus columnas reales de Supabase (según tu screenshot)
    const payload = {
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

      // created_at / updated_at los maneja Supabase con defaults now()
    };

    const { data, error } = await supabase
      .from("commerces")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ error: "Supabase insert failed", details: error.message });
    }

    return res.status(200).json({ ok: true, commerce: data });
  } catch (err: any) {
    return res.status(500).json({
      error: "Unhandled error",
      details: err?.message || String(err),
    });
  }
}
