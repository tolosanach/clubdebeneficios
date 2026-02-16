// services/id.ts
export function safeUUID(): string {
  // 1) Si el navegador lo soporta, usalo
  if (typeof globalThis !== "undefined") {
    const c: any = (globalThis as any).crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  }

  // 2) Fallback compatible (iOS viejo, navegadores limitados)
  // No es criptográficamente perfecto, pero sirve excelente para IDs internos.
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function shortToken(prefix = "TOK"): string {
  // token cortito tipo CUST-8CHARS
  const raw = safeUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${raw}`;
}
