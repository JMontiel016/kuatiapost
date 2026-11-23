/** Evento de cancelación: campos GDE006, GEC001-GEC003 del Manual SIFEN v150.
 * Genera un JSON de trabajo para un API intermedio; NO genera, firma ni envía XML SIFEN.
 */
export const razonesSugeridas = [
  { id: "datos", etiqueta: "Error en los datos del documento", texto: "Se solicita la cancelación por un error en los datos del documento electrónico." },
  { id: "mercaderia", etiqueta: "La mercadería no fue entregada", texto: "Se solicita la cancelación porque la mercadería no fue entregada al receptor." },
  { id: "servicio", etiqueta: "El servicio no fue realizado", texto: "Se solicita la cancelación porque el servicio documentado no fue realizado." },
  { id: "otro", etiqueta: "Otro (describir manualmente)", texto: "" },
] as const;

export type EstadoEvento = "borrador" | "aprobado" | "rechazado" | "incierto";
export type FormCancelacion = { cdc: string; opcion: string; motivoManual: string; url: string; json: string };
export const formularioInicial: FormCancelacion = { cdc: "", opcion: "", motivoManual: "", url: "", json: "" };

export function motivoFinal(form: FormCancelacion): string {
  const elegido = razonesSugeridas.find((r) => r.id === form.opcion);
  return (elegido && elegido.id !== "otro" ? elegido.texto : form.motivoManual).trim();
}
export function validarDatosCancelacion(cdc: string, motivo: string): string[] {
  const problemas: string[] = [];
  if (!/^\d{44}$/.test(cdc)) problemas.push("El CDC debe contener exactamente 44 dígitos numéricos.");
  if (motivo.length < 5 || motivo.length > 500) problemas.push("El motivo debe tener entre 5 y 500 caracteres (GEC003).");
  if (/^(otros?|otras?)$/i.test(motivo)) problemas.push("Detallá el motivo concreto, no escribas únicamente «Otro». ");
  return problemas;
}

/** Contrato editable de REFERENCIA; cada integrador debe adaptar la estructura del JSON. */
export function crearBorradorCancelacion(cdc: string, motivo: string) {
  const problemas = validarDatosCancelacion(cdc, motivo);
  if (problemas.length) throw Error(problemas.join(" "));
  return { dTiGDE: "1", rGeVeCan: { Id: cdc, mOtEve: motivo } };
}
export function validarBorradorCancelacion(texto: string, cdc: string, motivo: string): Record<string, unknown> {
  let json: any;
  try { json = JSON.parse(texto); } catch { throw Error("El JSON no tiene una sintaxis válida."); }
  if (!json || typeof json !== "object" || Array.isArray(json)) throw Error("El JSON debe contener un objeto.");
  if (JSON.stringify(json).length > 100000) throw Error("El JSON supera el tamaño permitido.");
  if (json.dTiGDE !== "1" || json.rGeVeCan?.Id !== cdc || json.rGeVeCan?.mOtEve !== motivo)
    throw Error("El CDC, el tipo de evento o el motivo del JSON no coinciden con el formulario. Volvé a preparar la solicitud.");
  const problemas = validarDatosCancelacion(cdc, motivo);
  if (problemas.length) throw Error(problemas.join(" "));
  return json;
}

/** Un HTTP 200 por sí solo no prueba aprobación. Se exige código + estado conocidos. */
export function interpretarResultado(http: number, data: unknown): { estado: EstadoEvento; texto: string } {
  const x: any = data;
  const cuerpos: any[] = [x, x?.data, x?.message, x?.resultado, x?.resultado?.data].filter(z=>z && typeof z === "object");
  const codigo = cuerpos.map(z=>String(z.codigoRespuesta ?? z.dCodRes ?? z.codigo ?? "")).find(Boolean) || "";
  const estado = cuerpos.map(z=>String(z.estadoEvento ?? z.Estado ?? z.estado ?? "").toUpperCase()).find(Boolean) || "";
  if (http >= 400 || codigo === "4003" || ["RECHAZADO", "ERROR", "FAILED", "REJECTED"].includes(estado))
    return {estado:"rechazado",texto:codigo === "4003" ? "SIFEN informó posible evento duplicado (4003). Consultá el estado original; no reenvíes automáticamente." : `Solicitud rechazada${codigo ? ` (${codigo})` : ""}. Revisá la respuesta.`};
  if (codigo === "0600" && ["APROBADO", "APPROVED", "ACEPTADO"].includes(estado))
    return {estado:"aprobado",texto:"La integración informó código 0600 y estado aprobado. Verificá la constancia del evento en SIFEN."};
  return {estado:"incierto",texto:"No hay una aprobación explícita verificable. Consultá el estado del evento antes de volver a enviarlo."};
}
