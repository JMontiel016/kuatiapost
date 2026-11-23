/**
 * KuatiaPost: importación masiva de facturas electrónicas para una sola NR.
 * Se ejecuta en el navegador; no transmite archivos ni crea un DTE fiscal.
 * Las reglas externas (aprobación SIFEN, firma, XSD) se validan en el emisor.
 */
import { crearPlantilla } from "./plantillas-documentos";
import { paises } from "./catalogo-paises";

export interface LineaFactura {
  indice: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  unidadDescripcion?: string;
  cantidad: string;
  /** Precio de la factura: referencia visual. No se traslada a la NR. */
  precioUnitario?: string;
  /** Importe de la factura: referencia visual, nunca subtotal de la NR. */
  totalReferencia?: string;
}

export interface FacturaOrigen {
  archivo: string;
  cdc: string;
  receptor: Record<string, string>;
  emisor: { ruc: string; dv: string };
  timbrado: { establecimiento: string; punto: string; numero: string };
  lineas: LineaFactura[];
}

/** Dígito verificador del CDC: módulo 11, factores 2 a 11 desde la derecha. */
export function calcularDVCDC(primeros43: string): string {
  if (!/^\d{43}$/.test(primeros43)) throw Error("El CDC debe contener 43 dígitos antes de su DV.");
  let suma = 0;
  for (let i = 0; i < 43; i++) {
    suma += Number(primeros43[42 - i]) * (2 + (i % 10));
  }
  const resto = suma % 11;
  return String(resto > 1 ? 11 - resto : 0);
}

export function validarCDC(cdc: string): void {
  if (!/^\d{44}$/.test(cdc)) throw Error("CDC inválido: se requieren exactamente 44 dígitos.");
  if (cdc.slice(0, 2) !== "01") throw Error("El CDC debe corresponder a una Factura Electrónica (prefijo 01).");
  if (calcularDVCDC(cdc.slice(0, 43)) !== cdc[43]) throw Error("El dígito verificador del CDC no es correcto (módulo 11).");
  const fecha = cdc.slice(25, 33);
  const iso = `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}`;
  const test = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(test.getTime()) || test.toISOString().slice(0, 10) !== iso) {
    throw Error("La fecha codificada dentro del CDC es inválida.");
  }
}

function hijo(padre: Element | null, nombre: string): Element | null {
  if (!padre) return null;
  return Array.from(padre.children).find(el => el.localName === nombre) || null;
}
function ruta(padre: Element | null, camino: string): Element | null {
  return camino.split("/").reduce<Element | null>((p, nombre) => hijo(p, nombre), padre);
}
function valor(padre: Element | null, camino: string): string {
  return ruta(padre, camino)?.textContent?.trim() || "";
}
function nodos(padre: Element, nombre: string): Element[] {
  return Array.from(padre.getElementsByTagName("*")).filter(el => el.localName === nombre);
}
function normalizarIdentidad(cadena: string): string {
  return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}
function leerArchivoXML(texto: string): Document {
  let entrada = texto.replace(/^\uFEFF/, "").trim();
  if (entrada.startsWith("{")) {
    try {
      const json = JSON.parse(entrada);
      const posible = json?.xml ?? json?.XML ?? json?.data?.xml ?? json?.contenidoXML;
      if (typeof posible === "string") entrada = posible.trim();
    } catch { /* Se mostrará error de formato más abajo. */ }
  }
  // Algunos .txt incluyen el encabezado informativo del visor de XML.
  entrada = entrada.replace(/^This XML file does not appear to have any style information associated with it\. The document tree is shown below\.\s*/i, "");
  if (!entrada.startsWith("<")) throw Error("El TXT debe contener un XML de SIFEN (o JSON con campo xml).");
  if (/<!DOCTYPE\b|<!ENTITY\b/i.test(entrada)) throw Error("El XML contiene DTD o entidades externas no permitidas.");
  if (entrada.length > 10_000_000) throw Error("XML demasiado grande (máximo 10 MB por archivo).");
  const documento = new DOMParser().parseFromString(entrada, "application/xml");
  if (nodos(documento.documentElement, "parsererror").length || documento.documentElement.localName === "parsererror") {
    throw Error("El XML no tiene una estructura válida.");
  }
  return documento;
}

/** Lee una FE (iTiDE=1) desde XML o TXT; verifica CDC y coherencia con la FE. */
export function analizarFactura(texto: string, archivo: string): FacturaOrigen {
  const doc = leerArchivoXML(texto);
  const des = nodos(doc.documentElement, "DE").concat(doc.documentElement.localName === "DE" ? [doc.documentElement] : []);
  if (des.length !== 1) throw Error("Cada archivo debe contener exactamente un documento DE de SIFEN.");
  const de = des[0];
  const cdc = (de.getAttribute("Id") || "").trim();
  validarCDC(cdc);
  if (valor(de, "gTimb/iTiDE") !== "1") throw Error("El documento XML no es una Factura Electrónica (iTiDE=1).");
  if (valor(de, "dDVId") && valor(de, "dDVId") !== cdc[43]) throw Error("dDVId del XML no coincide con el CDC.");

  const emisor = ruta(de, "gDatGralOpe/gEmis");
  const rucEmisor = valor(emisor, "dRucEm");
  const dvEmisor = valor(emisor, "dDVEmi");
  if (!/^\d{3,8}$/.test(rucEmisor) || !/^\d$/.test(dvEmisor)) {
    throw Error("El RUC o dígito verificador del emisor no está completo.");
  }
  if (rucEmisor.padStart(8, "0") !== cdc.slice(2, 10) || dvEmisor !== cdc[10]) {
    throw Error("El RUC/DV del emisor no coincide con los datos codificados en el CDC.");
  }
  const timbrado = {
    establecimiento: valor(de, "gTimb/dEst"),
    punto: valor(de, "gTimb/dPunExp"),
    numero: valor(de, "gTimb/dNumDoc"),
  };
  for (const [nombre, contenido, offset, longitud] of [
    ["establecimiento", timbrado.establecimiento, 11, 3],
    ["punto de expedición", timbrado.punto, 14, 3],
    ["número de factura", timbrado.numero, 17, 7],
  ] as const) {
    if (!/^\d+$/.test(contenido) || contenido.length > longitud || contenido.padStart(longitud, "0") !== cdc.slice(offset, offset + longitud)) {
      throw Error(`El ${nombre} del XML no corresponde al CDC.`);
    }
  }
  const fecha = valor(de, "gDatGralOpe/dFeEmiDE").slice(0, 10).replace(/-/g, "");
  if (fecha && fecha !== cdc.slice(25, 33)) throw Error("La fecha de emisión del XML no coincide con el CDC.");
  const tipoContribuyente = valor(emisor, "iTipCont");
  if (tipoContribuyente && tipoContribuyente !== cdc[24]) throw Error("El tipo de contribuyente del XML no corresponde al CDC.");
  const tipoEmision = valor(de, "gOpeDE/iTipEmi");
  if (tipoEmision && tipoEmision !== cdc[33]) throw Error("El tipo de emisión del XML no corresponde al CDC.");

  const receptorNodo = ruta(de, "gDatGralOpe/gDatRec");
  if (!receptorNodo) throw Error("No se encuentra el grupo de datos del cliente (gDatRec).");
  const receptor: Record<string, string> = {};
  for (const n of Array.from(receptorNodo.children)) {
    if (!n.children.length) receptor[n.localName] = n.textContent?.trim() || "";
  }
  if (!receptor.dNomRec || !(receptor.dRucRec || receptor.dNumIDRec)) {
    throw Error("La factura no identifica al cliente con nombre y RUC o documento.");
  }
  const lineas: LineaFactura[] = nodos(de, "gCamItem").map((item, indice) => ({
    indice: indice + 1,
    codigo: valor(item, "dCodInt"),
    descripcion: valor(item, "dDesProSer"),
    unidad: valor(item, "cUniMed"),
    unidadDescripcion: valor(item, "dDesUniMed"),
    cantidad: valor(item, "dCantProSer"),
    precioUnitario: valor(item, "gValorItem/dPUniProSer"),
    totalReferencia: valor(item, "gValorItem/gValorRestaItem/dTotOpeItem") || valor(item, "gValorItem/dTotBruOpeItem"),
  }));
  if (!lineas.length) throw Error("La factura no contiene ítems para trasladar.");
  lineas.forEach(linea => {
    if (!linea.descripcion || !linea.unidad || !/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(linea.cantidad) || !/[1-9]/.test(linea.cantidad)) {
      throw Error(`Ítem ${linea.indice}: descripción, unidad o cantidad inválida (máximo 8 decimales).`);
    }
  });
  return { archivo, cdc, receptor, emisor: { ruc: rucEmisor, dv: dvEmisor }, timbrado, lineas };
}

// Solo datos del cliente: nunca cotejamos productos, importes ni subtotales.
const camposReceptor = [
  "iNatRec", "iTiOpe", "cPaisRec", "iTiContRec", "dRucRec", "dDVRec", "iTipIDRec",
  "dDTipIDRec", "dNumIDRec", "dNomRec", "dDirRec", "dNumCasRec", "cDepRec", "cDisRec",
  "cCiuRec", "dTelRec", "dCelRec", "dEmailRec",
];
const identidadObligatoria = new Set(["dRucRec", "dDVRec", "iNatRec", "dNumIDRec", "iTipIDRec", "dNomRec"]);
export function compararFacturas(principal: FacturaOrigen, otra: FacturaOrigen): string[] {
  const errores: string[] = [];
  if (principal.emisor.ruc !== otra.emisor.ruc || principal.emisor.dv !== otra.emisor.dv) {
    errores.push("Emisor distinto: no se deben agrupar facturas de diferentes RUC emisores.");
  }
  for (const campo of camposReceptor) {
    const a = normalizarIdentidad(principal.receptor[campo] || "");
    const b = normalizarIdentidad(otra.receptor[campo] || "");
    // La falta de un dato opcional no identifica a otro cliente. Si ambos lo informan, deben coincidir.
    if (a !== b && (identidadObligatoria.has(campo) || (a !== "" && b !== ""))) {
      errores.push(`Cliente distinto en ${campo}: principal «${principal.receptor[campo] || "sin dato"}», archivo «${otra.receptor[campo] || "sin dato"}».`);
    }
  }
  return errores;
}

export interface CantidadSeleccionada { activo: boolean; cantidad: string }
export type SeleccionLineas = Record<string, CantidadSeleccionada>;
export function claveLinea(factura: FacturaOrigen, indice: number): string { return `${factura.cdc}:${indice}`; }

export interface DatosNR {
  establecimiento: string; punto: string; numero: string; fecha: string;
  motivo: string; descripcionMotivo: string; responsableEmision: string; km: string;
  tipoTransporte: string; modalidad: string; responsableFlete: string;
  inicioTraslado: string; finTraslado: string; paisDestino: string; descripcionPais: string;
  manifiesto: string; despachoImportacion: string; incoterm: string;
  naturalezaTransportista: string; nombreTransportista: string; rucTransportista: string;
  dvTransportista: string; tipoIdTransportista: string; numeroIdTransportista: string;
  nombreChofer: string; documentoChofer: string; domicilioTransportista: string; direccionChofer: string;
  nacionalidadTransportista: string; descripcionNacionalidad: string; agenteNombre: string; agenteRuc: string; agenteDV: string; agenteDireccion: string;
  tipoVehiculo: string; marcaVehiculo: string; tipoIdentificacionVehiculo: string;
  identificacionVehiculo: string; matriculaVehiculo: string; vuelo: string; datosVehiculo: string;
  salidaDireccion: string; salidaNumero: string; salidaComplemento1: string; salidaComplemento2: string;
  salidaDepartamento: string; salidaDepartamentoDesc: string; salidaDistrito: string; salidaDistritoDesc: string;
  salidaCiudad: string; salidaCiudadDesc: string; salidaTelefono: string;
  entregaDireccion: string; entregaNumero: string; entregaComplemento1: string; entregaComplemento2: string;
  entregaDepartamento: string; entregaDepartamentoDesc: string; entregaDistrito: string; entregaDistritoDesc: string;
  entregaCiudad: string; entregaCiudadDesc: string; entregaTelefono: string;
  clienteDireccion: string; clienteTelefono: string; clienteEmail: string;
  infoEmisor: string; infoFisco: string;
}
export const catalogosNR = {
  motivo: {
    "1": "Traslado por ventas", "2": "Traslado por consignación", "3": "Exportación", "4": "Traslado por compra",
    "5": "Importación", "6": "Traslado por devolución", "7": "Traslado entre locales de la empresa",
    "8": "Traslado de bienes por transformación", "9": "Traslado de bienes por reparación",
    "10": "Traslado por emisor móvil", "11": "Exhibición o demostración", "12": "Participación en ferias",
    "13": "Traslado de encomienda", "14": "Decomiso", "99": "Otro",
  },
  emision: {
    "1": "Emisor de la factura", "2": "Poseedor de la factura y bienes", "3": "Empresa transportista",
    "4": "Despachante de Aduanas", "5": "Agente de transporte o intermediario",
  },
  transporte: { "1": "Propio", "2": "Tercero" },
  modalidad: { "1": "Terrestre", "2": "Fluvial", "3": "Aéreo", "4": "Multimodal" },
  flete: { "1": "Emisor de la factura", "2": "Receptor de la factura", "3": "Tercero", "4": "Agente intermediario", "5": "Transporte propio" },
  naturaleza: { "1": "Contribuyente", "2": "No contribuyente" },
  identificacion: { "1": "Número de identificación", "2": "Matrícula / chapa" },
  documento: { "1": "Cédula paraguaya", "2": "Pasaporte", "3": "Cédula extranjera", "4": "Carnet de residencia" },
} as const;

/** Los valores del formulario son del documento NUEVO, nunca del emisor de las facturas. */
export function crearDatosNR(fecha: string): DatosNR {
  return {
    establecimiento: "", punto: "", numero: "", fecha, motivo: "1", descripcionMotivo: "", responsableEmision: "1", km: "",
    tipoTransporte: "1", modalidad: "1", responsableFlete: "1", inicioTraslado: "", finTraslado: "",
    paisDestino: "", descripcionPais: "", manifiesto: "", despachoImportacion: "", incoterm: "",
    naturalezaTransportista: "", nombreTransportista: "", rucTransportista: "", dvTransportista: "",
    tipoIdTransportista: "", numeroIdTransportista: "", nombreChofer: "", documentoChofer: "",
    domicilioTransportista: "", direccionChofer: "",
    nacionalidadTransportista: "", descripcionNacionalidad: "", agenteNombre: "", agenteRuc: "", agenteDV: "", agenteDireccion: "",
    tipoVehiculo: "", marcaVehiculo: "",
    tipoIdentificacionVehiculo: "2", identificacionVehiculo: "", matriculaVehiculo: "", vuelo: "", datosVehiculo: "",
    salidaDireccion: "", salidaNumero: "0", salidaComplemento1: "", salidaComplemento2: "",
    salidaDepartamento: "", salidaDepartamentoDesc: "", salidaDistrito: "", salidaDistritoDesc: "",
    salidaCiudad: "", salidaCiudadDesc: "", salidaTelefono: "",
    entregaDireccion: "", entregaNumero: "0", entregaComplemento1: "", entregaComplemento2: "",
    entregaDepartamento: "", entregaDepartamentoDesc: "", entregaDistrito: "", entregaDistritoDesc: "",
    entregaCiudad: "", entregaCiudadDesc: "", entregaTelefono: "",
    clienteDireccion: "", clienteTelefono: "", clienteEmail: "", infoEmisor: "", infoFisco: "",
  };
}

/** Al cambiar una opción se limpian los datos de subcampos que ya no aplican. */
export function actualizarDatoNR(previo: DatosNR, campo: keyof DatosNR, valor: string): DatosNR {
  const next: DatosNR = { ...previo, [campo]: valor };
  if (campo === "motivo") {
    if (valor !== "99") next.descripcionMotivo = "";
    if (valor !== "5") next.despachoImportacion = "";
  }
  if (campo === "naturalezaTransportista") {
    if (valor === "1") { next.tipoIdTransportista = ""; next.numeroIdTransportista = ""; }
    if (valor === "2") { next.rucTransportista = ""; next.dvTransportista = ""; }
  }
  if (campo === "tipoIdentificacionVehiculo") {
    if (valor === "1") next.matriculaVehiculo = "";
    if (valor === "2") next.identificacionVehiculo = "";
  }
  if (campo === "modalidad" && valor !== "3") next.vuelo = "";
  if (campo === "paisDestino" && !valor) next.descripcionPais = "";
  if (campo === "nacionalidadTransportista" && !valor) next.descripcionNacionalidad = "";
  if (campo === "motivo" && !["3", "5"].includes(valor)) next.incoterm = "";
  if (campo === "salidaDistrito" && !valor) next.salidaDistritoDesc = "";
  if (campo === "entregaDistrito" && !valor) next.entregaDistritoDesc = "";
  return next;
}

const numeros = (s: string, min: number, max: number) => new RegExp(`^\\d{${min},${max}}$`).test(s);
const descripcionValida = (s: string, min: number, max: number) => s.trim().length >= min && s.trim().length <= max;
function texto(v: string) { return String(v || "").trim(); }
function datosOpcionales(datos: Record<string, string>) {
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== ""));
}
/** Validación de datos de UI; distingue requisitos de SIFEN y campos opcionales sin exigir los vacíos. */
export function revisarCamposNR(input: DatosNR, principal?: FacturaOrigen): string[] {
  const d = { ...crearDatosNR(input.fecha || ""), ...input };
  const fallos: string[] = [];
  const falta = (condicion: boolean, nombre: string, mensaje = "es obligatorio") => { if (condicion) fallos.push(`${nombre}: ${mensaje}.`); };
  const longitud = (valor: string, min: number, max: number, nombre: string) => {
    if (texto(valor) && !descripcionValida(valor, min, max)) fallos.push(`${nombre}: ingresá entre ${min} y ${max} caracteres.`);
  };
  for (const [nombre, valor, n] of [["Establecimiento", d.establecimiento,3],["Punto de expedición",d.punto,3],["Número de la NR",d.numero,7]] as const)
    falta(!new RegExp(`^\\d{${n}}$`).test(valor), nombre, `debe tener ${n} dígitos`);
  const fechaEmisionValida = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(d.fecha) && (() => {
    const [f, hora] = d.fecha.split("T"), [hh, mm, ss] = hora.split(":").map(Number);
    const parsed = new Date(`${f}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === f && hh <= 23 && mm <= 59 && ss <= 59;
  })();
  falta(!fechaEmisionValida, "Fecha de emisión", "fecha/hora inválida");
  falta(!(d.motivo in catalogosNR.motivo), "Motivo de traslado", "elegí un motivo válido");
  if (d.motivo === "99") {
    falta(!descripcionValida(d.descripcionMotivo, 5, 60) || /^otros?$/i.test(d.descripcionMotivo.trim()), "Motivo personalizado (99 · Otro)", "explicá el motivo en 5 a 60 caracteres; no alcanza con escribir Otro");
  }
  falta(!(d.responsableEmision in catalogosNR.emision), "Responsable de emisión", "elegí un valor válido");
  if (d.km) falta(!numeros(d.km,1,5) || Number(d.km) < 1, "Distancia estimada", "entre 1 y 99.999 km, o dejá vacío");
  falta(!(d.tipoTransporte in catalogosNR.transporte), "Tipo de transporte", "seleccioná propio o tercero");
  falta(!(d.modalidad in catalogosNR.modalidad), "Modalidad", "seleccioná una modalidad válida");
  falta(!(d.responsableFlete in catalogosNR.flete), "Responsable del flete", "elegí un valor válido");
  const esFecha = (valor: string) => /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) && new Date(`${valor}T00:00:00Z`).toISOString().slice(0,10) === valor;
  falta(!esFecha(d.inicioTraslado), "Inicio del traslado", "indicá una fecha válida");
  falta(!esFecha(d.finTraslado), "Fin del traslado", "indicá una fecha válida");
  if (esFecha(d.inicioTraslado) && esFecha(d.finTraslado)) falta(d.finTraslado < d.inicioTraslado,"Fechas del traslado", "el fin no puede ser anterior al inicio");
  if (d.motivo === "5") falta(!/^.{16}$/.test(d.despachoImportacion.trim()), "Despacho de importación", "informá exactamente 16 caracteres");
  if (d.manifiesto) longitud(d.manifiesto,1,15,"Manifiesto o carta de porte");
  if (d.incoterm) falta(!/^[A-Z]{3}$/.test(d.incoterm), "Incoterm", "si se informa debe tener tres letras mayúsculas");
  for (const [codigo,etiqueta] of [[d.paisDestino,"País de destino"],[d.nacionalidadTransportista,"Nacionalidad del transportista"]]) {
    if (codigo && !paises.some(p => p.codigo === codigo)) fallos.push(`${etiqueta}: seleccioná un país válido del catálogo ISO-3.`);
  }
  if (d.paisDestino) {
    falta(!/^[A-Z]{3}$/.test(d.paisDestino), "País de destino", "informá código ISO de 3 letras");
    falta(!descripcionValida(d.descripcionPais,4,30), "Descripción del país", "si indicás país, informá su nombre entre 4 y 30 caracteres");
  }
  // Manual técnico E980: grupo del transportista opcional cuando E903=1 y E967=1.
  // En cualquier otro caso se exige el grupo. Si se completa parcialmente, se exige completo.
  const datosTransportista = [d.naturalezaTransportista,d.nombreTransportista,d.rucTransportista,d.dvTransportista,
    d.tipoIdTransportista,d.numeroIdTransportista,d.nombreChofer,d.documentoChofer];
  const seInformoTransportista = datosTransportista.some(Boolean);
  const exentoTransportista = d.modalidad === "1" && d.tipoIdentificacionVehiculo === "1";
  const exigeTransportista = !exentoTransportista || seInformoTransportista;
  if (exigeTransportista) {
    falta(!(d.naturalezaTransportista in catalogosNR.naturaleza), "Naturaleza del transportista", "seleccioná contribuyente o no contribuyente");
    falta(!descripcionValida(d.nombreTransportista,4,60), "Nombre / razón social del transportista", "entre 4 y 60 caracteres");
    if (d.naturalezaTransportista === "1") {
      falta(!numeros(d.rucTransportista,3,8), "RUC del transportista", "de 3 a 8 dígitos");
      falta(!/^\d$/.test(d.dvTransportista), "DV del transportista", "un dígito");
    }
    if (d.naturalezaTransportista === "2") {
      falta(!(d.tipoIdTransportista in catalogosNR.documento), "Tipo de documento del transportista", "seleccioná la identificación");
      falta(!descripcionValida(d.numeroIdTransportista,1,20), "Número de documento del transportista", "de 1 a 20 caracteres");
    }
    falta(!descripcionValida(d.nombreChofer,4,60), "Nombre del conductor", "entre 4 y 60 caracteres");
    falta(!descripcionValida(d.documentoChofer,1,20), "Documento del conductor", "entre 1 y 20 caracteres");
  }
  if (d.nacionalidadTransportista) {
    falta(!/^[A-Z]{3}$/.test(d.nacionalidadTransportista), "Código de nacionalidad", "informá 3 letras del catálogo");
    falta(!descripcionValida(d.descripcionNacionalidad, 4,30), "Nacionalidad", "si informás el código, escribí la descripción de 4 a 30 caracteres");
  }
  // E994-E997 se informan en casos especiales; al informar un agente,
  // se solicita su identificación completa para no generar un registro ambiguo.
  const agenteInformado = [d.agenteNombre,d.agenteRuc,d.agenteDV,d.agenteDireccion].some(x=>!!x.trim());
  if (agenteInformado || d.responsableFlete === "4") {
    falta(!descripcionValida(d.agenteNombre,4,60), "Agente / intermediario", "informá nombre o razón social (4-60 caracteres)");
    falta(!numeros(d.agenteRuc,3,8), "RUC del agente", "informá de 3 a 8 dígitos");
    falta(!/^\d$/.test(d.agenteDV), "DV del agente", "informá un dígito");
    falta(!descripcionValida(d.agenteDireccion,1,255), "Dirección del agente", "informá su dirección");
  }
  longitud(d.agenteNombre,4,60,"Nombre del agente");
  longitud(d.agenteDireccion,1,255,"Dirección del agente");
  if (d.agenteRuc || d.agenteDV) {
    falta(!numeros(d.agenteRuc,3,8), "RUC del agente", "3 a 8 dígitos");
    falta(!/^\d$/.test(d.agenteDV), "DV del agente", "un dígito");
  }
  longitud(d.datosVehiculo,1,20,"Información adicional del vehículo");
  longitud(d.domicilioTransportista,1,150,"Domicilio del transportista");
  longitud(d.direccionChofer,1,255,"Dirección del conductor");
  falta(!descripcionValida(d.tipoVehiculo,4,10), "Tipo de vehículo", "entre 4 y 10 caracteres");
  falta(!descripcionValida(d.marcaVehiculo,1,10), "Marca del vehículo", "entre 1 y 10 caracteres");
  falta(!(d.tipoIdentificacionVehiculo in catalogosNR.identificacion), "Identificación del vehículo", "seleccioná el tipo");
  if (d.tipoIdentificacionVehiculo === "1") longitud(d.identificacionVehiculo,1,20,"Identificación del vehículo");
  if (d.tipoIdentificacionVehiculo === "1") falta(!descripcionValida(d.identificacionVehiculo,1,20), "Identificación del vehículo", "informá el número de 1 a 20 caracteres");
  if (d.tipoIdentificacionVehiculo === "2") falta(!/^\S{6}$/.test(d.matriculaVehiculo), "Matrícula / chapa", "informá exactamente 6 caracteres");
  if (d.modalidad === "3") falta(!/^\S{6}$/.test(d.vuelo), "Número de vuelo", "en modalidad aérea deben ser 6 caracteres");
  for (const [lugar, prefijo] of [["Salida", "salida"],["Entrega", "entrega"]] as const) {
    const local = (s: string) => d[`${prefijo}${s}` as keyof DatosNR];
    falta(!descripcionValida(local("Direccion"),1,255), `Dirección de ${lugar.toLowerCase()}`, "informá la calle principal");
    falta(!numeros(local("Numero"),1,6), `Número de casa (${lugar.toLowerCase()})`, "de 1 a 6 dígitos; usá 0 si no tiene");
    falta(!numeros(local("Departamento"),1,2), `Código de departamento (${lugar.toLowerCase()})`, "de 1 a 2 dígitos");
    falta(!descripcionValida(local("DepartamentoDesc"),6,16), `Departamento (${lugar.toLowerCase()})`, "informá la descripción de 6 a 16 caracteres");
    falta(!numeros(local("Ciudad"),1,5), `Código de ciudad (${lugar.toLowerCase()})`, "de 1 a 5 dígitos");
    falta(!descripcionValida(local("CiudadDesc"),1,30), `Ciudad (${lugar.toLowerCase()})`, "informá la descripción");
    const distrito = local("Distrito"), distritoDesc = local("DistritoDesc");
    if (distrito) falta(!numeros(distrito,1,4), `Código de distrito (${lugar.toLowerCase()})`, "de 1 a 4 dígitos");
    if (distrito) falta(!descripcionValida(distritoDesc,1,30), `Distrito (${lugar.toLowerCase()})`, "si informás el código, también la descripción");
    if (!distrito && distritoDesc) fallos.push(`Distrito (${lugar.toLowerCase()}): no informes descripción sin código.`);
    longitud(local("Complemento1"),1,255,`Complemento 1 (${lugar.toLowerCase()})`);
    longitud(local("Complemento2"),1,255,`Complemento 2 (${lugar.toLowerCase()})`);
    longitud(local("Telefono"),6,15,`Teléfono (${lugar.toLowerCase()})`);
  }
  if (principal) {
    const receptor = principal.receptor;
    falta(!receptor.dNomRec || !(receptor.dRucRec || receptor.dNumIDRec), "Cliente de la factura principal", "faltan nombre y RUC/CI; no se copiará el emisor como reemplazo");
    if (receptor.iNatRec === "1") {
      falta(!receptor.dRucRec || !receptor.dDVRec, "Cliente contribuyente", "faltan el RUC o DV del receptor en la factura principal");
    }
    if (receptor.iNatRec === "2") {
      falta(!receptor.iTipIDRec || !receptor.dNumIDRec, "Cliente no contribuyente", "faltan tipo/número de documento del receptor");
    }
    if (d.motivo === "7" && (receptor.dRucRec || "") !== principal.emisor.ruc)
      fallos.push("Traslado entre locales: el RUC del cliente debe ser igual al RUC del emisor de la factura.");
  }
  longitud(d.clienteDireccion,1,255,"Dirección del cliente");
  longitud(d.clienteTelefono,1,15,"Teléfono del cliente");
  longitud(d.clienteEmail,3,80,"Correo del cliente");
  if (d.clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.clienteEmail)) fallos.push("Correo del cliente: ingresá un correo válido o dejá vacío.");
  longitud(d.infoEmisor,1,2000,"Información adicional del documento");
  longitud(d.infoFisco,1,2000,"Información de interés fiscal");
  return fallos;
}

/** Genera el borrador con el cliente de la FE principal, separando transporte del receptor. */
export function prepararNotaRemision(
  facturas: FacturaOrigen[], principalCDC: string, seleccion: SeleccionLineas,
  input: DatosNR,
): Record<string, unknown> {
  if (!facturas.length) throw Error("Importá al menos una factura válida.");
  const principal = facturas.find(f => f.cdc === principalCDC);
  if (!principal) throw Error("Elegí una factura principal válida.");
  const errores = revisarCamposNR(input, principal);
  if (errores.length) throw Error(`${errores.length} campo(s) para revisar: ${errores.join(" · ")}`);
  const doc = crearBorradorNotaRemision(facturas, principalCDC, seleccion, input);
  if (!(doc.Detalles as unknown[]).length) throw Error("Seleccioná al menos un ítem.");
  return doc;
}

/** Construye una NR editable aunque todavía falten datos del formulario. */
export function crearBorradorNotaRemision(
  facturas: FacturaOrigen[], principalCDC: string, seleccion: SeleccionLineas,
  input: DatosNR,
): Record<string, unknown> {
  const principal = facturas.find(f => f.cdc === principalCDC);
  if (facturas.length && !principal) throw Error("Elegí una factura principal válida.");
  if (new Set(facturas.map(f => f.cdc)).size !== facturas.length) throw Error("Hay CDC duplicados en la importación.");
  for (const f of facturas) {
    if (!principal) break;
    const diferencias = compararFacturas(principal, f);
    if (diferencias.length) throw Error(`${f.archivo}: ${diferencias.join(" ")}`);
  }
  const d: DatosNR = { ...crearDatosNR(input.fecha), ...input };
  const detalles: Record<string, string>[] = [];
  const referencias = new Set<string>();
  for (const factura of facturas) for (const linea of factura.lineas) {
    const eleccion = seleccion[claveLinea(factura, linea.indice)];
    if (eleccion && !eleccion.activo) continue;
    const cantidad = eleccion?.cantidad ?? linea.cantidad;
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(cantidad) || !/[1-9]/.test(cantidad)) {
      throw Error(`${factura.archivo}, línea ${linea.indice}: cantidad inválida (máximo 8 decimales).`);
    }
    const unidades = (valor: string): bigint => {
      const [entero, dec = ""] = valor.split(".");
      return BigInt(entero) * 100_000_000n + BigInt(dec.padEnd(8, "0") || "0");
    };
    if (unidades(cantidad) > unidades(linea.cantidad)) throw Error(`${factura.archivo}, línea ${linea.indice}: la cantidad supera la de origen.`);
    detalles.push(datosOpcionales({dCodInt: linea.codigo, dDesProSer: linea.descripcion, cUniMed: linea.unidad, dCantProSer: cantidad}));
    referencias.add(factura.cdc);
  }
  // Receptor viene del XML gDatRec, nunca de gEmis. Los cambios manuales se limitan a contacto/dirección.
  const receptor = Object.fromEntries(Object.entries(principal?.receptor ?? {}).filter(([k, v]) => camposReceptor.includes(k) && String(v).trim() !== ""));
  if (texto(d.clienteDireccion)) receptor.dDirRec = texto(d.clienteDireccion);
  if (texto(d.clienteTelefono)) receptor.dTelRec = texto(d.clienteTelefono);
  if (texto(d.clienteEmail)) receptor.dEmailRec = texto(d.clienteEmail);
  const doc = crearPlantilla("7") as Record<string, unknown>;
  Object.assign(doc, {
    tipOpe: "1", iTiDE: "7", dEst: d.establecimiento, dPunExp: d.punto,
    dNumDoc: d.numero, dFeEmiDE: d.fecha,
    iMotEmiNR: d.motivo, dDesMotEmiNR: d.motivo === "99" ? texto(d.descripcionMotivo) : catalogosNR.motivo[d.motivo as keyof typeof catalogosNR.motivo],
    iRespEmiNR: d.responsableEmision, dDesRespEmiNR: catalogosNR.emision[d.responsableEmision as keyof typeof catalogosNR.emision],
    ...datosOpcionales({ dKmR: d.km, dInfoEmi: d.infoEmisor, dInfoFisc: d.infoFisco }),
    ...receptor,
    Detalles: detalles,
    DocumentosAsociados: Array.from(referencias, cdc => ({ iTipDocAso: "1", dCdCDERef: cdc })),
    Transporte: [datosOpcionales({
      iTipTrans: d.tipoTransporte, dDesTipTrans: catalogosNR.transporte[d.tipoTransporte as keyof typeof catalogosNR.transporte],
      iModTrans: d.modalidad, dDesModTrans: catalogosNR.modalidad[d.modalidad as keyof typeof catalogosNR.modalidad],
      iRespFlete: d.responsableFlete,
      dIniTras: d.inicioTraslado, dFinTras: d.finTraslado,
      cPaisDest: d.paisDestino, dDesPaisDest: d.descripcionPais,
      dNuManif: d.manifiesto, dNuDespImp: d.motivo === "5" ? d.despachoImportacion : "", cCondNeg: d.incoterm,
      iNatTrans: d.naturalezaTransportista, dNomTrans: d.nombreTransportista,
      dRucTrans: d.naturalezaTransportista === "1" ? d.rucTransportista : "",
      dDVTrans: d.naturalezaTransportista === "1" ? d.dvTransportista : "",
      iTipIDTrans: d.naturalezaTransportista === "2" ? d.tipoIdTransportista : "",
      dDTipIDTrans: d.naturalezaTransportista === "2" ? catalogosNR.documento[d.tipoIdTransportista as keyof typeof catalogosNR.documento] : "",
      dNumIDTrans: d.naturalezaTransportista === "2" ? d.numeroIdTransportista : "",
      dNumIDChof: d.documentoChofer, dNomChof: d.nombreChofer,
      cNacTrans: d.nacionalidadTransportista, dDesNacTrans: d.descripcionNacionalidad,
      dNombAg: d.agenteNombre, dRucAg: d.agenteRuc, dDVAg: d.agenteDV, dDirAge: d.agenteDireccion,
      dDomFisc: d.domicilioTransportista, dDirChof: d.direccionChofer,
      dTiVehTras: d.tipoVehiculo, dMarVeh: d.marcaVehiculo, dTipIdenVeh: d.tipoIdentificacionVehiculo,
      dNroIDVeh: d.tipoIdentificacionVehiculo === "1" ? d.identificacionVehiculo : "",
      dNroMatVeh: d.tipoIdentificacionVehiculo === "2" ? d.matriculaVehiculo : "",
      dNroVuelo: d.modalidad === "3" ? d.vuelo : "", dAdicVeh: d.datosVehiculo,
    })],
    Salida: [datosOpcionales({
      dDirLocSal: d.salidaDireccion, dNumCasSal: d.salidaNumero,
      dComp1Sal: d.salidaComplemento1, dComp2Sal: d.salidaComplemento2,
      cDepSal: d.salidaDepartamento, dDesDepSal: d.salidaDepartamentoDesc,
      cDisSal: d.salidaDistrito, dDesDisSal: d.salidaDistritoDesc,
      cCiuSal: d.salidaCiudad, dDesCiuSal: d.salidaCiudadDesc, dTelSal: d.salidaTelefono,
    })],
    Entrega: [datosOpcionales({
      dDirLocEnt: d.entregaDireccion, dNumCasEnt: d.entregaNumero,
      dComp1Ent: d.entregaComplemento1, dComp2Ent: d.entregaComplemento2,
      cDepEnt: d.entregaDepartamento, dDesDepEnt: d.entregaDepartamentoDesc,
      cDisEnt: d.entregaDistrito, dDesDisEnt: d.entregaDistritoDesc,
      cCiuEnt: d.entregaCiudad, dDesCiuEnt: d.entregaCiudadDesc, dTelEnt: d.entregaTelefono,
    })],
  });
  // El documento 7 no incluye los importes de venta. Omitir claves vacías opcionales de la plantilla.
  delete doc.Subtotales;
  for (const [k, v] of Object.entries(doc)) if (v === "" || v === null || v === undefined) delete doc[k];
  return doc;
}

/** Revalida condiciones y protege la identidad del cliente y la trazabilidad de las facturas. */
export function verificarBorradorNR(
  borrador: Record<string, unknown>, facturas: FacturaOrigen[], principalCDC: string,
  seleccion: SeleccionLineas, datos: DatosNR,
): void {
  const esperado = prepararNotaRemision(facturas, principalCDC, seleccion, datos);
  if (String(borrador.iTiDE) !== "7") throw Error("La NR debe tener iTiDE=7.");
  if ("Subtotales" in borrador || "Pagos" in borrador) throw Error("La NR no contiene Subtotales ni Pagos.");
  for (const campo of ["dEst", "dPunExp", "dNumDoc", "dFeEmiDE", "iMotEmiNR", "dDesMotEmiNR", "iRespEmiNR", "dDesRespEmiNR"]) {
    if (String(borrador[campo] ?? "") !== String(esperado[campo] ?? ""))
      throw Error(`Cambió ${campo}. Modificá el valor en el formulario y volvé a preparar el borrador.`);
  }
  for (const campo of camposReceptor) {
    if (normalizarIdentidad(String(borrador[campo] || "")) !== normalizarIdentidad(String(esperado[campo] || "")))
      throw Error(`Cambió ${campo} del cliente. Revisá la factura principal o el formulario.`);
  }
  const normalizar = (valor: unknown): unknown => Array.isArray(valor) ? valor.map(normalizar) :
    valor !== null && typeof valor === "object" ? Object.fromEntries(Object.entries(valor).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, normalizar(v)])) : valor;
  for (const grupo of ["Transporte", "Salida", "Entrega"]) {
    const recibido = borrador[grupo], original = esperado[grupo];
    if (JSON.stringify(normalizar(recibido)) !== JSON.stringify(normalizar(original))) throw Error(`Cambió ${grupo}. Modificá sus campos en el formulario y volvé a preparar la NR.`);
  }
  const refs = borrador.DocumentosAsociados;
  if (!Array.isArray(refs)) throw Error("Faltan los CDC asociados a la NR.");
  const lista = refs.map((r: Record<string, string>) => {
    if (!r || r.iTipDocAso !== "1") throw Error("Cada documento asociado debe ser electrónico.");
    validarCDC(String(r.dCdCDERef || ""));
    return r.dCdCDERef;
  });
  const esperadas = (esperado.DocumentosAsociados as Array<{dCdCDERef:string}>).map(x => x.dCdCDERef);
  if (lista.length !== esperadas.length || new Set(lista).size !== lista.length || lista.some((x:string) => !esperadas.includes(x)))
    throw Error("Los CDC no coinciden con los ítems seleccionados.");
  const detalles = esperado.Detalles as Array<Record<string, string>>;
  if (!Array.isArray(borrador.Detalles) || borrador.Detalles.length !== detalles.length)
    throw Error("La cantidad de líneas del borrador no coincide con los productos seleccionados.");
  borrador.Detalles.forEach((fila: Record<string, unknown>, i: number) => {
    const original = detalles[i];
    if (!fila || ["dCodInt", "dDesProSer", "cUniMed", "dCantProSer"].some(k => String(fila[k] ?? "") !== String(original[k] ?? "")))
      throw Error(`Línea ${i + 1}: el producto o la cantidad cambió. Ajustalo desde el formulario.`);
    if (Object.keys(fila).some(k => /^(?:dPUniProSer|dTotBruOpeItem|dTotOpeItem|iAfecIVA|dTasaIVA|dLiqIVAItem|dBasGravIVA)$/.test(k)))
      throw Error(`Línea ${i + 1}: la NR no incluye importes ni IVA de venta.`);
  });
}
