import { parseObject, pretty } from "../integracion/solicitudes-integracion";
import { importExcel } from "./excel-documentos";

/** Importa un registro sin ejecutar instrucciones. TXT contiene JSON o XML.
 * XML DE se lee sin convertirlo automáticamente en nota de crédito. */
export async function importarDatos(archivo: File) {
  if (archivo.size > 10_000_000) throw Error("El archivo supera 10 MB. Elegí uno más pequeño.");
  const extension = archivo.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx") return importExcel(archivo);
  const texto = (await archivo.text()).replace(/^\uFEFF/, "").trim();
  if (extension !== "xml" && !texto.startsWith("<")) return parseObject(texto);
  if (/<!DOCTYPE|<!ENTITY/i.test(texto)) throw Error("El XML contiene declaraciones externas que no se admiten.");
  const xml = new DOMParser().parseFromString(texto, "application/xml");
  if (xml.querySelector("parsererror")) throw Error("XML inválido: revisá las etiquetas de apertura y cierre.");
  if (xml.documentElement.localName === "KuatiaPost") return parseObject(xml.querySelector("DatosJSON")?.textContent || "");
  const de = Array.from(xml.getElementsByTagName("*")).filter(n => n.localName === "DE");
  if (de.length !== 1) throw Error("Elegí un XML con un solo registro DE o un XML exportado por KuatiaPost.");
  const salida: any = { tipOpe: "1" };
  const grupos: Record<string,string> = { gCamItem:"Detalles", gTotSub:"Subtotales", gCamDEAsoc:"DocumentosAsociados", gPaConEIni:"Pagos", gTransp:"Transporte", gCamSal:"Salida", gCamEnt:"Entrega" };
  const hojas = (e: Element) => Object.fromEntries(Array.from(e.getElementsByTagName("*")).filter(n => !n.children.length).map(n => [n.localName,n.textContent || ""]));
  for (const n of Array.from(de[0].getElementsByTagName("*"))) {
    if (grupos[n.localName]) (salida[grupos[n.localName]] ||= []).push(hojas(n));
    if (n.children.length) continue;
    let p = n.parentElement, dentro = false;
    while (p && p !== de[0]) { if (grupos[p.localName]) dentro = true; p = p.parentElement; }
    if (!dentro) salida[n.localName] = n.textContent || "";
  }
  if (!salida.iTiDE) throw Error("No se encontró iTiDE en el XML.");
  return parseObject(pretty(salida));
}

/** XML de intercambio KuatiaPost: conserva JSON libre; no es XML fiscal firmado. */
export function exportarXML(datos: any) {
  const texto = pretty(datos).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n<KuatiaPost version="1"><DatosJSON>${texto}</DatosJSON></KuatiaPost>`], {type:"application/xml"});
}
