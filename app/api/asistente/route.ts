import { askAssistant, settings, comprobarConexion } from "../../../lib/asistente/asistente-llama";
export const runtime = "nodejs";
export const maxDuration = 300;

const counters = new Map<string, { start: number; count: number }>();
const reply = (data: any, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Permite comprobar configuración sin exponer URL ni clave del modelo. */
export async function GET() {
  return reply(await comprobarConexion());
}

/** Valida la consulta, limita solicitudes y conecta el asistente del servidor. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: "Origen no permitido." }, 403);
  const now = Date.now();
  for (const [ip, c] of counters)
    if (now - c.start > 60000) counters.delete(ip);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const count = counters.get(ip) || { start: now, count: 0 };
  if (count.count >= 12 || counters.size > 5000)
    return reply(
      { error: "Esperá un minuto antes de volver a consultar." },
      429,
    );
  count.count++;
  counters.set(ip, count);
  let body: any;
  try {
    const text = await request.text();
    if (text.length > 110000)
      return reply({ error: "Consulta demasiado grande." }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "JSON inválido." }, 400);
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.question !== "string"
  )
    return reply(
      { error: "La consulta debe incluir question como texto." },
      400,
    );
  if (!settings().url)
    return reply(
      {
        error:
          "El asistente está integrado, pero falta conectar el servicio del asistente en el servidor.",
      },
      503,
    );
  try {
    return reply(await askAssistant(body.question, body.json, settings()));
  } catch (e: any) {
    if (e.name === "TimeoutError")
      return reply(
        { error: "El modelo superó cuatro minutos. En equipos sin GPU puede tardar más; probá una consulta más corta." },
        504,
      );
    if (e instanceof TypeError)
      return reply(
        {
          error:
            "No se pudo conectar con el asistente. Verificá que esté iniciado y accesible desde el servidor.",
        },
        502,
      );
    return reply(
      { error: e.message || "No se pudo completar la consulta." },
      400,
    );
  }
}
