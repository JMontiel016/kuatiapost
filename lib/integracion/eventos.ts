import { tiposConsulta } from "./consulta-kude";

/** Operaciones 5, 6 y 7 del manual Middleware Futura100 v1.1 (págs. 8-11). */
export type TipoEvento = "cancelacion" | "inutilizacion" | "nominacion";

export const eventos = [
  { id: "cancelacion", titulo: "Cancelación", codigo: "5", descripcion: "Solicita cancelar un documento electrónico identificado por su numeración." },
  { id: "inutilizacion", titulo: "Inutilización", codigo: "6", descripcion: "Solicita inutilizar un número o un rango de numeración." },
  { id: "nominacion", titulo: "Nominación", codigo: "7", descripcion: "Informa los datos del receptor de un documento identificado por CDC." },
] as const;

const receptorEjemplo = {
  iNatRec: "", iTiOpe: "", cPaisRec: "PRY", iTiContRec: "",
  dRucRec: "", dDVRec: "", iTipIDRec: null, dNumIDRec: null,
  dNomRec: "", dNomFanRec: null, dDirRec: "", dNumCasRec: "",
  cDepRec: null, cDisRec: null, cCiuRec: null,
  dTelRec: null, dCelRec: null, dEmailRec: null, dCodCliente: null,
};

/** Los valores vacíos no se completan automáticamente con datos reales. */
export function plantillaEvento(tipo: TipoEvento): Record<string, unknown> {
  if (tipo === "cancelacion") return {
    tipOpe: "5", dEst: "", dPunExp: "", dNumDoc: "", mOtEve: "", tipoDoc: "FE",
  };
  if (tipo === "inutilizacion") return {
    tipOpe: "6", dEst: "", dPunExp: "", dNumIn: "", dNumFin: "", mOtEve: "", tipoDoc: "FE",
  };
  return { tipOpe: "7", cdc: "", mOtEve: "", ...receptorEjemplo };
}

export function etiquetaDocumentoEvento(tipo: TipoEvento, data: Record<string, unknown>) {
  const v = (k: string) => String(data[k] ?? "").trim();
  if (tipo === "nominacion") return "CDC " + (v("cdc") || "sin informar");
  const prefijo = [v("dEst"), v("dPunExp")].join("-");
  if (tipo === "cancelacion") return prefijo + "-" + v("dNumDoc");
  return prefijo + " · del " + v("dNumIn") + " al " + v("dNumFin");
}

export function validarEvento(tipo: TipoEvento, dato: Record<string, unknown>): string[] {
  const errores: string[] = [];
  const v = (k: string) => typeof dato[k] === "string" ? (dato[k] as string).trim() : "";
  const requerido = (k: string, nombre: string) => {
    if (!v(k)) errores.push(nombre + ": campo obligatorio.");
  };
  const exacto = (k: string, largo: number, nombre: string) => {
    if (!new RegExp("^\\d{" + largo + "}$").test(v(k)))
      errores.push(nombre + ": ingresá " + largo + " dígitos (con ceros iniciales).");
  };
  const operacion = eventos.find((e) => e.id === tipo);
  if (v("tipOpe") !== operacion?.codigo)
    errores.push("El código tipOpe debe ser " + operacion?.codigo + " para este evento.");
  requerido("mOtEve", "Motivo del evento");
  if (tipo !== "nominacion") {
    exacto("dEst", 3, "Establecimiento");
    exacto("dPunExp", 3, "Punto de expedición");
    if (!tiposConsulta.some(([codigo]) => codigo === v("tipoDoc")))
      errores.push("Tipo de documento: seleccioná una opción válida.");
    if (tipo === "cancelacion") exacto("dNumDoc", 7, "Número del documento");
    else {
      exacto("dNumIn", 7, "Numeración inicial");
      exacto("dNumFin", 7, "Numeración final");
      if (/^\d{7}$/.test(v("dNumIn")) && /^\d{7}$/.test(v("dNumFin")) &&
          Number(v("dNumIn")) > Number(v("dNumFin")))
        errores.push("La numeración inicial no puede superar la final.");
    }
  } else {
    exacto("cdc", 44, "CDC");
    requerido("iNatRec", "Naturaleza del receptor (iNatRec)");
    requerido("iTiOpe", "Tipo de operación (iTiOpe)");
    requerido("cPaisRec", "País del receptor (cPaisRec)");
    requerido("iTiContRec", "Tipo de contribuyente (iTiContRec)");
    requerido("dNomRec", "Nombre del receptor (dNomRec)");
    // El manual no define todas las reglas condicionales del receptor.
    // La API valida los casos especiales por naturaleza/tipo de receptor.
  }
  return errores;
}

/** Errores de Laravel: mensaje textual o mapa de campos con arrays de validación. */
export function mensajeRespuestaEvento(data: unknown, http: number): string {
  if (!data || typeof data !== "object") return "Servicio respondió HTTP " + http + ".";
  const r = data as Record<string, unknown>;
  const mensaje = r.message;
  if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
  const detalle = mensaje && typeof mensaje === "object" && !Array.isArray(mensaje) ?
    mensaje as Record<string, unknown> : r;
  const validaciones = Object.entries(detalle)
    .filter(([k]) => !["status", "message", "response"].includes(k))
    .flatMap(([k, valor]) => Array.isArray(valor)
      ? valor.map((x) => k + ": " + String(x))
      : typeof valor === "string" ? [k + ": " + valor] : []);
  return validaciones.join(" · ") || "No se pudo completar la operación (HTTP " + http + ").";
}
