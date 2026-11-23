import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE, obtenerUsuario, renovarSesion, nuevaIdentidadNavegador,
} from "../../../lib/usuario/almacen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function conCookie(req: NextRequest, token: string, maxAge: number) {
  const response = NextResponse.json({ ok: true, modo: "navegador" },
    { headers: { "Cache-Control": "private, no-store" } });
  const https = req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";
  response.cookies.set(COOKIE, token, {
    httpOnly: true, secure: https, sameSite: "lax", path: "/", maxAge,
  });
  return response;
}

/** Crea automáticamente un espacio individual para este perfil del navegador.
 * Si aún conserva una cookie de la versión anterior, reutiliza su borrador.
 * Nadie debe escribir correo, usuario ni contraseña para abrir KuatiaPost.
 */
export async function GET(req: NextRequest) {
  try {
    const previo = req.cookies.get(COOKIE)?.value;
    if (previo && await obtenerUsuario(previo)) {
      return conCookie(req, previo, await renovarSesion(previo));
    }
    const nuevo = await nuevaIdentidadNavegador();
    return conCookie(req, nuevo.token, nuevo.maxAge);
  } catch (error) {
    console.error("No se pudo recuperar el espacio del navegador", error);
    return NextResponse.json({ error: "No se pudo inicializar el espacio personal." },
      { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

/** La pantalla y las acciones de login/registro ya no forman parte de KuatiaPost. */
export async function POST() {
  return NextResponse.json({ error: "No se necesita iniciar sesión." },
    { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
}
