import { NextRequest, NextResponse } from "next/server";
import { COOKIE, guardarEspacio, leerEspacio, obtenerUsuario } from "../../../lib/usuario/almacen";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noCache = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const usuario = obtenerUsuario(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  return NextResponse.json({ data: leerEspacio(usuario.id) }, { headers: noCache });
}
export async function PUT(req: NextRequest) {
  const usuario = obtenerUsuario(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  const origen = req.headers.get("origin");
  if (origen && origen !== req.nextUrl.origin)
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    if (Number(req.headers.get("content-length")||0) > 15_000_000)
      return NextResponse.json({ error: "Archivo demasiado grande." }, { status: 413 });
    const data = await req.json();
    return NextResponse.json(guardarEspacio(usuario.id, data), { headers: noCache });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "No se pudo guardar." }, { status: 400 });
  }
}
