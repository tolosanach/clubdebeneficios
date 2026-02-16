// services/loyalty.ts
import { supabase } from "./supabase";

export async function addPointsByToken(qrToken: string, points: number) {
  // 1) Ejecuta tu función SQL (RPC)
  const { data: rpcData, error: rpcError } = await supabase.rpc("add_points_by_token", {
    p_token: qrToken,
    p_points: points,
  });

  if (rpcError) {
    console.error("RPC add_points_by_token error:", rpcError);
    return { ok: false as const, error: rpcError, customer: null };
  }

  // 2) Trae el cliente actualizado desde la tabla
  const { data: customer, error: fetchError } = await supabase
    .from("customers")
    .select("id, name, qr_token, total_points, current_stars, total_stars, discount_available, discount_expires_at")
    .eq("qr_token", qrToken)
    .single();

  if (fetchError) {
    console.error("Fetch customer after RPC error:", fetchError);
    return { ok: false as const, error: fetchError, customer: null };
  }

  return { ok: true as const, rpcData, customer };
}
