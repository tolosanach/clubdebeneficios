import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Permitir solo POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Solo prueba por ahora
    return res.status(200).json({
      ok: true,
      message: "create-commerce function is working",
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Unhandled error",
      details: err?.message || String(err),
    });
  }
}
