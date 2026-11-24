/** Descripciones documentales de SIFEN. Los códigos 9/99 = Otro requieren texto libre.
 * Fuentes: Manual Técnico v150 E012, D209, E607, E622, E502, E504.
 * El usuario nunca debe inventar una descripción para un código estándar.
 */
export const parejasCodigoDescripcion = {
  iTiDE: { campo: "dDesTiDE", otro: "", valores: {
    "1":"Factura electrónica", "2":"Factura electrónica de exportación", "3":"Factura electrónica de importación",
    "4":"Autofactura electrónica", "5":"Nota de crédito electrónica", "6":"Nota de débito electrónica",
    "7":"Nota de remisión electrónica", "8":"Comprobante de retención electrónico",
  } },
  iTImp: { campo: "dDesTImp", otro: "", valores: {
    "1":"IVA", "2":"ISC", "3":"Renta", "4":"Ninguno", "5":"IVA – Renta",
  } },
  iTipDocAso: { campo: "dDesTipDocAso", otro: "", valores: {
    "1":"Electrónico", "2":"Impreso", "3":"Constancia Electrónica",
  } },
  iMotEmi: { campo: "dDesMotEmi", otro: "", valores: {
    "1":"Devolución y Ajuste de precios", "2":"Devolución", "3":"Descuento", "4":"Bonificación",
    "5":"Crédito incobrable", "6":"Recupero de costo", "7":"Recupero de gasto", "8":"Ajuste de precio",
  } },
  iCondOpe: { campo: "dDCondOpe", otro: "", valores: {"1":"Contado", "2":"Crédito"} },
  iTipTrans: { campo: "dDesTipTrans", otro: "", valores: {"1":"Propio", "2":"Tercero"} },
  iModTrans: { campo: "dDesModTrans", otro: "", valores: {"1":"Terrestre", "2":"Fluvial", "3":"Aéreo", "4":"Multimodal"} },
  iTipIDTrans: { campo: "dDTipIDTrans", otro: "", valores: {
    "1":"Cédula paraguaya", "2":"Pasaporte", "3":"Cédula extranjera", "4":"Carnet de residencia",
  } },
  iIndPres: { campo: "dDesIndPres", otro: "9", valores: {
    "1": "Operación presencial", "2": "Operación electrónica", "3": "Operación telemarketing",
    "4": "Venta a domicilio", "5": "Operación bancaria", "6": "Operación cíclica",
  } },
  iTipIDRec: { campo: "dDTipIDRec", otro: "9", valores: {
    "1": "Cédula paraguaya", "2": "Pasaporte", "3": "Cédula extranjera",
    "4": "Carnet de residencia", "5": "Innominado", "6": "Tarjeta Diplomática de exoneración fiscal",
  } },
  iTiPago: { campo: "dDesTiPag", otro: "99", valores: {
    "1":"Efectivo", "2":"Cheque", "3":"Tarjeta de crédito", "4":"Tarjeta de débito",
    "5":"Transferencia", "6":"Giro", "7":"Billetera electrónica", "8":"Tarjeta empresarial",
    "9":"Vale", "10":"Retención", "11":"Pago por anticipo", "12":"Valor fiscal",
    "13":"Valor comercial", "14":"Compensación", "15":"Permuta", "16":"Pago bancario",
    "17":"Pago Móvil", "18":"Donación", "19":"Promoción", "20":"Consumo Interno",
    "21":"Pago Electrónico",
  } },
  iDenTarj: { campo: "dDesDenTarj", otro: "99", valores: {
    "1":"Visa", "2":"Mastercard", "3":"American Express", "4":"Maestro",
    "5":"Panal", "6":"Cabal",
  } },
  iMotEmiNR: { campo: "dDesMotEmiNR", otro: "99", valores: {
    "1":"Traslado por ventas", "2":"Traslado por consignación", "3":"Exportación",
    "4":"Traslado por compra", "5":"Importación", "6":"Traslado por devolución",
    "7":"Traslado entre locales de la empresa", "8":"Traslado de bienes por transformación",
    "9":"Traslado de bienes por reparación", "10":"Traslado por emisor móvil",
    "11":"Exhibición o Demostración", "12":"Participación en ferias",
    "13":"Traslado de encomienda", "14":"Decomiso",
  } },
  iRespEmiNR: { campo: "dDesRespEmiNR", otro: "", valores: {
    "1":"Emisor de la factura", "2":"Poseedor de la factura y bienes",
    "3":"Empresa transportista", "4":"Despachante de Aduanas",
    "5":"Agente de transporte o intermediario",
  } },
} as const;

export type CampoConDescripcion = keyof typeof parejasCodigoDescripcion;
export function parDescripcion(codigo: string) {
  return (parejasCodigoDescripcion as Record<string, {campo: string; otro: string; valores: Record<string,string>}>)[codigo];
}
/** Actualización localizada: nunca altera otros datos del receptor ni del producto. */
export function cambiarCodigoYDescripcion(padre: Record<string, unknown>, codigo: string, valor: string) {
  const regla = parDescripcion(codigo);
  if (!regla) return;
  if (valor && valor === regla.otro) { padre[regla.campo] = ""; return; }
  const descripcion = regla.valores[valor];
  if (descripcion) padre[regla.campo] = descripcion;
  else delete padre[regla.campo];
}
