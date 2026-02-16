import { supabase } from "./supabase";

export async function supabasePing() {
  const { data, error } = await supabase.from("ping").select("*").limit(1);
  return { data, error };
}
