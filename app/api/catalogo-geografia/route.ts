import { NextRequest, NextResponse } from "next/server";
import catalogo from "../../../lib/documentos/catalogo-geografico-ine-2025.json";

/** Catálogo local incluido en el proyecto: 18 departamentos, 272 distritos, 6.766 ciudades.
 * La respuesta contiene los mismos códigos del XLSX fuente; no usa identificadores
 * de una API de terceros ni cambia un código según el texto mostrado.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Lugar = { codigo: number; nombre: string; departamentoId?: number; distritoId?: number; distritoNombre?: string };
const deps = catalogo.departamentos as (number | string)[][];
const dis = catalogo.distritos as (number | string)[][];
const cius = catalogo.ciudades as (number | string)[][];
const depPorDis = new Map(dis.map(([cod, dep]) => [Number(cod), Number(dep)]));
const disNombre = new Map(dis.map(([cod, , nombre]) => [Number(cod), String(nombre)]));
const depValidos = new Set(deps.map(([cod]) => Number(cod)));
const disValidos = new Set(dis.map(([cod]) => Number(cod)));

export async function GET(req: NextRequest) {
  const nivel = req.nextUrl.searchParams.get("nivel");
  const rawId = req.nextUrl.searchParams.get("id");
  if (!["departamentos", "distritos", "ciudades", "ciudades-departamento"].includes(nivel || "")) {
    return NextResponse.json({error:"Elegí departamento, distrito o ciudad."}, {status:400});
  }
  const id = rawId && /^\d{1,6}$/.test(rawId) ? Number(rawId) : NaN;
  if (nivel !== "departamentos" && (!Number.isInteger(id) || id <= 0)) {
    return NextResponse.json({error:"Primero seleccioná el lugar anterior."}, {status:400});
  }
  if (nivel === "distritos" || nivel === "ciudades-departamento") {
    if (!depValidos.has(id)) return NextResponse.json({error:"Departamento no encontrado."},{status:404});
  }
  if (nivel === "ciudades" && !disValidos.has(id)) {
    return NextResponse.json({error:"Distrito no encontrado."},{status:404});
  }
  let datos: Lugar[];
  if (nivel === "departamentos") {
    datos = deps.map(([codigo,nombre]) => ({ codigo:Number(codigo), nombre:String(nombre), departamentoId:Number(codigo) }));
  } else if (nivel === "distritos") {
    datos = dis.filter(([,dep]) => Number(dep) === id)
      .map(([codigo,dep,nombre]) => ({codigo:Number(codigo),nombre:String(nombre),departamentoId:Number(dep),distritoId:Number(codigo)}));
  } else {
    const visibles = nivel === "ciudades" ? cius.filter(([, distrito])=> Number(distrito)===id)
      : cius.filter(([, distrito])=> depPorDis.get(Number(distrito))===id);
    datos = visibles.map(([codigo,distrito,nombre]) => ({
      codigo:Number(codigo),nombre:String(nombre),
      departamentoId:depPorDis.get(Number(distrito)),distritoId:Number(distrito),
      distritoNombre:disNombre.get(Number(distrito)) || "",
    }));
  }
  return NextResponse.json({datos,origen:"Código de Referencia Geográfica (Excel recibido)",fechaFuente:catalogo.actualizado,
    totales:{departamentos:deps.length,distritos:dis.length,ciudades:cius.length}},
    {headers:{"Cache-Control":"public, max-age=3600"}});
}
