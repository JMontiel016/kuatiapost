/** Utilidades JSON y solicitudes GET/POST a la URL de integración elegida por la persona. */
import { createScanner } from "jsonc-parser";

/** Formatea el JSON para que sea fácil de leer y editar. */
export const pretty = (v: any) => JSON.stringify(v, null, 2);

/** Quita comentarios de línea conservando posiciones y literales del JSON. */
export function quitarComentariosJSON(text: string) {
  const scanner = createScanner(text);
  const partes: string[] = [];
  let inicio = 0;
  while (scanner.getPosition() < text.length) {
    scanner.scan();
    const offset = scanner.getTokenOffset();
    if (!text.startsWith("//", offset)) continue;
    const largo = scanner.getTokenLength();
    partes.push(text.slice(inicio, offset), " ".repeat(largo));
    inicio = offset + largo;
  }
  return inicio ? partes.join("") + text.slice(inicio) : text;
}

/** Valida la sintaxis y exige un objeto como raíz de la solicitud. */
export function parseObject(text: string) {
  let v: any;
  try { v = JSON.parse(quitarComentariosJSON(text)); }
  catch { throw Error("JSON inválido: revisá comillas dobles, comas y el cierre de llaves o corchetes. Conservamos el texto para que puedas corregirlo."); }
  // Evita claves especiales que podrían modificar prototipos al importar datos.
  const revisar = (objeto: any) => {
    if (!objeto || typeof objeto !== "object") return;
    for (const clave of Object.keys(objeto)) {
      if (["__proto__", "constructor", "prototype"].includes(clave)) throw Error(`La clave ${clave} está reservada. Usá otro nombre.`);
      revisar(objeto[clave]);
    }
  };
  revisar(v);
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
  let u: URL;
  try { u = new URL(raw); } catch { throw Error("La URL no está completa. Ingresá una dirección que empiece por https:// y tenga dominio y ruta."); }
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
  jsonOriginal?: string,
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
      ...(method === "GET" ? {} : {
        body: jsonOriginal === undefined ? JSON.stringify(body) : quitarComentariosJSON(jsonOriginal),
      }),
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
