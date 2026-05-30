// GET /api/push/config
// Endpoint público que valida si VAPID está configurado correctamente en el servidor.
// El frontend lo consulta al inicializar para saber si puede pedir permisos de push.

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  const configured = !!(publicKey && privateKey && subject)

  return Response.json({
    vapid_configured: configured,
    vapid_public_key: publicKey || null, // Solo público, safe para exponer
    timestamp: new Date().toISOString(),
  })
}
