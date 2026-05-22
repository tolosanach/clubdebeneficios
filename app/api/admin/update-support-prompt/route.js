// GET /api/admin/update-support-prompt
// Cron diario (02:00 UTC). Lee CLAUDE.md y le pide a Claude Haiku que genere
// los system prompts del chat de soporte. Guarda en app_config de Supabase.
// Auth: header Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import fs   from 'fs'
import path from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ANTHROPIC_URL   = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'

const META_PROMPT = `Sos un redactor de contenido para Benefix, una app argentina de fidelización para comercios.
Te voy a dar el archivo CLAUDE.md que documenta el estado actual de la app. Tu tarea es generar los system prompts del chat de soporte integrado en la app.

INSTRUCCIONES:
- Extraé SOLO información relevante para usuarios finales (comerciantes y clientes). Ignorá: detalles técnicos de implementación, esquemas de base de datos, nombres de columnas, task numbers (#67 etc.), emails internos, tokens/keys, notas de arquitectura, código, comandos, nombres de archivos fuente.
- Escribí en castellano rioplatense, breve y directo.
- No uses emojis.
- El resultado debe ser un JSON con exactamente estas 3 claves: "common", "merchant", "client".

"common": instrucciones de comportamiento del asistente + realidad completa de Benefix (sistemas, premios, promos, planes con límites pero SIN precios en pesos, notificaciones, directorio). Incluí la regla: si piden precios exactos decir "los precios actuales se ven en la pestaña Planes". Incluí la regla: máximo 2-3 párrafos de respuesta.

"merchant": contexto específico para el dueño/cajero — qué puede hacer desde cada pestaña del panel, flujo de escaneo, flujo del cupón (modal ¿Renovar?), cómo sumar clientes, preguntas típicas que haría un comerciante.

"client": contexto específico para el cliente/socio — qué puede ver en su billetera, cómo mostrar su QR, cómo sumarse a un club, cómo funcionan los cupones desde su lado, preguntas típicas.

Respondé ÚNICAMENTE con el JSON, sin texto adicional, sin markdown, sin bloques de código.`

export async function GET(request) {
  const auth = request.headers.get('authorization') || ''
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Leer CLAUDE.md desde la raíz del proyecto
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md')
    const claudeMd     = fs.readFileSync(claudeMdPath, 'utf8')

    // Llamar a Claude Haiku para distilarlo en prompts de soporte
    const apiResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key':          process.env.ANTHROPIC_API_KEY,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model:      ANTHROPIC_MODEL,
        max_tokens: 2000,
        system:     META_PROMPT,
        messages:   [{ role: 'user', content: claudeMd }],
      }),
    })

    if (!apiResp.ok) {
      const err = await apiResp.text()
      console.error('Anthropic error:', apiResp.status, err)
      return NextResponse.json({ error: 'Anthropic error', detail: err }, { status: 502 })
    }

    const aiData = await apiResp.json()
    const raw    = aiData?.content?.[0]?.text?.trim() || ''

    let prompts
    try {
      prompts = JSON.parse(raw)
    } catch {
      console.error('JSON parse error. Raw response:', raw)
      return NextResponse.json({ error: 'Invalid JSON from Haiku', raw }, { status: 500 })
    }

    if (!prompts.common || !prompts.merchant || !prompts.client) {
      return NextResponse.json({ error: 'Missing keys in response', prompts }, { status: 500 })
    }

    // Guardar en Supabase
    const upserts = [
      { key: 'support_prompt_common',   value: prompts.common   },
      { key: 'support_prompt_merchant', value: prompts.merchant },
      { key: 'support_prompt_client',   value: prompts.client   },
    ]

    for (const row of upserts) {
      const { error } = await supabaseAdmin
        .from('app_config')
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
    }

    // Invalidar el cache en memoria del chat (no podemos hacerlo cross-instancia,
    // pero el TTL de 5 minutos es suficiente para que la actualización se propague)
    console.log('Support prompts updated successfully')
    return NextResponse.json({ ok: true, updated: upserts.map(r => r.key) })

  } catch (err) {
    console.error('update-support-prompt error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
