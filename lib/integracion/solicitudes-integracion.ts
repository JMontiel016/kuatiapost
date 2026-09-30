/** Utilidades JSON y solicitudes GET/POST a la URL de integración elegida por la persona. */

/** Formatea el JSON para que sea fácil de leer y editar. */
export const pretty = (v: any) => JSON.stringify(v, null, 2);

/** Valida la sintaxis y exige un objeto como raíz de la solicitud. */
export function parseObject(text: string) {
  const v = JSON.parse(text);
  if (!v || Array.isArray(v) || typeof v !== "object")
    throw Error("La solicitud debe ser un objeto JSON.");
  return v;
}

/** Obtiene un dato de la respuesta por una ruta como data.estado. */
export function pointer(value: any, path: string) {
  if (!path) return undefined;
  return path.split(".").reduce((v, k) => v?.[k], value);
}

/** Acepta HTTPS y rechaza credenciales incluidas en la URL. */
export function safeUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("Usá una URL HTTPS sin credenciales en la dirección.");
  return u.toString();
}

/** Envía GET o POST y devuelve HTTP, respuesta y tiempo; no interpreta aprobación fiscal. */
export async function request(
  url: string,
  method: string,
  body: any,
  token: string,
) {
  if (!["GET", "POST"].includes(method))
    throw Error("Solo se admiten GET y POST.");
  const start = performance.now();
  let r: Response;
  try {
    r = await fetch(safeUrl(url), {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
  } catch (e: any) {
    if (e.name === "TimeoutError")
      throw Error("La integración no respondió en 45 segundos.");
    if (e instanceof TypeError)
      throw Error(
        "No se pudo conectar. Verificá la URL, la conexión y que tu API permita CORS desde esta web.",
      );
    throw e;
  }
  const raw = await r.text();
  if (raw.length > 25_000_000) throw Error("La respuesta supera 25 MB.");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  return {
    http: r.status,
    data,
    elapsed: Math.round(performance.now() - start),
  };
}
