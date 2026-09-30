import { errorFormato } from "./formatos-campos";
import { crearPlantilla } from "./plantillas-documentos";

/**
 * CATÁLOGO DE CAMPOS DE LOS DOCUMENTOS
 *
 * Centraliza nombres, ejemplos y condiciones de la plantilla para que la
 * pantalla y la revisión previa al envío utilicen las mismas reglas.
 *
 * Fuente: manual técnico v150, grupos C, D, E y F; ajustes de la NT 013.
 * La integración recibe JSON y puede calcular o renombrar campos del XML.
 * Por eso estas reglas NO constituyen una validación completa del XML firmado.
 */
export type EstadoCampo =
  "obligatorio" | "condicional" | "opcional" | "integracion";

export type InformacionCampo = {
  nombre: string;
  ejemplo: string;
  explicacion: string;
  estado: EstadoCampo;
  motivo: string;
  referencia: string;
  opciones?: [string, string][];
};

// Cada entrada contiene un nombre humano y un ejemplo; nunca rellena el dato.
const nombres: Record<string, [string, string]> = {
  tipOpe: ["Operación de tu integración", "Código definido por tu API"],
  iTiDE: ["Tipo de documento", "1 = factura; 5 = nota de crédito"],
  dEst: ["Establecimiento", "001"],
  dPunExp: ["Punto de expedición", "003"],
  dNumDoc: ["Número del documento", "0000001"],
  dFeEmiDE: ["Fecha y hora de emisión", "2026-09-30T00:00:00"],
  dInfoEmi: ["Información adicional del emisor", "Observación del documento"],
  dInfoFisc: ["Información fiscal adicional", "Observación fiscal"],
  iTipTra: ["Tipo de transacción", "1 = venta de mercadería"],
  iTImp: ["Tipo de impuesto", "1 = IVA"],
  cMoneOpe: ["Moneda del documento", "PYG"],
  dCondTiCam: [
    "Forma de informar el cambio de moneda",
    "1 = global; 2 = por ítem",
  ],
  dTiCam: ["Tipo de cambio global", "7000.0000"],
  dTiCamIt: ["Tipo de cambio del ítem", "7000.0000"],
  iIndPres: ["Forma de realizar la venta", "1 = presencial"],
  iNatRec: [
    "Naturaleza del receptor",
    "1 = contribuyente; 2 = no contribuyente",
  ],
  iTiOpe: ["Tipo de operación con el receptor", "1 = entre empresas"],
  cPaisRec: ["País del receptor", "PRY"],
  iTiContRec: [
    "Tipo de contribuyente receptor",
    "1 = persona física; 2 = persona jurídica",
  ],
  dRucRec: ["RUC del receptor, sin dígito verificador", "80000000"],
  dDVRec: ["Dígito verificador del RUC", "1"],
  iTipIDRec: ["Tipo de documento de identidad", "1 = cédula paraguaya"],
  dNumIDRec: ["Número del documento de identidad", "1234567"],
  dNomRec: ["Nombre o razón social del receptor", "Nombre del cliente"],
  dDirRec: ["Dirección del receptor", "Av. Principal"],
  dNumCasRec: ["Número de casa del receptor", "0 si no tiene numeración"],
  cDepRec: ["Código del departamento", "Código del catálogo documental"],
  cDisRec: ["Código del distrito", "Código del catálogo documental"],
  cCiuRec: ["Código de la ciudad", "Código del catálogo documental"],
  dTelRec: ["Teléfono del receptor", "021123456"],
  dCelRec: ["Celular del receptor", "0981123456"],
  dEmailRec: ["Correo del receptor", "cliente@ejemplo.com"],
  iCondOpe: ["Condición de la venta", "1 = contado; 2 = crédito"],
  iMotEmi: [
    "Motivo de la nota de crédito o débito",
    "Código del motivo según tipo de nota",
  ],
  iTipDocAso: ["Tipo de documento asociado", "1 = electrónico; 2 = impreso"],
  dCdCDERef: [
    "CDC del documento electrónico asociado",
    "Los 44 dígitos del CDC de la factura",
  ],
  dCodInt: ["Código del producto o servicio", "PROD001"],
  dDesProSer: ["Descripción del producto o servicio", "Servicio prestado"],
  cUniMed: ["Unidad de medida", "77 = unidad"],
  dCantProSer: ["Cantidad del producto o servicio", "1.0000"],
  dPUniProSer: ["Precio unitario", "110000.00000000"],
  dTotBruOpeItem: ["Importe bruto del ítem", "110000.00000000"],
  dTotOpeItem: ["Importe final del ítem", "110000.00000000"],
  iAfecIVA: [
    "Afectación del ítem al IVA",
    "1 = gravado; 2 = exonerado; 3 = exento; 4 = parcial",
  ],
  dPropIVA: [
    "Proporción gravada por IVA",
    "100 para un ítem totalmente gravado",
  ],
  dTasaIVA: ["Tasa del IVA", "10, 5 o 0 según afectación"],
  dBasGravIVA: ["Base imponible del ítem", "100000.00000000"],
  dLiqIVAItem: ["IVA del ítem", "10000.00000000"],
  dBaseExe: ["Base exenta del ítem", "Parte exenta en un ítem con IVA parcial"],
  dSubExe: ["Subtotal exento", "0.00000000 si no hay ítems exentos"],
  dSubExo: ["Subtotal exonerado", "0.00000000 si no hay ítems exonerados"],
  dSub5: ["Subtotal con IVA del 5%", "Importe de los ítems con IVA 5%"],
  dSub10: ["Subtotal con IVA del 10%", "Importe de los ítems con IVA 10%"],
  dTotOpe: ["Total de la operación", "Suma de los importes finales"],
  dTotDesc: ["Total de descuentos por ítem", "0.00000000 si no hay descuentos"],
  dTotDescGlotem: ["Total de descuentos globales por ítem", "0.00000000"],
  dTotAntItem: ["Total de anticipos por ítem", "0.00000000"],
  dTotAnt: ["Total de anticipos globales", "0.00000000"],
  dPorcDescTotal: ["Porcentaje total de descuento", "0.00000000"],
  dDescTotal: ["Total general de descuentos", "0.00000000"],
  dAnticipo: ["Total general de anticipos", "0.00000000"],
  dRedon: ["Ajuste por redondeo", "0.0000"],
  dTotGralOpe: ["Total general del documento", "Importe final del documento"],
  dIVA5: ["Total del IVA del 5%", "0.00000000 si no corresponde"],
  dIVA10: ["Total del IVA del 10%", "0.00000000 si no corresponde"],
  dTotIVA: ["Total del IVA", "Suma del IVA 5% y 10%"],
  dBaseGrav5: ["Base imponible total del 5%", "0.00000000 si no corresponde"],
  dBaseGrav10: ["Base imponible total del 10%", "0.00000000 si no corresponde"],
  dTBasGraIVA: ["Base imponible total del IVA", "Suma de las bases imponibles"],
  dTotalGs: [
    "Total equivalente en guaraníes",
    "Total convertido cuando la moneda no es PYG",
  ],
  iTiPago: ["Forma de pago", "1 = efectivo; 5 = transferencia"],
  dMonTiPag: ["Importe de este pago", "110000.0000"],
  cMoneTiPag: ["Moneda del pago", "PYG"],
  dTiCamTiPag: ["Cambio de moneda del pago", "7000.0000"],
  iMotEmiNR: ["Motivo del traslado", "1 = traslado por venta"],
  dDesMotEmiNR: ["Descripción del motivo del traslado", "Traslado por ventas"],
  iRespEmiNR: ["Responsable de emitir la remisión", "1 = emisor de la factura"],
  dKmR: ["Kilómetros estimados del recorrido", "10"],
  dFecEm: ["Fecha de la factura asociada a la remisión", "2026-09-30"],
  iTipTrans: ["Tipo de transporte", "1 = propio; 2 = de terceros"],
  iModTrans: ["Modalidad de transporte", "1 = terrestre"],
  iRespFlete: [
    "Responsable del costo del flete",
    "Código del catálogo documental",
  ],
  dNuDespImp: ["Número del despacho de importación", "Número del despacho"],
  iNatTrans: [
    "Naturaleza del transportista",
    "1 = contribuyente; 2 = no contribuyente",
  ],
  dNomTrans: [
    "Nombre o razón social del transportista",
    "Nombre del transportista",
  ],
  dRucTrans: ["RUC del transportista", "80000000"],
  dDVTrans: ["Dígito verificador del transportista", "1"],
  iTipIDTrans: ["Tipo de identidad del transportista", "1 = cédula paraguaya"],
  dNumIDTrans: ["Número de identidad del transportista", "1234567"],
  dNomChof: ["Nombre del conductor", "Nombre y apellido"],
  dNumIDChof: ["Número de identidad del conductor", "1234567"],
  dDirLocSal: ["Dirección de salida", "Calle de salida"],
  dNumCasSal: ["Número de casa de salida", "0 si no tiene numeración"],
  cDepSal: ["Departamento de salida", "Código del catálogo documental"],
  cDisSal: ["Distrito de salida", "Código del catálogo documental"],
  cCiuSal: ["Ciudad de salida", "Código del catálogo documental"],
  dDirLocEnt: ["Dirección de entrega", "Calle de entrega"],
  dNumCasEnt: ["Número de casa de entrega", "0 si no tiene numeración"],
  cDepEnt: ["Departamento de entrega", "Código del catálogo documental"],
  cDisEnt: ["Distrito de entrega", "Código del catálogo documental"],
  cCiuEnt: ["Ciudad de entrega", "Código del catálogo documental"],
  iNatVen: [
    "Naturaleza del vendedor de la autofactura",
    "1 = no contribuyente; 2 = extranjero",
  ],
  iTipIDVen: ["Tipo de identidad del vendedor", "1 = cédula paraguaya"],
  dNumIDVen: ["Número de identidad del vendedor", "1234567"],
  dNomVen: ["Nombre del vendedor", "Nombre y apellido"],
  dDirVen: ["Dirección del vendedor", "Calle del vendedor"],
  dNumCasVen: ["Número de casa del vendedor", "0 si no tiene numeración"],
  cDepVen: ["Departamento del vendedor", "Código del catálogo documental"],
  cDisVen: ["Distrito del vendedor", "Código del catálogo documental"],
  cCiuVen: ["Ciudad del vendedor", "Código del catálogo documental"],
  dDirProv: [
    "Dirección donde se realiza la transacción",
    "Dirección de entrega del producto o servicio",
  ],
  cDepProv: [
    "Departamento de la transacción",
    "Código del catálogo documental",
  ],
  cDisProv: ["Distrito de la transacción", "Código del catálogo documental"],
  cCiuProv: ["Ciudad de la transacción", "Código del catálogo documental"],
};

const opciones: Record<string, [string, string][]> = {
  // Códigos cerrados del manual v150: D011, D208, E011, E304, E401,
  // E501, E503, E606, E901–E905, E981–E985 y tabla 5 de unidades.
  iTipTra: [
    ["1", "Venta de mercadería"],
    ["2", "Prestación de servicios"],
    ["3", "Mixto: mercadería y servicios"],
    ["4", "Venta de activo fijo"],
    ["5", "Venta de divisas"],
    ["6", "Compra de divisas"],
    ["7", "Promoción o entrega de muestras"],
    ["8", "Donación"],
    ["9", "Anticipo"],
    ["10", "Compra de productos"],
    ["11", "Compra de servicios"],
    ["12", "Venta de crédito fiscal"],
    ["13", "Muestras médicas"],
  ],
  iIndPres: [
    ["1", "Operación presencial"],
    ["2", "Operación electrónica"],
    ["3", "Telemarketing"],
    ["4", "Venta a domicilio"],
    ["5", "Operación bancaria"],
    ["6", "Operación cíclica"],
    ["9", "Otro"],
  ],
  iTipIDRec: [
    ["1", "Cédula paraguaya"],
    ["2", "Pasaporte"],
    ["3", "Cédula extranjera"],
    ["4", "Carnet de residencia"],
    ["5", "Innominado"],
    ["6", "Tarjeta diplomática de exoneración fiscal"],
    ["9", "Otro"],
  ],
  iMotEmi: [
    ["1", "Devolución y ajuste de precios"],
    ["2", "Devolución"],
    ["3", "Descuento"],
    ["4", "Bonificación"],
    ["5", "Crédito incobrable"],
    ["6", "Recupero de costo"],
    ["7", "Recupero de gasto"],
    ["8", "Ajuste de precio"],
  ],
  iTiPago: [
    ["1", "Efectivo"],
    ["2", "Cheque"],
    ["3", "Tarjeta de crédito"],
    ["4", "Tarjeta de débito"],
    ["5", "Transferencia"],
    ["6", "Giro"],
    ["7", "Billetera electrónica"],
    ["8", "Tarjeta empresarial"],
    ["9", "Vale"],
    ["10", "Retención"],
    ["11", "Pago por anticipo"],
    ["12", "Valor fiscal"],
    ["13", "Valor comercial"],
    ["14", "Compensación"],
    ["15", "Permuta"],
    ["16", "Pago bancario"],
    ["17", "Pago móvil"],
    ["18", "Donación"],
    ["19", "Promoción"],
    ["20", "Consumo interno"],
    ["21", "Pago electrónico"],
  ],
  iMotEmiNR: [
    ["1", "Traslado por venta"],
    ["2", "Traslado por consignación"],
    ["3", "Exportación"],
    ["4", "Traslado por compra"],
    ["5", "Importación"],
    ["6", "Traslado por devolución"],
    ["7", "Traslado entre locales de la empresa"],
    ["8", "Traslado de bienes por transformación"],
    ["9", "Traslado de bienes por reparación"],
    ["10", "Traslado por emisor móvil"],
    ["11", "Exhibición o demostración"],
    ["12", "Participación en ferias"],
    ["13", "Traslado de encomienda"],
    ["14", "Decomiso"],
    ["99", "Otro"],
  ],
  iRespEmiNR: [
    ["1", "Emisor de la factura"],
    ["2", "Poseedor de la factura y bienes"],
    ["3", "Empresa transportista"],
    ["4", "Despachante de Aduanas"],
    ["5", "Agente de transporte o intermediario"],
  ],
  iTipTrans: [
    ["1", "Propio"],
    ["2", "Tercero"],
  ],
  iModTrans: [
    ["1", "Terrestre"],
    ["2", "Fluvial"],
    ["3", "Aéreo"],
    ["4", "Multimodal"],
  ],
  iRespFlete: [
    ["1", "Emisor de la factura"],
    ["2", "Receptor de la factura"],
    ["3", "Tercero"],
    ["4", "Agente intermediario del transporte"],
    ["5", "Transporte propio"],
  ],
  iNatTrans: [
    ["1", "Contribuyente"],
    ["2", "No contribuyente"],
  ],
  iTipIDTrans: [
    ["1", "Cédula paraguaya"],
    ["2", "Pasaporte"],
    ["3", "Cédula extranjera"],
    ["4", "Carnet de residencia"],
  ],
  iNatVen: [
    ["1", "No contribuyente"],
    ["2", "Extranjero"],
  ],
  iTipIDVen: [
    ["1", "Cédula paraguaya"],
    ["2", "Pasaporte"],
    ["3", "Cédula extranjera"],
    ["4", "Carnet de residencia"],
  ],
  dTasaIVA: [
    ["5", "IVA del 5 %"],
    ["10", "IVA del 10 %"],
  ],
  cUniMed: [
    ["87", "Metros (m)"],
    ["2366", "Costo por mil (CPM)"],
    ["2329", "Unidad internacional (UI)"],
    ["110", "Metros cúbicos (M3)"],
    ["77", "Unidad (UNI)"],
    ["86", "Gramos (g)"],
    ["89", "Litros (LT)"],
    ["90", "Miligramos (MG)"],
    ["91", "Centímetros (CM)"],
    ["92", "Centímetros cuadrados (CM2)"],
    ["93", "Centímetros cúbicos (CM3)"],
    ["94", "Pulgadas (PUL)"],
    ["96", "Milímetros cuadrados (MM2)"],
    ["79", "Kilogramos por metro cuadrado (kg/m²)"],
    ["97", "Año (AA)"],
    ["98", "Mes (ME)"],
    ["99", "Tonelada (TN)"],
    ["100", "Hora (Hs)"],
    ["101", "Minuto (Mi)"],
    ["104", "Determinación (DET)"],
    ["103", "Yardas (Ya)"],
    ["108", "Metros (MT)"],
    ["109", "Metros cuadrados (M2)"],
    ["95", "Milímetros (MM)"],
    ["666", "Segundo (Se)"],
    ["102", "Día (Di)"],
    ["83", "Kilogramos (kg)"],
    ["88", "Mililitros (ML)"],
    ["625", "Kilómetros (Km)"],
    ["660", "Metro lineal (ml)"],
    ["885", "Unidad medida global (GL)"],
    ["891", "Por milaje (pm)"],
    ["869", "Hectáreas (ha)"],
    ["569", "Ración"],
    // Ampliación de unidades: NT 023, páginas 3–4.
    ["111", "Bovinas (4A)"],
    ["112", "Curie (Ci)"],
    ["113", "Docena (DOC)"],
    ["114", "Galones US: 3,7843 litros (GLL)"],
    ["115", "Gruesas (GRO)"],
    ["116", "Kilogramo bruto (E4)"],
    ["117", "Kits (KT)"],
    ["118", "Microcurie (M5)"],
    ["119", "Milicurie (MCU)"],
    ["120", "Millar (MIL)"],
    ["121", "Par (PAR)"],
    ["122", "Pies (FOT)"],
    ["123", "Pies cuadrados (FTK)"],
    ["124", "Piezas (PCE)"],
    ["125", "Quilate (KLT)"],
    ["126", "Resmas (RM)"],
    ["127", "Rollos (RO)"],
    ["128", "1000 kilowatt hora (kWh)"],
    ["129", "Mazos (U/JGO)"],
    ["130", "Tambores (DR)"],
    ["131", "Caja (BX)"],
    ["132", "Juego (SET)"],
    ["133", "Paquete (PK)"],
    ["134", "Bolsa (BG)"],
    ["135", "Docena par (DPC)"],
    ["136", "Pote (JR)"],
    ["137", "Fardos (BL)"],
    ["138", "Bulto (AB)"],
    ["139", "Cesta (BK)"],
    ["140", "Peso base (BW)"],
  ],
  iTiDE: [
    ["1", "Factura"],
    ["4", "Autofactura"],
    ["5", "Nota de crédito"],
    ["6", "Nota de débito"],
    ["7", "Nota de remisión"],
  ],
  iNatRec: [
    ["1", "Contribuyente"],
    ["2", "No contribuyente"],
  ],
  iTiOpe: [
    ["1", "Entre empresas (B2B)"],
    ["2", "Consumidor final (B2C)"],
    ["3", "Entidad pública (B2G)"],
    ["4", "Servicios al exterior (B2F)"],
  ],
  iTiContRec: [
    ["1", "Persona física"],
    ["2", "Persona jurídica"],
  ],
  iCondOpe: [
    ["1", "Contado"],
    ["2", "Crédito"],
  ],
  dCondTiCam: [
    ["1", "Cambio global"],
    ["2", "Cambio por ítem"],
  ],
  iAfecIVA: [
    ["1", "Gravado"],
    ["2", "Exonerado"],
    ["3", "Exento"],
    ["4", "Gravado parcialmente"],
  ],
  iTImp: [
    ["1", "IVA"],
    ["2", "ISC"],
    ["3", "Renta"],
    ["4", "Ninguno"],
    ["5", "IVA y Renta"],
  ],
  iTipDocAso: [
    ["1", "Electrónico"],
    ["2", "Impreso"],
    ["3", "Constancia electrónica"],
  ],
};

// Distingue vacío de cero: el valor 0 puede ser obligatorio y válido.
export const estaVacio = (valor: unknown) =>
  valor === "" || valor === null || valor === undefined;

/** Devuelve el estado actual del campo considerando los datos ya elegidos. */
export function informacionCampo(
  codigo: string,
  documento: any,
  tipo: string,
  fila: any = {},
  grupo = "",
): InformacionCampo {
  const [nombre, ejemplo] = nombres[codigo] || [
    "Campo de tu integración",
    "Según el contrato de tu API",
  ];
  // Los campos que dependen de otro valor muestran solo las opciones aplicables.
  let listaOpciones = opciones[codigo];
  if (codigo === "iTiDE")
    listaOpciones = listaOpciones.filter(([valor]) => valor === tipo);
  if (codigo === "iTiPago" && String(documento.iIndPres) !== "5")
    listaOpciones = listaOpciones.filter(([valor]) => valor !== "16");
  if (codigo === "dTasaIVA" && ["2", "3"].includes(String(fila.iAfecIVA)))
    listaOpciones = [["0", "Sin IVA: exento o exonerado"]];
  const base = {
    nombre,
    ejemplo,
    explicacion: `${nombre}. El ejemplo orienta y no se completa automáticamente.`,
    opciones: listaOpciones,
    referencia: "Manual técnico v150; plantilla de integración",
  };
  const obligatorio = (
    motivo: string,
    referencia = base.referencia,
  ): InformacionCampo => ({
    ...base,
    estado: "obligatorio",
    motivo,
    referencia,
  });
  const opcional = (motivo: string): InformacionCampo => ({
    ...base,
    estado: "opcional",
    motivo,
  });
  const condicion = (
    activo: boolean,
    conocido: boolean,
    motivo: string,
    referencia = base.referencia,
  ): InformacionCampo =>
    activo
      ? obligatorio(motivo, referencia)
      : conocido
        ? opcional(`No corresponde: ${motivo}`)
        : { ...base, estado: "condicional", motivo, referencia };
  // Numeración e identificación nunca se ocultan ni se borran al completar otra casilla.
  if (!grupo && ["tipOpe", "iTiDE", "dEst", "dPunExp", "dNumDoc", "dFeEmiDE"].includes(codigo))
    return obligatorio("Identifica la operación, el tipo y la numeración del documento.", "Manual v150, cabecera y timbrado; contrato de integración");
  if (!grupo && ["iNatRec", "iTiOpe", "cPaisRec", "dNomRec"].includes(codigo))
    return obligatorio("Identifica al receptor de este documento.", "Manual v150, grupo D2");
  const conIVA = ["1", "5"].includes(String(documento.iTImp));

  if (codigo === "iTipTra")
    return condicion(
      ["1", "4"].includes(tipo),
      true,
      "Se requiere en factura y autofactura.",
      "Manual v150, D012",
    );
  if (["iTImp", "cMoneOpe"].includes(codigo))
    return condicion(
      tipo !== "7",
      true,
      "Se informa en documentos con importes.",
      "Manual v150, D013 y D015",
    );
  if (codigo === "iIndPres")
    return condicion(
      tipo === "1",
      true,
      "Se requiere en una factura.",
      "Manual v150, E011",
    );
  if (["iTiContRec", "dRucRec", "dDVRec"].includes(codigo))
    return condicion(
      String(documento.iNatRec) === "1",
      !estaVacio(documento.iNatRec),
      "Se requiere cuando el receptor es contribuyente.",
      "Manual v150, D205–D207",
    );
  if (["iTipIDRec", "dNumIDRec"].includes(codigo))
    return condicion(
      String(documento.iNatRec) === "2" && String(documento.iTiOpe) !== "4",
      !estaVacio(documento.iNatRec) && !estaVacio(documento.iTiOpe),
      "Se requiere para un no contribuyente, salvo servicios al exterior.",
      "Manual v150, D208 y D210",
    );
  if (codigo === "dDirRec")
    return condicion(
      tipo === "7" || String(documento.iTiOpe) === "4",
      !estaVacio(documento.iTiOpe),
      "Se requiere en remisión o servicios al exterior.",
      "Manual v150, D213",
    );
  if (codigo === "dNumCasRec")
    return condicion(
      !estaVacio(documento.dDirRec),
      true,
      "Se requiere cuando se informa la dirección.",
      "Manual v150, D218",
    );
  if (["cDepRec", "cCiuRec"].includes(codigo))
    return condicion(
      !estaVacio(documento.dDirRec) && String(documento.iTiOpe) !== "4",
      true,
      "Se requiere con dirección en operaciones distintas de servicios al exterior.",
      "Manual v150, D219 y D223",
    );

  // Moneda extranjera: no informa cambio global si se eligió cambio por ítem.
  if (codigo === "dCondTiCam")
    return condicion(
      tipo !== "7" &&
        !estaVacio(documento.cMoneOpe) &&
        documento.cMoneOpe !== "PYG",
      !estaVacio(documento.cMoneOpe),
      "Se requiere cuando la moneda no es PYG.",
      "Manual v150, D017",
    );
  if (codigo === "dTiCam")
    return condicion(
      documento.cMoneOpe &&
        documento.cMoneOpe !== "PYG" &&
        String(documento.dCondTiCam) === "1",
      !estaVacio(documento.cMoneOpe) &&
        (!estaVacio(documento.dCondTiCam) || documento.cMoneOpe === "PYG"),
      "Se requiere en moneda extranjera con cambio global.",
      "Manual v150, D018",
    );
  if (codigo === "dTiCamIt")
    return condicion(
      String(documento.dCondTiCam) === "2",
      !estaVacio(documento.dCondTiCam) || documento.cMoneOpe === "PYG",
      "Se requiere si el cambio se informa por ítem.",
      "Manual v150, E725",
    );

  // Detalle de productos e importes: grupos E8 y F, ajustados por NT 013.
  if (grupo === "Detalles") {
    if (["dCodInt", "dDesProSer", "cUniMed", "dCantProSer"].includes(codigo))
      return obligatorio(
        "Se requiere para describir cada producto o servicio.",
        "Manual v150, E701–E705",
      );
    if (["dPUniProSer", "dTotBruOpeItem", "dTotOpeItem"].includes(codigo))
      return condicion(
        tipo !== "7",
        true,
        "Se requiere en documentos con importes.",
        "Manual v150, E721–EA008",
      );
    if (
      [
        "iAfecIVA",
        "dPropIVA",
        "dTasaIVA",
        "dBasGravIVA",
        "dLiqIVAItem",
      ].includes(codigo)
    )
      return condicion(
        tipo !== "7" && conIVA,
        !estaVacio(documento.iTImp) || tipo === "7",
        "Se requiere cuando el impuesto es IVA o IVA y Renta.",
        "Manual v150, E731–E736",
      );
    if (codigo === "dBaseExe")
      return condicion(
        tipo !== "7" && conIVA && String(fila.iAfecIVA) === "4",
        !estaVacio(fila.iAfecIVA) || tipo === "7",
        "Se requiere para un ítem gravado parcialmente. Alias JSON de dBasExe.",
        "NT 013, E737",
      );
  }
  if (grupo === "Subtotales") {
    if (codigo === "dTotalGs")
      return condicion(
        tipo !== "7" && documento.cMoneOpe && documento.cMoneOpe !== "PYG",
        !estaVacio(documento.cMoneOpe),
        "Se requiere al expresar en guaraníes un documento en moneda extranjera.",
        "Manual v150, F023",
      );
    const items = Array.isArray(documento.Detalles) ? documento.Detalles : [];
    // Los subtotales 0-1 solo se activan cuando hay ítems de esa categoría.
    const categoria: Record<string, boolean> = {
      dSubExe: items.some((i: any) => ["3", "4"].includes(String(i.iAfecIVA))),
      dSubExo: items.some((i: any) => String(i.iAfecIVA) === "2"),
      dSub5: items.some(
        (i: any) =>
          ["1", "4"].includes(String(i.iAfecIVA)) && String(i.dTasaIVA) === "5",
      ),
      dSub10: items.some(
        (i: any) =>
          ["1", "4"].includes(String(i.iAfecIVA)) &&
          String(i.dTasaIVA) === "10",
      ),
    };
    const categoriaDelCampo: Record<string, string> = {
      dIVA5: "dSub5",
      dIVA10: "dSub10",
      dBaseGrav5: "dSub5",
      dBaseGrav10: "dSub10",
    };
    const clave = categoriaDelCampo[codigo] || codigo;
    if (clave in categoria)
      return condicion(
        tipo !== "7" && conIVA && categoria[clave],
        !estaVacio(documento.iTImp) &&
          items.every(
            (i: any) =>
              !estaVacio(i.iAfecIVA) &&
              (!["1", "4"].includes(String(i.iAfecIVA)) ||
                !estaVacio(i.dTasaIVA)),
          ),
        "Se requiere cuando existen ítems de la categoría correspondiente.",
        "Manual v150, grupo F; NT 013",
      );
    if (["dTotIVA", "dTBasGraIVA"].includes(codigo))
      return condicion(
        tipo !== "7" && conIVA,
        !estaVacio(documento.iTImp) || tipo === "7",
        "Se informa el total de IVA o su base imponible en documentos con IVA.",
        "Manual v150, F017 y F020",
      );
    return condicion(
      tipo !== "7",
      true,
      "Se requiere en el grupo de totales de documentos con importes.",
      "Manual v150, grupo F",
    );
  }

  // Notas: motivo y referencia electrónica, sin asumir que toda referencia es CDC.
  if (codigo === "iMotEmi")
    return condicion(
      ["5", "6"].includes(tipo),
      true,
      "Se requiere en nota de crédito o débito.",
      "Manual v150, E401",
    );
  if (codigo === "iTipDocAso")
    return condicion(
      ["5", "6"].includes(tipo),
      true,
      "Elegí el tipo de documento que origina la nota.",
      "Manual v150, H002",
    );
  if (codigo === "dCdCDERef")
    return condicion(
      ["5", "6"].includes(tipo) && String(fila.iTipDocAso) === "1",
      !estaVacio(fila.iTipDocAso),
      "Se requiere si el documento asociado es electrónico.",
      "Manual v150, H004",
    );

  // Condición comercial y pagos: los pagos al contado no se exigen a crédito.
  if (codigo === "iCondOpe")
    return condicion(
      ["1", "4"].includes(tipo),
      true,
      "Se requiere para elegir contado o crédito.",
      "Manual v150, E601",
    );
  if (grupo === "Pagos") {
    if (codigo === "dTiCamTiPag")
      return condicion(
        String(documento.iCondOpe) === "1" &&
          fila.cMoneTiPag &&
          fila.cMoneTiPag !== "PYG",
        !estaVacio(documento.iCondOpe) && !estaVacio(fila.cMoneTiPag),
        "Se requiere en pagos al contado con moneda extranjera.",
        "Manual v150, E611",
      );
    return condicion(
      String(documento.iCondOpe) === "1",
      !estaVacio(documento.iCondOpe),
      "Se requiere si la venta es al contado.",
      "Manual v150, E605–E609",
    );
  }

  // Campos propios de remisión y autofactura presentes en esta plantilla.
  if (["iMotEmiNR", "dDesMotEmiNR", "iRespEmiNR"].includes(codigo))
    return condicion(
      tipo === "7",
      true,
      "Se requiere en una nota de remisión.",
      "Manual v150, E501–E503",
    );
  if (["Salida", "Entrega"].includes(grupo))
    return condicion(
      tipo === "7" && !["cDisSal", "cDisEnt"].includes(codigo),
      true,
      "Se requiere para el lugar de salida o entrega de la remisión.",
      "Manual v150, E920 y E940",
    );
  if (grupo === "Transporte") {
    if (
      [
        "iModTrans",
        "dNomTrans",
        "iNatTrans",
        "dNumIDChof",
        "dNomChof",
      ].includes(codigo)
    )
      return condicion(
        tipo === "7",
        true,
        "Se requiere para identificar el transporte y el conductor.",
        "Manual v150, E900 y E980",
      );
    if (["dRucTrans", "dDVTrans"].includes(codigo))
      return condicion(
        tipo === "7" && String(fila.iNatTrans) === "1",
        !estaVacio(fila.iNatTrans),
        "Se requiere si el transportista es contribuyente.",
        "Manual v150, E983 y E984",
      );
    if (["iTipIDTrans", "dNumIDTrans"].includes(codigo))
      return condicion(
        tipo === "7" && String(fila.iNatTrans) === "2",
        !estaVacio(fila.iNatTrans),
        "Se requiere si el transportista no es contribuyente.",
        "Manual v150, E985 y E987",
      );
    if (codigo === "dNuDespImp")
      return condicion(
        tipo === "7" && String(documento.iMotEmiNR) === "5",
        !estaVacio(documento.iMotEmiNR),
        "Se requiere en un traslado por importación.",
        "Manual v150, E908",
      );
  }
  if (
    [
      "iNatVen",
      "iTipIDVen",
      "dNumIDVen",
      "dNomVen",
      "dDirVen",
      "dNumCasVen",
      "cDepVen",
      "cCiuVen",
      "dDirProv",
      "cDepProv",
      "cCiuProv",
    ].includes(codigo)
  )
    return condicion(
      tipo === "4",
      true,
      "Se requiere para identificar al vendedor y la transacción de la autofactura.",
      "Manual v150, grupo E4",
    );
  if (!nombres[codigo])
    return {
      ...base,
      estado: "integracion",
      motivo: "No hay una regla confirmada para este campo de tu integración.",
      referencia: "Revisar contrato de la API",
    };
  return opcional(
    "Esta plantilla no lo exige en este caso. Se conserva vacío según tu configuración.",
  );
}

/** Recorre cabecera y filas sin perder su ruta: permite destacar el dato faltante. */
export function recorrerCampos(
  documento: any,
  visitar: (
    codigo: string,
    valor: any,
    ruta: string,
    fila: any,
    grupo: string,
  ) => void,
) {
  for (const [codigo, valor] of Object.entries(documento)) {
    if (Array.isArray(valor))
      valor.forEach((fila, i) => {
        if (fila && typeof fila === "object")
          for (const [campo, dato] of Object.entries(fila))
            visitar(campo, dato, `${codigo}.${i}.${campo}`, fila, codigo);
      });
    else if (typeof valor !== "object" || valor === null)
      visitar(codigo, valor, codigo, documento, "");
  }
}

/** Lista únicamente campos existentes cuya regla está confirmada y activa. */
export function camposFaltantes(documento: any, tipo: string) {
  const faltantes: {
    ruta: string;
    codigo: string;
    nombre: string;
    motivo: string;
  }[] = [];
  // Combina la estructura mínima y los datos para detectar incluso claves eliminadas.
  const estructura = crearPlantilla(tipo) as any;
  const revision = { ...estructura, ...documento };
  for (const [grupo, filas] of Object.entries(documento))
    if (Array.isArray(filas))
      revision[grupo] = filas.map((fila: any) => ({
        ...((estructura[grupo] || [])[0] || {}),
        ...fila,
      }));
  recorrerCampos(revision, (codigo, valor, ruta, fila, grupo) => {
    const info = informacionCampo(codigo, documento, tipo, fila, grupo);
    if (info.estado === "obligatorio" && estaVacio(valor))
      faltantes.push({
        ruta,
        codigo,
        nombre: info.nombre,
        motivo: info.motivo,
      });
  });
  return faltantes;
}

/** Vacía solo campos conocidos y opcionales; no toca campos desconocidos de la API. */
export function vaciarCamposOpcionales(documento: any, tipo: string) {
  const copia = structuredClone(documento);
  // Elimina campos y grupos conocidos pertenecientes a otro tipo de documento.
  const permitidos = crearPlantilla(tipo) as any;
  const todos = new Set<string>();
  for (const t of ["1", "4", "5", "6", "7"]) Object.keys(crearPlantilla(t)).forEach((k) => todos.add(k));
  for (const codigo of Object.keys(copia))
    if (todos.has(codigo) && !(codigo in permitidos) && estaVacio(copia[codigo])) delete copia[codigo];
  // Dos pasadas limpian dependencias como dirección -> número de casa.
  for (let pasada = 0; pasada < 2; pasada++)
    recorrerCampos(copia, (codigo, _valor, ruta, fila, grupo) => {
      if (
        estaVacio(_valor) && informacionCampo(codigo, copia, tipo, fila, grupo).estado === "opcional"
      ) {
        const partes = ruta.split(".");
        let padre = copia;
        for (const p of partes.slice(0, -1)) padre = padre[p];
        // Los campos opcionales no se envían cuando no se informan.
        delete padre[partes.at(-1)!];
      }
    });
  if (["1", "5"].includes(String(copia.iTImp)) && tipo !== "7") {
    for (const item of copia.Detalles || []) {
      if (["2", "3"].includes(String(item.iAfecIVA))) {
        for (const campo of [
          "dPropIVA",
          "dTasaIVA",
          "dBasGravIVA",
          "dLiqIVAItem",
        ])
          item[campo] = "0";
      }
    }
    const items = copia.Detalles || [];
    if (
      items.length &&
      items.every((item: any) => ["2", "3"].includes(String(item.iAfecIVA)))
    ) {
      for (const total of copia.Subtotales || []) {
        total.dTotIVA = "0";
        total.dTBasGraIVA = "0";
      }
    }
  }
  return copia;
}

/** Revisión orientativa de la plantilla: obligatorios activos, formatos e importes. */
export function validarDocumento(documento: any, tipo: string) {
  const errores = camposFaltantes(documento, tipo).map(
    (f) => `(${f.codigo}) ${f.nombre}: falta completar. ${f.motivo}`,
  );
  for (const [codigo, digitos] of [
    ["dEst", 3],
    ["dPunExp", 3],
    ["dNumDoc", 7],
  ] as const)
    if (
      !estaVacio(documento[codigo]) &&
      !new RegExp(`^\\d{${digitos}}$`).test(String(documento[codigo]))
    )
      errores.push(
        `(${codigo}) ${informacionCampo(codigo, documento, tipo).nombre}: debe tener ${digitos} dígitos.`,
      );
  if (!estaVacio(documento.iTiDE) && String(documento.iTiDE) !== tipo)
    errores.push(
      "(iTiDE) Tipo de documento: no coincide con el documento seleccionado.",
    );
  if (documento.dFeEmiDE) {
    const s = String(documento.dFeEmiDE);
    const fecha = new Date(s.slice(0, 10) + "T00:00:00Z");
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s) ||
      Number.isNaN(Date.parse(s)) ||
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== s.slice(0, 10)
    )
      errores.push(
        "(dFeEmiDE) Fecha y hora: usá una fecha válida AAAA-MM-DDThh:mm:ss.",
      );
  }
  if (!Array.isArray(documento.Detalles) || !documento.Detalles.length)
    errores.push("Productos y servicios: agregá al menos un ítem.");
  if (
    tipo !== "7" &&
    (!Array.isArray(documento.Subtotales) || !documento.Subtotales.length)
  )
    errores.push("Totales del documento: agregá el grupo Subtotales.");
  if (
    ["5", "6"].includes(tipo) &&
    (!Array.isArray(documento.DocumentosAsociados) ||
      !documento.DocumentosAsociados.length)
  )
    errores.push("Documento asociado: indicá la factura que origina la nota.");
  recorrerCampos(documento, (codigo, valor, _ruta, fila, grupo) => {
    if (
      codigo === "dCdCDERef" &&
      !estaVacio(valor) &&
      !/^\d{44}$/.test(String(valor))
    )
      errores.push("(dCdCDERef) CDC asociado: debe tener 44 dígitos.");
    if (
      grupo === "Detalles" &&
      !estaVacio(valor) &&
      [
        "dCantProSer",
        "dPUniProSer",
        "dTotOpeItem",
        "dBasGravIVA",
        "dLiqIVAItem",
        "dBaseExe",
      ].includes(codigo) &&
      !/^\d+(\.\d{1,8})?$/.test(String(valor))
    )
      errores.push(
        `(${codigo}) ${informacionCampo(codigo, documento, tipo, fila, grupo).nombre}: usá decimales sin separadores de miles.`,
      );
    if (codigo === "dCantProSer" && !estaVacio(valor) && Number(valor) <= 0)
      errores.push("(dCantProSer) Cantidad: debe ser mayor que cero.");
  });
  // Aplica también a JSON pegados o importados, no solo al formulario.
  recorrerCampos(documento, (codigo, valor, ruta, fila, grupo) => {
    const info = informacionCampo(codigo, documento, tipo, fila, grupo);
    const error = errorFormato(codigo, valor);
    if (error) errores.push(`(${codigo}) ${info.nombre} [${ruta}]: ${error}`);
    if (
      !estaVacio(valor) &&
      info.opciones &&
      !info.opciones.some(([opcion]) => opcion === String(valor))
    )
      errores.push(
        `(${codigo}) ${info.nombre}: seleccioná una opción del catálogo.`,
      );
    if (
      grupo === "Detalles" &&
      ["2", "3"].includes(String(fila.iAfecIVA)) &&
      ["dPropIVA", "dTasaIVA", "dBasGravIVA", "dLiqIVAItem"].includes(codigo) &&
      !estaVacio(valor) &&
      Number(valor) !== 0
    )
      errores.push(
        `(${codigo}) ${info.nombre}: debe ser cero para un producto exento o exonerado.`,
      );
    if (
      codigo === "dTasaIVA" &&
      ["1", "4"].includes(String(fila.iAfecIVA)) &&
      !estaVacio(valor) &&
      !["5", "10"].includes(String(valor))
    )
      errores.push(
        "(dTasaIVA) Tasa del IVA: elegí 5 o 10 para un producto gravado.",
      );
  });
  if (documento.tipOpe !== "1" && documento.tipOpe !== 1)
    errores.push("(tipOpe) Operación: el envío de documentos utiliza 1.");
  if (Array.isArray(documento.Detalles) && documento.Detalles.length > 999)
    errores.push("Productos: el documento admite hasta 999 ítems.");
  return [...new Set(errores)];
}
