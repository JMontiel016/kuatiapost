import { NextRequest, NextResponse } from "next/server";
import { COOKIE, listarRemisiones, obtenerUsuario, reservarRemision, resolverRemision } from "../../../lib/usuario/almacen";
import { origenPermitido } from "../../../lib/usuario/origen";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const usuario = await obtenerUsuario(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  return NextResponse.json({ remisiones: await listarRemisiones(usuario.id) }, { headers: { "Cache-Control":"no-store" } });
}
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  if (!origenPermitido(req))
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    const input = await req.json();
    if (input.action === "reserve") {
      await reservarRemision(usuario.id, String(input.id || ""), input.lineas);
      return NextResponse.json({ estado: "pendiente" });
    }
    if (input.action === "settle") {
      return NextResponse.json(await resolverRemision(usuario.id, String(input.id || ""), input.respuesta));
    }
    throw Error("Operación no reconocida.");
  } catch(e: any) {
    return NextResponse.json({ error: e.message || "No se pudo registrar la remisión." }, { status: 400 });
  }
}
