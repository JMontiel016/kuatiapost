/** El asistente permanece deshabilitado también en el servidor.
 * No se conectan proveedores ni se consumen cuotas mientras esté anunciado. */
export const runtime = "nodejs";
function proximamente() {
  return Response.json({ enabled: false, connected: false,
    message: "Próximamente habilitado en KuatiaPost.",
    error: "Próximamente habilitado en KuatiaPost." },
    { status: 503, headers: { "Cache-Control": "no-store" } });
}
export async function GET() { return proximamente(); }
export async function POST() { return proximamente(); }
