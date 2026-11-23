import type { NextRequest } from "next/server";

export function origenPermitido(req: NextRequest) {
  const origen = req.headers.get("origin");
  if (!origen) return true;
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const protocolo = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const esquema = protocolo === "https" || protocolo === "http"
    ? `${protocolo}:`
    : req.nextUrl.protocol;
  return origen === `${esquema}//${host}`;
}
