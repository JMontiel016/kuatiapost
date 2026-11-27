/** Utilidades JSON y solicitudes GET/POST a la URL de integración elegida por la persona. */
import { createScanner, visit } from "jsonc-parser";

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
  catch {
    let ubicacion = "";
    visit(quitarComentariosJSON(text), {
      onError(_error, _offset, _largo, linea, columna) {
        ubicacion ||= ` en la línea ${linea + 1}, columna ${columna + 1}`;
      },
    }, { disallowComments: true });
    throw Error(`JSON inválido${ubicacion}: revisá comillas dobles, comas y el cierre de llaves o corchetes. Conservamos el texto para que puedas corregirlo.`);
  }
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

/** Examina el texto original, antes de perder claves repetidas o decimales escritos. */
export function revisarTextoJSON(texto: string) {
  const errores: string[] = [];
  const numeros = new Map<string, string>();
  const objetos: Set<string>[] = [];
  const mostrarRuta = (ruta: (string | number)[]) => ruta.reduce<string>((s, p) =>
    typeof p === "number" ? `${s}[${p}]` : s ? `${s}.${p}` : p, "");
  const caracteresInvalidos = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u;
  const revisarCaracteres = (valor: string, ruta: (string | number)[], linea: number, columna: number) => {
    const ubicacion = `[${mostrarRuta(ruta)}] (línea ${linea + 1}, columna ${columna + 1})`;
    if (caracteresInvalidos.test(valor)) errores.push(`${ubicacion}: contiene un carácter no válido para XML.`);
    if (valor.includes("\uFFFD")) errores.push(`${ubicacion}: contiene el carácter de reemplazo �. Revisá la codificación del texto de origen.`);
  };
  visit(texto, {
    onObjectBegin() { objetos.push(new Set()); },
    onObjectEnd() { objetos.pop(); },
    onObjectProperty(clave, _offset, _largo, linea, columna, ruta) {
      const claves = objetos.at(-1);
      const campo = [...ruta(), clave];
      if (claves?.has(clave)) errores.push(`[${mostrarRuta(campo)}] Clave repetida (línea ${linea + 1}, columna ${columna + 1}).`);
      claves?.add(clave);
      revisarCaracteres(clave, campo, linea, columna);
    },
    onLiteralValue(valor, offset, largo, linea, columna, ruta) {
      if (typeof valor === "string") revisarCaracteres(valor, ruta(), linea, columna);
      if (typeof valor !== "number") return;
      if (!Number.isFinite(valor)) errores.push(`[${mostrarRuta(ruta())}] Número fuera del rango admitido (línea ${linea + 1}, columna ${columna + 1}).`);
      numeros.set(JSON.stringify(ruta()), texto.slice(offset, offset + largo));
    },
  });
  return { errores, numeros };
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

/** Selecciona las reglas conocidas por destino y método. */
export function esOperacionFutura(url: string, metodo: string) {
  try {
    const destino = new URL(safeUrl(url));
    return metodo === "POST" &&
      destino.origin === "https://test-integracion-mdware.dev.platform.futura100.com.py" &&
      /^\/api\/operation\/?$/.test(destino.pathname);
  } catch {
    return false;
  }
}

/** Comprueba la solicitud de forma local y aplica los requisitos conocidos del destino. */
export function verificarApiEnvio(url: string, metodo: string, cuerpo: string, token: string) {
  const errores: string[] = [];
  try {
    safeUrl(url);
  } catch (error) {
    errores.push(error instanceof Error ? error.message : "Revisá la URL de envío.");
  }

  if (!["GET", "POST"].includes(metodo)) errores.push("Seleccioná GET o POST.");
  let documento: Record<string, unknown> | undefined;
  if (metodo === "POST") {
    try {
      documento = parseObject(cuerpo);
      errores.push(...revisarTextoJSON(cuerpo).errores);
    } catch {
      errores.push("Cuerpo: ingresá un objeto JSON válido para POST.");
    }
  }

  const futura = esOperacionFutura(url, metodo);
  if (futura) {
    if (!token.trim()) errores.push("Token de acceso: generá o ingresá el token para Futura100.");
    const operacion = documento?.tipOpe;
    if (documento && (operacion == null || (typeof operacion === "string" && !operacion.trim())))
      errores.push("tipOpe: falta el tipo de operación. Para emitir, usá 1.");
  }

  return { errores, contratoConocido: futura };
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
