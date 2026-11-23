/**
 * Almacenamiento privado de KuatiaPost. SQLite en disco local y libSQL remoto en Vercel.
 */
import { createClient, type Client, type InStatement } from "@libsql/client";
import { mkdirSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes, createHash, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";

export const COOKIE = "kuatiapost_sesion";
// Se identifica el navegador por una cookie aleatoria de larga duración.
// No equivale a una cuenta personal: compartir el mismo perfil comparte el espacio.
const SESION_MS = 365 * 24 * 60 * 60 * 1000;
let conexion: Promise<Client> | undefined;
let operacionesLocales: Promise<unknown> = Promise.resolve();

async function conBase<T>(operar: (db: Client) => Promise<T>): Promise<T> {
  const db = await bd();
  if (process.env.TURSO_DATABASE_URL) return operar(db);
  // SQLite ejecuta las escrituras de forma síncrona. Evita que otra operación
  // bloquee el hilo mientras una transacción asíncrona local espera continuar.
  const operacion = operacionesLocales.then(() => operar(db));
  operacionesLocales = operacion.catch(() => undefined);
  return operacion;
}

function ejecutar(sentencia: InStatement) {
  return conBase(db => db.execute(sentencia));
}

function bd(): Promise<Client> {
  conexion ??= abrirBase().catch(error => {
    conexion = undefined;
    throw error;
  });
  return conexion;
}

async function abrirBase() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if ((url || authToken || process.env.VERCEL === "1") && (!url || !authToken)) {
    throw Error("Configurá TURSO_DATABASE_URL y TURSO_AUTH_TOKEN para usar el almacenamiento remoto.");
  }

  let archivo: string | undefined;
  if (!url) {
    const ruta = process.env.KUATIAPOST_DATA_DIR
      ? resolve(/* turbopackIgnore: true */ process.env.KUATIAPOST_DATA_DIR)
      : join(process.cwd(), "data");
    mkdirSync(ruta, { recursive: true, mode: 0o700 });
    chmodSync(ruta, 0o700);
    archivo = join(ruta, "kuatiapost.sqlite");
  }

  const db = archivo
    ? createClient({ url: pathToFileURL(archivo).href, timeout: 5000 })
    : createClient({ url: url!, authToken });
  try {
    if (archivo) {
      await db.execute("PRAGMA journal_mode=WAL");
      chmodSync(archivo, 0o600);
    }
    await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL,
      hash TEXT NOT NULL, creado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sesiones (
      token_hash TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id),
      vence INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS espacios (
      usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id), json TEXT NOT NULL,
      actualizado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS remisiones (
      usuario_id TEXT NOT NULL REFERENCES usuarios(id), id TEXT NOT NULL,
      estado TEXT NOT NULL, lineas TEXT NOT NULL, resultado TEXT,
      creado INTEGER NOT NULL, actualizado INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_remisiones_usuario_estado
      ON remisiones(usuario_id, estado);
    `);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

type Usuario = { id: string; email: string };
type FilaUsuario = Usuario & { salt: string; hash: string };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function registrar(email: string, clave: string) {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw Error("Ingresá un correo válido.");
  if (clave.length < 8 || clave.length > 200)
    throw Error("La contraseña debe tener entre 8 y 200 caracteres.");
  const id = randomUUID();
  const salt = randomBytes(24).toString("hex");
  const hash = scryptSync(clave, Buffer.from(salt, "hex"), 64).toString("hex");
  try {
    await ejecutar({ sql: "INSERT INTO usuarios(id,email,salt,hash,creado) VALUES (?,?,?,?,?)", args: [id, email, salt, hash, Date.now()] });
  } catch (error: any) {
    if (String(error.message).includes("UNIQUE")) throw Error("Este correo ya tiene una cuenta.");
    throw error;
  }
  return { id, email };
}

export async function autenticar(email: string, clave: string): Promise<Usuario | null> {
  const f = (await ejecutar({ sql: "SELECT id,email,salt,hash FROM usuarios WHERE email=?", args: [email.trim().toLowerCase()] })).rows[0] as unknown as FilaUsuario | undefined;
  // Hacer el mismo trabajo de scrypt si el correo no existe, para reducir
  // diferencias de tiempo observables al validar usuarios.
  const salt = f?.salt || "0".repeat(48);
  const real = Buffer.from(f?.hash || "0".repeat(128), "hex");
  const calculado = scryptSync(clave.slice(0, 200), Buffer.from(salt, "hex"), 64);
  return f && timingSafeEqual(real, calculado) ? { id: f.id, email: f.email } : null;
}

export async function nuevaSesion(usuario: Usuario) {
  const token = randomBytes(32).toString("base64url");
  const vence = Date.now() + SESION_MS;
  await ejecutar({ sql: "INSERT INTO sesiones(token_hash,usuario_id,vence) VALUES (?,?,?)", args: [hashToken(token), usuario.id, vence] });
  await ejecutar({ sql: "DELETE FROM sesiones WHERE vence < ?", args: [Date.now()] });
  return { token, maxAge: Math.floor(SESION_MS / 1000) };
}

export async function obtenerUsuario(token?: string | null): Promise<Usuario | null> {
  if (!token || token.length > 200) return null;
  const row = (await ejecutar({ sql: `SELECT u.id,u.email FROM sesiones s
    JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.vence>?`, args: [hashToken(token), Date.now()] })).rows[0] as unknown as Usuario | undefined;
  return row || null;
}

/** Renueva la identificación del navegador para evitar perderla por inactividad.
 * El token nunca se envía al código cliente ni se registra en el estado.
 */
export async function renovarSesion(token: string): Promise<number> {
  const expira = Date.now() + SESION_MS;
  await ejecutar({ sql: "UPDATE sesiones SET vence=? WHERE token_hash=? AND vence>?", args: [expira, hashToken(token), Date.now()] });
  return Math.floor(SESION_MS / 1000);
}

/** Crea un identificador aleatorio que representa al perfil, sin login.
 * Reusa las tablas existentes para conservar la separación de remisiones y estados.
 * Las cuentas antiguas permanecen intactas; no se migran datos entre personas.
 */
export async function nuevaIdentidadNavegador(): Promise<{ token: string; maxAge: number }> {
  const id = randomUUID();
  const salt = randomBytes(24).toString("hex");
  const hash = randomBytes(64).toString("hex");
  const email = `perfil-${id}@browser.kuatiapost.invalid`;
  const ahora = Date.now();
  const token = randomBytes(32).toString("base64url");
  await conBase(db => db.batch([
    { sql: "INSERT INTO usuarios(id,email,salt,hash,creado) VALUES (?,?,?,?,?)", args: [id, email, salt, hash, ahora] },
    { sql: "INSERT INTO sesiones(token_hash,usuario_id,vence) VALUES (?,?,?)", args: [hashToken(token), id, ahora + SESION_MS] },
    { sql: "DELETE FROM sesiones WHERE vence < ?", args: [ahora] },
  ], "write"));
  return { token, maxAge: Math.floor(SESION_MS / 1000) };
}

export async function cerrarSesion(token?: string | null) {
  if (token) await ejecutar({ sql: "DELETE FROM sesiones WHERE token_hash=?", args: [hashToken(token)] });
}

// No se guardan tokens, contraseñas de integración ni JSON de autenticación.
const camposPermitidos = [
  "body", "type", "mode", "editorTab", "borradores", "url", "authUrl",
  "consultaUrl", "kudeUrl", "compartirKude", "connections", "activeConnectionId",
  "connectionName", "records", "oscuro", "xml", "xmlOpts", "datosConsulta",
  "jsonConsulta", "jsonKude", "nrWorkspace", "nrTrace",
  "view", "method", "ruc", "verRespuesta", "question", "answer",
  "sources", "includeDoc", "find", "replace", "resultadoConsulta",
  "nrMasivaSession",
];

export async function guardarEspacio(usuarioId: string, datos: unknown) {
  if (!datos || Array.isArray(datos) || typeof datos !== "object") throw Error("Datos inválidos.");
  const obj = datos as Record<string, unknown>;
  const filtrado: Record<string, unknown> = {};
  for (const campo of camposPermitidos) if (campo in obj) filtrado[campo] = obj[campo];
  // Solo el último registro se muestra tras volver a ingresar.
  if (Array.isArray(filtrado.records)) filtrado.records = filtrado.records.slice(0, 1);
  // Se vuelve a filtrar cada conexión guardada desde el servidor.
  if (Array.isArray(filtrado.connections)) {
    filtrado.connections = filtrado.connections.slice(0, 100).map((v: any) => ({
      id: String(v?.id || "").slice(0, 80),
      name: String(v?.name || "").slice(0, 100),
      url: String(v?.url || "").slice(0, 2000),
      consultaUrl: String(v?.consultaUrl || "").slice(0, 2000),
      kudeUrl: String(v?.kudeUrl || "").slice(0, 2000),
      authUrl: String(v?.authUrl || "").slice(0, 2000),
      compartirKude: !!v?.compartirKude,
    }));
  }
  const json = JSON.stringify(filtrado);
  if (Buffer.byteLength(json, "utf8") > 15_000_000) throw Error("El borrador supera 15 MB.");
  await ejecutar({ sql: `INSERT INTO espacios(usuario_id,json,actualizado) VALUES (?,?,?)
    ON CONFLICT(usuario_id) DO UPDATE SET json=excluded.json,actualizado=excluded.actualizado`, args: [usuarioId, json, Date.now()] });
  return { actualizado: Date.now() };
}

export async function leerEspacio(usuarioId: string): Promise<Record<string, any>> {
  const row = (await ejecutar({ sql: "SELECT json FROM espacios WHERE usuario_id=?", args: [usuarioId] })).rows[0] as unknown as { json: string } | undefined;
  return row ? JSON.parse(row.json) : {};
}

export type LineaRemision = { cdc: string; indice: number; cantidad: string; total: string };
export type Remision = {
  id: string; estado: string; lineas: LineaRemision[]; creado: number;
  actualizado: number; resultado?: unknown;
};

/** Decimal exacto con máximo 8 posiciones. Sin coma flotante. */
export function decimalExacto(valor: string): bigint {
  const v = String(valor).trim();
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,8})?$/.test(v))
    throw Error(`Cantidad inválida: ${v}. Usá hasta 8 decimales.`);
  const [entero, decimales = ""] = v.split(".");
  return BigInt(entero) * 100000000n + BigInt(decimales.padEnd(8, "0"));
}

export async function listarRemisiones(usuarioId: string): Promise<Remision[]> {
  const rows = (await ejecutar({ sql: `SELECT id,estado,lineas,resultado,creado,actualizado FROM remisiones
    WHERE usuario_id=? ORDER BY creado DESC LIMIT 500`, args: [usuarioId] })).rows as unknown as Array<{id:string; estado:string; lineas:string;resultado:string|null;creado:number;actualizado:number}>;
  return rows.map(r => ({ id:r.id, estado:r.estado, lineas:JSON.parse(r.lineas),
    resultado:r.resultado ? JSON.parse(r.resultado) : undefined,
    creado:r.creado, actualizado:r.actualizado }));
}

/**
 * Reserva de manera atómica las cantidades antes de llamar a una API externa.
 * Las solicitudes inciertas NO se liberan, ya que el emisor podría haber emitido
 * el DE aunque la conexión haya terminado en timeout.
 */
export async function reservarRemision(usuarioId: string, id: string, lineas: LineaRemision[]) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw Error("Identificador de borrador inválido.");
  if (!Array.isArray(lineas) || !lineas.length || lineas.length > 999)
    throw Error("Elegí entre 1 y 999 líneas de remisión.");
  const unicas = new Set<string>();
  for (const linea of lineas) {
    if (!/^\d{44}$/.test(linea.cdc) || !Number.isInteger(linea.indice) || linea.indice < 0)
      throw Error("La factura o su posición de producto es inválida.");
    const llave = `${linea.cdc}:${linea.indice}`;
    if (unicas.has(llave)) throw Error(`Producto duplicado en la misma remisión: ${llave}`);
    unicas.add(llave);
    if (decimalExacto(linea.cantidad) <= 0n || decimalExacto(linea.total) <= 0n)
      throw Error("Las cantidades deben ser mayores que cero.");
    if (decimalExacto(linea.cantidad) > decimalExacto(linea.total))
      throw Error("No podés remitir más que la cantidad original.");
  }
  await conBase(async db => {
    const tx = await db.transaction("write");
    try {
      const actual = (await tx.execute({ sql: "SELECT estado FROM remisiones WHERE usuario_id=? AND id=?", args: [usuarioId, id] })).rows[0] as unknown as { estado: string } | undefined;
      if (actual) throw Error(`Este borrador ya fue procesado (${actual.estado}). Consultá el estado antes de reenviar.`);
      const reservadas = (await tx.execute({ sql: `SELECT lineas FROM remisiones WHERE usuario_id=? AND estado IN ('pendiente','incierto','aprobado')`, args: [usuarioId] })).rows as unknown as Array<{lineas:string}>;
      const ocupadas = new Map<string,bigint>();
      for (const reg of reservadas) for (const l of JSON.parse(reg.lineas) as LineaRemision[]) {
        const llave = `${l.cdc}:${l.indice}`;
        ocupadas.set(llave, (ocupadas.get(llave)||0n) + decimalExacto(l.cantidad));
      }
      for (const l of lineas) {
        const llave = `${l.cdc}:${l.indice}`;
        if ((ocupadas.get(llave)||0n)+decimalExacto(l.cantidad) > decimalExacto(l.total))
          throw Error(`Cantidad disponible insuficiente para la línea ${l.indice+1} de ${l.cdc}. Revisá remisiones ya emitidas o pendientes.`);
      }
      const ahora = Date.now();
      await tx.execute({ sql: `INSERT INTO remisiones(usuario_id,id,estado,lineas,creado,actualizado)
        VALUES (?,?,?,?,?,?)`, args: [usuarioId,id,"pendiente",JSON.stringify(lineas),ahora,ahora] });
      await tx.commit();
    } finally {
      tx.close();
    }
  });
}

/** No confiar en un booleano 'aprobado' proporcionado por el navegador. */
export async function resolverRemision(usuarioId:string, id:string, respuesta: any) {
  const respuestaCDC = String(respuesta?.data?.CDC || respuesta?.data?.cdc ||
    respuesta?.data?.message?.CDC || respuesta?.data?.message?.cdc || "");
  const registro = (await ejecutar({ sql: "SELECT lineas FROM remisiones WHERE usuario_id=? AND id=?", args: [usuarioId,id] })).rows[0] as unknown as {lineas:string}|undefined;
  const origenes = new Set((registro ? JSON.parse(registro.lineas) as LineaRemision[] : []).map(l=>l.cdc));
  const aprobado = respuesta?.http >= 200 && respuesta?.http < 300 &&
    (respuesta?.data?.Estado === "Aprobado" || respuesta?.data?.message?.Estado === "Aprobado") &&
    /^\d{44}$/.test(respuestaCDC) && !origenes.has(respuestaCDC);
  const estado = aprobado ? "aprobado" : "incierto";
  const respuestaSegura = {
    http: typeof respuesta?.http === "number" ? respuesta.http : null,
    estadoReportado: String(respuesta?.data?.Estado || respuesta?.data?.message?.Estado || "").slice(0,100),
    cdcNR: respuestaCDC.slice(0,60),
  };
  const result = await ejecutar({ sql: `UPDATE remisiones SET estado=?, resultado=?, actualizado=?
    WHERE usuario_id=? AND id=? AND estado='pendiente'`, args: [estado,JSON.stringify(respuestaSegura),Date.now(),usuarioId,id] });
  if (result.rowsAffected !== 1) throw Error("La remisión ya se procesó o no tiene una reserva activa.");
  return { estado };
}
