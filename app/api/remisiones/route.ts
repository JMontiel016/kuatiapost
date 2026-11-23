import { NextRequest, NextResponse } from "next/server";
import { COOKIE, listarRemisiones, obtenerUsuario, reservarRemision, resolverRemision } from "../../../lib/usuario/almacen";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const usuario = obtenerUsuario(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  return NextResponse.json({ remisiones: listarRemisiones(usuario.id) }, { headers: { "Cache-Control":"no-store" } });
}
export async function POST(req: NextRequest) {
  const usuario = obtenerUsuario(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  const origen = req.headers.get("origin");
  if (origen && origen !== req.nextUrl.origin)
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    const input = await req.json();
    if (input.action === "reserve") {
      reservarRemision(usuario.id, String(input.id || ""), input.lineas);
      return NextResponse.json({ estado: "pendiente" });
    }
    if (input.action === "settle") {
      return NextResponse.json(resolverRemision(usuario.id, String(input.id || ""), input.respuesta));
    }
    throw Error("Operación no reconocida.");
  } catch(e: any) {
    return NextResponse.json({ error: e.message || "No se pudo registrar la remisión." }, { status: 400 });
  }
}
