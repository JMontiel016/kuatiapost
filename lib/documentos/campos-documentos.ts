import { errorFormato, formatoCampo } from "./formatos-campos";
import { crearPlantilla } from "./plantillas-documentos";
import { parDescripcion } from "./descripcion-codigos";

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
  dDesDepSal: ["Nombre del departamento de salida", "Informá el valor según el catálogo SIFEN"],
  dDesDisSal: ["Nombre del distrito de salida", "Informá el valor según el catálogo SIFEN"],
  dDesCiuSal: ["Nombre de la ciudad de salida", "Informá el valor según el catálogo SIFEN"],
  dDesDepEnt: ["Nombre del departamento de entrega", "Informá el valor según el catálogo SIFEN"],
  dDesDisEnt: ["Nombre del distrito de entrega", "Informá el valor según el catálogo SIFEN"],
  dDesCiuEnt: ["Nombre de la ciudad de entrega", "Informá el valor según el catálogo SIFEN"],
  dDesDepRec: ["Nombre del departamento del receptor", "Informá el valor según el catálogo SIFEN"],
  dDesDisRec: ["Nombre del distrito del receptor", "Informá el valor según el catálogo SIFEN"],
  dDesCiuRec: ["Nombre de la ciudad del receptor", "Informá el valor según el catálogo SIFEN"],
  dDesDepVen: ["Nombre del departamento del vendedor", "Informá el valor según el catálogo SIFEN"],
  dDesDisVen: ["Nombre del distrito del vendedor", "Informá el valor según el catálogo SIFEN"],
  dDesCiuVen: ["Nombre de la ciudad del vendedor", "Informá el valor según el catálogo SIFEN"],
  dDesDepProv: ["Nombre del departamento de la transacción", "Informá el valor según el catálogo SIFEN"],
  dDesDisProv: ["Nombre del distrito de la transacción", "Informá el valor según el catálogo SIFEN"],
  dDesCiuProv: ["Nombre de la ciudad de la transacción", "Informá el valor según el catálogo SIFEN"],
  tipOpe: ["Operación de tu integración", "Código definido por tu API"],
  iTiDE: ["Tipo de Documento Electrónico", "1 = factura; 5 = nota de crédito"],
  dEst: ["Establecimiento", "001"],
  dPunExp: ["Punto de expedición", "003"],
  dNumDoc: ["Número del documento", "0000001"],
  dFeEmiDE: ["Fecha y hora de emisión del DE", "2026-09-30T00:00:00"],
  dInfoEmi: ["Información adicional del emisor", "Observación del registro"],
  dInfoFisc: ["Información de interés del Fisco respecto al DE", "Observación fiscal"],
  iTipTra: ["Tipo de transacción", "1 = venta de mercadería"],
  iTImp: ["Tipo de impuesto afectado", "1 = IVA"],
  cMoneOpe: ["Moneda de la operación", "PYG"],
  dCondTiCam: [
    "Condición del tipo de cambio",
    "1 = global; 2 = por ítem",
  ],
  dTiCam: ["Tipo de cambio de la operación", "7000.0000"],
  dTiCamIt: ["Tipo de cambio por ítem", "7000.0000"],
  iIndPres: ["Indicador de presencia", "1 = presencial"],
  iNatRec: [
    "Naturaleza del receptor",
    "1 = contribuyente; 2 = no contribuyente",
  ],
  iTiOpe: ["Tipo de operación", "1 = entre empresas"],
  cPaisRec: ["Código de país del receptor", "PRY"],
  dDesPaisRe: ["Descripción del país del receptor", "Paraguay"],
  iTiContRec: [
    "Tipo de contribuyente receptor",
    "1 = persona física; 2 = persona jurídica",
  ],
  dRucRec: ["RUC del receptor", "80000000"],
  dDVRec: ["Dígito verificador del RUC del receptor", "1"],
  iTipIDRec: ["Tipo de documento de identidad del receptor", "1 = cédula paraguaya"],
  dNumIDRec: ["Número de documento de identidad", "1234567"],
  dNomRec: ["Nombre o razón social del receptor del DE", "Nombre del cliente"],
  dDirRec: ["Dirección del receptor", "Av. Principal"],
  dNumCasRec: ["Número de casa del receptor", "0 si no tiene numeración"],
  cDepRec: ["Código del departamento del receptor", "Código del catálogo documental"],
  cDisRec: ["Código del distrito", "Código del catálogo documental"],
  cCiuRec: ["Código de la ciudad del receptor", "Código del catálogo documental"],
  dTelRec: ["Número de teléfono del receptor", "021123456"],
  dCelRec: ["Número de celular del receptor", "0981123456"],
  dEmailRec: ["Correo electrónico del receptor", "cliente@ejemplo.com"],
  iCondOpe: ["Condición de la operación", "1 = contado; 2 = crédito"],
  iMotEmi: [
    "Motivo de emisión",
    "Código del motivo según tipo de nota",
  ],
  iTipDocAso: ["Tipo de documento asociado", "1 = electrónico; 2 = impreso"],
  dCdCDERef: [
    "CDC del DTE referenciado",
    "Los 44 dígitos del CDC de la factura",
  ],
  dCodInt: ["Código interno del ítem", "PROD001"],
  dDesProSer: ["Descripción del producto y/o servicio", "Servicio prestado"],
  cUniMed: ["Unidad de medida", "77 = unidad"],
  dCantProSer: ["Cantidad del producto y/o servicio", "1.0000"],
  dPUniProSer: ["Precio unitario del producto y/o servicio (incluidos impuestos)", "110000.00000000"],
  dTotBruOpeItem: ["Total bruto de la operación por ítem", "110000.00000000"],
  dTotOpeItem: ["Valor total de la operación por ítem", "110000.00000000"],
  iAfecIVA: [
    "Forma de afectación tributaria del IVA",
    "1 = gravado; 2 = exonerado; 3 = exento; 4 = parcial",
  ],
  dPropIVA: [
    "Proporción gravada de IVA",
    "100 para un ítem totalmente gravado",
  ],
  dTasaIVA: ["Tasa del IVA", "10, 5 o 0 según afectación"],
  dBasGravIVA: ["Base gravada del IVA por ítem", "100000.00000000"],
  dLiqIVAItem: ["Liquidación del IVA por ítem", "10000.00000000"],
  dBaseExe: ["Base exenta del ítem", "Parte exenta en un ítem con IVA parcial"],
  dSubExe: ["Subtotal de la operación exenta", "0.00000000 si no hay ítems exentos"],
  dSubExo: ["Subtotal de la operación exonerada", "0.00000000 si no hay ítems exonerados"],
  dSub5: ["Subtotal de la operación con IVA incluido a la tasa 5%", "Importe de los ítems con IVA 5%"],
  dSub10: ["Subtotal de la operación con IVA incluido a la tasa 10%", "Importe de los ítems con IVA 10%"],
  dTotOpe: ["Total Bruto de la operación", "Suma de los importes finales"],
  dTotDesc: ["Total de descuentos por ítem", "0.00000000 si no hay descuentos"],
  dTotDescGlotem: ["Total descuento global por ítem", "0.00000000"],
  dTotAntItem: ["Total Anticipo por ítem", "0.00000000"],
  dTotAnt: ["Total Anticipo global por ítem", "0.00000000"],
  dPorcDescTotal: ["Porcentaje total de descuento", "0.00000000"],
  dDescTotal: ["Total Descuentos de la operación", "0.00000000"],
  dAnticipo: ["Total Anticipos de la operación", "0.00000000"],
  dRedon: ["Redondeo de la operación", "0.0000"],
  dComi: ["Comisión de la operación", "0.00000000"],
  dIVAComi: ["Liquidación total del IVA de la comisión", "0.00000000"],
  dLiqTotIVA5: ["Liquidación del IVA por redondeo a la tasa del 5%", "0.00000000"],
  dLiqTotIVA10: ["Liquidación del IVA por redondeo a la tasa del 10%", "0.00000000"],
  dTotGralOpe: ["Total Neto de la operación", "Importe final del registro"],
  dIVA5: ["Liquidación del IVA a la tasa del 5%", "0.00000000 si no corresponde"],
  dIVA10: ["Liquidación del IVA a la tasa del 10%", "0.00000000 si no corresponde"],
  dTotIVA: ["Liquidación total del IVA", "Suma del IVA 5% y 10%"],
  dBaseGrav5: ["Total base gravada al 5%", "0.00000000 si no corresponde"],
  dBaseGrav10: ["Total base gravada al 10%", "0.00000000 si no corresponde"],
  dTBasGraIVA: ["Total de la base gravada de IVA", "Suma de las bases imponibles"],
  dTotalGs: [
    "Total general de la operación en Guaraníes",
    "Total convertido cuando la moneda no es PYG",
  ],
  iTiPago: ["Tipo de pago", "1 = efectivo; 5 = transferencia"],
  dMonTiPag: ["Monto por tipo de pago", "110000.0000"],
  cMoneTiPag: ["Moneda por tipo de pago", "PYG"],
  dTiCamTiPag: ["Tipo de cambio por tipo de pago", "7000.0000"],
  dDesMotEmi: ["Descripción del motivo de NC / ND", "Devolución"],
  dDCondOpe: ["Descripción de la condición de la operación", "Contado"],
  dDesTipTrans: ["Descripción del tipo de transporte", "Propio"],
  dDesModTrans: ["Descripción de modalidad de transporte", "Terrestre"],
  dDTipIDTrans: ["Descripción del tipo de identificación del transportista", "Cédula paraguaya"],
  cCondNeg: ["Incoterm de negociación", "FOB"],
  dNuManif: ["Manifiesto / carta de porte", "Número del manifiesto"],
  dIniTras: ["Inicio estimado del traslado", "AAAA-MM-DD"],
  dFinTras: ["Finalización estimada del traslado", "AAAA-MM-DD"],
  cPaisDest: ["País de destino", "PRY"],
  dDesPaisDest: ["Nombre del país de destino", "Paraguay"],
  dTiVehTras: ["Tipo de vehículo", "Camión"],
  dMarVeh: ["Marca de vehículo", "Isuzu"],
  dTipIdenVeh: ["Tipo de identificación del vehículo", "2 = chapa / matrícula"],
  dNroIDVeh: ["Número de identificación del vehículo", "Identificación"],
  dAdicVeh: ["Datos adicionales del vehículo", "Observaciones"],
  dNroMatVeh: ["Matrícula / chapa", "ABC123"],
  dNroVuelo: ["Número de vuelo", "ABC123"],
  cNacTrans: ["Nacionalidad del transportista (ISO 3)", "PRY"],
  dDesNacTrans: ["Nombre de la nacionalidad del transportista", "Paraguay"],
  dDomFisc: ["Domicilio fiscal del transportista", "Dirección del domicilio"],
  dDirChof: ["Dirección del conductor", "Calle y número"],
  dNombAg: ["Nombre / razón social del agente", "Agente o intermediario"],
  dRucAg: ["RUC del agente", "80000000"],
  dDVAg: ["DV del agente", "0"],
  dDirAge: ["Dirección del agente", "Calle y número"],
  dComp1Sal: ["Complemento de dirección de salida 1", "Entre calles"],
  dComp2Sal: ["Complemento de dirección de salida 2", "Local o piso"],
  dTelSal: ["Teléfono de salida", "021123456"],
  dComp1Ent: ["Complemento de dirección de entrega 1", "Entre calles"],
  dComp2Ent: ["Complemento de dirección de entrega 2", "Depósito"],
  dTelEnt: ["Teléfono de entrega", "021123456"],
  iMotEmiNR: ["Motivo de emisión", "1 = traslado por venta"],
  dDesMotEmiNR: ["Descripción del motivo de emisión", "Traslado por ventas"],
  dDesRespEmiNR: ["Descripción del responsable de la NR", "Emisor de la factura"],
  iRespEmiNR: ["Responsable de la emisión de la Nota Remisión Electrónica", "1 = emisor de la factura"],
  dKmR: ["Kilómetros estimados de recorrido", "10"],
  dFecEm: ["Fecha futura de emisión de la factura", "2026-09-30"],
  iTipTrans: ["Tipo de transporte", "1 = propio; 2 = de terceros"],
  iModTrans: ["Modalidad del transporte", "1 = terrestre"],
  iRespFlete: [
    "Responsable del costo del flete",
    "Código del catálogo documental",
  ],
  dNuDespImp: ["Número de despacho de importación", "Número del despacho"],
  iNatTrans: [
    "Naturaleza del transportista",
    "1 = contribuyente; 2 = no contribuyente",
  ],
  dNomTrans: [
    "Nombre o razón social del transportista",
    "Nombre del transportista",
  ],
  dRucTrans: ["RUC del transportista", "80000000"],
  dDVTrans: ["Dígito verificador del RUC del transportista", "1"],
  iTipIDTrans: ["Tipo de documento de identidad del transportista", "1 = cédula paraguaya"],
  dNumIDTrans: ["Número de documento de identidad del transportista", "1234567"],
  dNomChof: ["Nombre y apellido del chofer", "Nombre y apellido"],
  dNumIDChof: ["Número de documento de identidad del chofer", "1234567"],
  dDirLocSal: ["Dirección del local de salida", "Calle de salida"],
  dNumCasSal: ["Número de casa de salida", "0 si no tiene numeración"],
  cDepSal: ["Código del departamento del local de salida", "Código del catálogo documental"],
  cDisSal: ["Código del distrito del local de salida", "Código del catálogo documental"],
  cCiuSal: ["Código de la ciudad del local de salida", "Código del catálogo documental"],
  dDirLocEnt: ["Dirección del local de la entrega", "Calle de entrega"],
  dNumCasEnt: ["Número de casa de la entrega", "0 si no tiene numeración"],
  cDepEnt: ["Código del departamento del local de la entrega", "Código del catálogo documental"],
  cDisEnt: ["Código del distrito del local de la entrega", "Código del catálogo documental"],
  cCiuEnt: ["Código de la ciudad del local de la entrega", "Código del catálogo documental"],
  iNatVen: [
    "Naturaleza del vendedor",
    "1 = no contribuyente; 2 = extranjero",
  ],
  iTipIDVen: ["Tipo de documento de identidad del vendedor", "1 = cédula paraguaya"],
  dNumIDVen: ["Número de documento de identidad del vendedor", "1234567"],
  dNomVen: ["Nombre y apellido del vendedor", "Nombre y apellido"],
  dDirVen: ["Dirección del vendedor", "Calle del vendedor"],
  dNumCasVen: ["Número de casa del vendedor", "0 si no tiene numeración"],
  cDepVen: ["Código del departamento del vendedor", "Código del catálogo documental"],
  cDisVen: ["Código del distrito del vendedor", "Código del catálogo documental"],
  cCiuVen: ["Código de la ciudad del vendedor", "Código del catálogo documental"],
  dDirProv: [
    "Lugar de la transacción",
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
  iDenTarj: [["1","Visa"],["2","Mastercard"],["3","American Express"],["4","Maestro"],["5","Panal"],["6","Cabal"],["99","Otro"]],
  iForProPa: [["1","POS"],["2","Pago electrónico"],["9","Otro"]],
  iCondCred: [["1","Plazo"],["2","Cuotas"]],
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
    ["99", "Otro"],
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
    ["1", "B2B"],
    ["2", "B2C"],
    ["3", "B2G"],
    ["4", "B2F"],
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
  valor === null || valor === undefined || (typeof valor === "string" && !valor.trim());

/** Devuelve el estado actual del campo considerando los datos ya elegidos. */
export function informacionCampo(
  codigo: string,
  documento: any,
  tipo: string,
  fila: any = {},
  grupo = "",
): InformacionCampo {
  const adicionales: Record<string, [string, string]> = {
    dDesIndPres: ["Descripción del indicador de presencia", "Venta mediante intermediario"],
    dDTipIDRec: ["Descripción del tipo de documento de identidad", "Identificación especial"],
    dDesTiPag: ["Descripción del tipo de pago", "Acuerdo de pago especial"],
    dNumCheq: ["Número de cheque", "00001234"], dBcoEmi: ["Banco emisor", "Banco emisor"],
    iDenTarj: ["Denominación de la tarjeta", "1"], dDesDenTarj: ["Descripción de denominación de la tarjeta", "Marca especial"],
    iForProPa: ["Forma de procesamiento de pago", "1"], dRSProTar: ["Razón social de la procesadora de tarjeta", "Procesadora"],
    dRUCProTar: ["RUC de la procesadora de tarjeta", "80000000"], dDVProTar: ["Dígito verificador del RUC de la procesadora de tarjeta", "0"],
    dCodAuOpe: ["Código de autorización de la operación", "123456"], dNomTit: ["Nombre del titular de la tarjeta", "Nombre del titular"],
    dNumTarj: ["Número de la tarjeta", "1234"],
    iCondCred: ["Condición de la operación a crédito", "1"], dPlazoCre: ["Plazo del crédito", "30 días"],
    dCuotas: ["Cantidad de cuotas", "12"], dMonEnt: ["Monto de la entrega inicial", "0"],
  };
  const [nombre, ejemplo] = adicionales[codigo] || nombres[codigo] || [
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
  // Mostrar el catálogo D202 completo. La revisión explica incompatibilidades
  // sin cambiar el código elegido ni sustituir B2B/B2C/B2G/B2F por otros nombres.
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
    return obligatorio("Identifica la operación, el tipo y la numeración del registro.", "Manual v150, cabecera y timbrado; contrato de integración");
  if (!grupo && ["iNatRec", "iTiOpe", "cPaisRec", "dNomRec"].includes(codigo))
    return obligatorio("Identifica al receptor de este registro.", "Manual v150, grupo D3");
  // Las descripciones de códigos son campos 1-1 según el manual: se generan
  // a partir de códigos conocidos y se ingresan manualmente solo con Otro.
  if (codigo === "dDesIndPres") return condicion(tipo === "1" && !estaVacio(documento.iIndPres), !estaVacio(documento.iIndPres) || tipo !== "1", "Se completa desde el indicador de presencia; si elegís Otro, especificá el tipo de operación.", "Manual v150, E012");
  if (codigo === "dDTipIDRec") return condicion(String(documento.iNatRec) === "2" && !estaVacio(documento.iTipIDRec), !estaVacio(documento.iNatRec) && (String(documento.iNatRec) !== "2" || !estaVacio(documento.iTipIDRec)), "Se completa desde el tipo de identidad; si elegís Otro, describí el documento.", "Manual v150, D209");
  if (["iCondCred","dPlazoCre","dCuotas","dMonEnt"].includes(codigo)) {
    const credito = String(documento.iCondOpe) === "2";
    if (codigo === "dMonEnt") return opcional("Entrega inicial del crédito, si corresponde.");
    return condicion(credito && (codigo === "iCondCred" || codigo === "dPlazoCre" && String(documento.iCondCred) === "1" || codigo === "dCuotas" && String(documento.iCondCred) === "2"), true, "Completá la condición y el plazo o las cuotas del crédito.");
  }
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
      "Se informa en datos con importes.",
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
  // NT 023, D208/D210: en B2F la identificación del no contribuyente
  // es opcional; únicamente un receptor contribuyente no debe informarla.
  if (["iTipIDRec", "dNumIDRec"].includes(codigo)) {
    if (String(documento.iNatRec) === "2" && String(documento.iTiOpe) === "4")
      return opcional("Puede informarse para el receptor no contribuyente en B2F (NT 023, D208 y D210).");
    return condicion(String(documento.iNatRec) === "2", !estaVacio(documento.iNatRec),
      "Obligatorio para un no contribuyente si la operación es distinta de B2F.", "NT 023, D208 y D210");
  }
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
        "Se requiere en datos con importes.",
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
        "Se requiere al expresar en guaraníes un registro en moneda extranjera.",
        "Manual v150, F023",
      );
    const items = Array.isArray(documento.Detalles) ? documento.Detalles.filter(esFilaDocumento) : [];
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
        "Se informa el total de IVA o su base imponible en datos con IVA.",
        "Manual v150, F017 y F020",
      );
    return condicion(
      tipo !== "7",
      true,
      "Se requiere en el grupo de totales de datos con importes.",
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
  if (codigo === "dDesPaisRe")
    return condicion(!estaVacio(documento.cPaisRec), true,
      "Se completa automáticamente al seleccionar país del receptor.", "Manual v150 D204");
  if (codigo === "dDesMotEmi")
    return condicion(["5","6"].includes(tipo) && !estaVacio(documento.iMotEmi),
      !estaVacio(documento.iMotEmi), "Se completa automáticamente desde el motivo NC/ND.", "Manual v150, E402");
  if (codigo === "dDCondOpe")
    return condicion(["1","4"].includes(tipo) && !estaVacio(documento.iCondOpe),
      !estaVacio(documento.iCondOpe), "Descripción automática de Contado / Crédito.", "Manual v150, E602");
  if (codigo === "iTipDocAso")
    return condicion(
      ["5", "6"].includes(tipo),
      true,
      "Elegí el tipo de registro que origina la nota.",
      "Manual v150, H002",
    );
  if (codigo === "dCdCDERef")
    return condicion(
      ["5", "6"].includes(tipo) && String(fila.iTipDocAso) === "1",
      !estaVacio(fila.iTipDocAso),
      "Se requiere si el registro asociado es electrónico.",
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
    const contado = String(documento.iCondOpe) === "1";
    const pagoRequerido = contado || (String(documento.iCondOpe) === "2" && Number(documento.dMonEnt) > 0) || !estaVacio(fila.iTiPago);
    const tarjeta = ["3","4"].includes(String(fila.iTiPago));
    if (["dNumCheq","dBcoEmi"].includes(codigo)) return condicion(pagoRequerido && String(fila.iTiPago) === "2", true, "Completá el número de cheque de 8 caracteres y el banco emisor.");
    if (codigo === "dDesTiPag") return condicion(pagoRequerido && !estaVacio(fila.iTiPago), !estaVacio(documento.iCondOpe) && (!contado || !estaVacio(fila.iTiPago)), "Se completa desde el tipo de pago; si elegís Otro, indicá el tipo de pago manualmente.", "Manual v150, E607");
    if (["iDenTarj","iForProPa"].includes(codigo)) return condicion(pagoRequerido && tarjeta, true, "Seleccioná la marca y el procesamiento del pago con tarjeta.");
    if (codigo === "dDesDenTarj") return condicion(pagoRequerido && tarjeta && !estaVacio(fila.iDenTarj), !estaVacio(fila.iTiPago) && (!tarjeta || !estaVacio(fila.iDenTarj)), "Se completa desde la denominación de tarjeta; si elegís Otro, escribí la marca.", "Manual v150, E622");
    if (["dRSProTar","dRUCProTar","dDVProTar","dCodAuOpe","dNomTit","dNumTarj"].includes(codigo)) return opcional("Dato adicional del pago con tarjeta, si corresponde. Nunca informes el número completo ni el código de seguridad.");

    if (codigo === "dTiCamTiPag")
      return condicion(
        pagoRequerido &&
          fila.cMoneTiPag &&
          fila.cMoneTiPag !== "PYG",
        !estaVacio(documento.iCondOpe) && !estaVacio(fila.cMoneTiPag),
        "Se requiere en pagos al contado con moneda extranjera.",
        "Manual v150, E611",
      );
    return condicion(
      pagoRequerido,
      !estaVacio(documento.iCondOpe),
      "Se requiere para el pago al contado o la entrega inicial informada.",
      "Manual v150, E605–E609",
    );
  }

  // Campos propios de remisión y autofactura presentes en esta plantilla.
  if (["iMotEmiNR", "dDesMotEmiNR", "iRespEmiNR", "dDesRespEmiNR"].includes(codigo))
    return condicion(
      tipo === "7" && (!["dDesMotEmiNR", "dDesRespEmiNR"].includes(codigo) ||
        !estaVacio(documento[codigo === "dDesMotEmiNR" ? "iMotEmiNR" : "iRespEmiNR"])),
      tipo !== "7" || !estaVacio(documento[codigo === "dDesMotEmiNR" ? "iMotEmiNR" : "iRespEmiNR"]),
      "Descripción asociada al código. Solo se escribe libremente el motivo 99 · Otro.",
      "Manual v150, E501–E504",
    );
  if (["Salida", "Entrega"].includes(grupo)) {
    const obligatorioLocal = ["dDirLocSal","dNumCasSal","cDepSal","cCiuSal","dDirLocEnt","dNumCasEnt","cDepEnt","cCiuEnt"].includes(codigo);
    return condicion(tipo === "7" && obligatorioLocal, true,
      obligatorioLocal ? "Obligatorio para el local de salida o entrega." : "Opcional; si informás distrito, debe pertenecer al departamento y ciudad.",
      "Manual v150, E920-E951");
  }
  if (grupo === "Transporte") {
    // Manual v150 E980: el grupo de transportista es opcional solamente
    // cuando la modalidad es terrestre y el vehículo se identifica por número.
    const transportistaInformado = ["iNatTrans", "dNomTrans", "dRucTrans", "dDVTrans", "iTipIDTrans", "dNumIDTrans", "dNomChof", "dNumIDChof"].some(k => !estaVacio(fila[k]));
    const necesitaTransportista = tipo === "7" && (String(fila.iModTrans) !== "1" || String(fila.dTipIdenVeh) !== "1" || transportistaInformado);
    if (["iTipTrans","iModTrans","iRespFlete"].includes(codigo))
      return condicion(tipo === "7", true, "Datos generales de traslado.", "Manual v150, E901-E905");
    if (["dDesTipTrans","dDesModTrans"].includes(codigo))
      return condicion(tipo === "7" && !estaVacio(fila[codigo === "dDesTipTrans" ? "iTipTrans" : "iModTrans"]),
        true, "Se completa según el tipo de transporte seleccionado.", "Manual v150, E902 / E904");
    if (["dTiVehTras","dMarVeh","dTipIdenVeh"].includes(codigo))
      return condicion(tipo === "7", true, "Obligatorio para identificar el vehículo de traslado.", "Manual v150, E960-E967");
    if (codigo === "dNroIDVeh")
      return condicion(tipo === "7" && String(fila.dTipIdenVeh) === "1", !estaVacio(fila.dTipIdenVeh),
        "Obligatorio cuando identificás el vehículo por su número.", "Manual v150, E963");
    if (codigo === "dNroMatVeh")
      return condicion(tipo === "7" && String(fila.dTipIdenVeh) === "2", !estaVacio(fila.dTipIdenVeh),
        "Obligatorio cuando identificás el vehículo por matrícula.", "Manual v150, E965");
    if (codigo === "dNroVuelo")
      return condicion(tipo === "7" && String(fila.iModTrans) === "3", !estaVacio(fila.iModTrans),
        "Solo para transporte aéreo.", "Manual v150, E966");
    if (["iNatTrans","dNomTrans","dNomChof","dNumIDChof"].includes(codigo))
      return condicion(necesitaTransportista, true,
        "El grupo de transportista se exige salvo caso especial de modalidad terrestre con número del vehículo.", "Manual v150, E980-E991");
    if (["dRucTrans","dDVTrans"].includes(codigo))
      return condicion(necesitaTransportista && String(fila.iNatTrans) === "1", !estaVacio(fila.iNatTrans),
        "Obligatorio con transportista contribuyente.", "Manual v150, E983-E984");
    if (["iTipIDTrans","dDTipIDTrans","dNumIDTrans"].includes(codigo))
      return condicion(necesitaTransportista && String(fila.iNatTrans) === "2", !estaVacio(fila.iNatTrans),
        "Obligatorio con transportista no contribuyente.", "Manual v150, E985-E987");
    if (codigo === "dNuDespImp")
      return condicion(tipo === "7" && String(documento.iMotEmiNR) === "5", !estaVacio(documento.iMotEmiNR),
        "Obligatorio en importaciones (16 caracteres).", "Manual v150, E908");
    if (codigo === "dDesNacTrans")
      return condicion(tipo === "7" && !estaVacio(fila.cNacTrans), !estaVacio(fila.cNacTrans),
        "Si informás nacionalidad, también informá su descripción.", "Manual v150, E989");
    return opcional("Dato adicional del traslado; completalo solamente cuando corresponda.");
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
    if (Array.isArray(valor) && !formatoCampo(codigo))
      valor.forEach((fila, i) => {
        if (fila && typeof fila === "object")
          for (const [campo, dato] of Object.entries(fila))
            visitar(campo, dato, `${codigo}.${i}.${campo}`, fila, codigo);
      });
    else if (typeof valor !== "object" || valor === null || formatoCampo(codigo))
      visitar(codigo, valor, codigo, documento, "");
  }
}

/** Lista únicamente campos existentes cuya regla está confirmada y activa. */
export function camposFaltantes(documento: any, tipo: string) {
  const faltantes: {
    ejemplo: string;
    ruta: string;
    codigo: string;
    nombre: string;
    motivo: string;
  }[] = [];
  // Combina la estructura mínima y los datos para detectar incluso claves eliminadas.
  const estructura = crearPlantilla(tipo) as any;
  const usaFormaPago = !("Pagos" in documento) && Array.isArray(documento.FormaPago) && "Pagos" in estructura;
  if (usaFormaPago) {
    const { FormaPago, ...resto } = documento;
    documento = { ...resto, Pagos: FormaPago };
  }
  const revision = { ...estructura, ...documento };
  for (const [grupo, filas] of Object.entries(documento))
    if (Array.isArray(filas))
      revision[grupo] = filas.map((fila: any) => esFilaDocumento(fila) ? ({
        ...((estructura[grupo] || [])[0] || {}),
        ...fila,
      }) : undefined);
  const { deducibles } = revisarDescripciones(documento, tipo);
  recorrerCampos(revision, (codigo, valor, ruta, fila, grupo) => {
    const info = informacionCampo(codigo, documento, tipo, fila, grupo);
    if (info.estado === "obligatorio" && estaVacio(valor) && !deducibles.has(ruta))
      faltantes.push({
        ruta: usaFormaPago ? ruta.replace(/^Pagos\./, "FormaPago.") : ruta,
        codigo,
        nombre: info.nombre,
        motivo: info.motivo,
        ejemplo: info.ejemplo,
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

export type DescripcionSugerida = {
  grupo: string;
  indice?: number;
  codigo: string;
  campo: string;
  valor: string;
  reemplaza: boolean;
};

export function revisarDescripciones(documento: any, tipo: string) {
  const sugerencias: DescripcionSugerida[] = [];
  const errores: string[] = [];
  const deducibles = new Set<string>();
  const comprobar = (padre: any, codigo: string, grupo = "", indice?: number) => {
    const regla = parDescripcion(codigo);
    if (!regla || !padre || typeof padre !== "object" || Array.isArray(padre)) return;
    const prefijo = grupo ? `${grupo}[${indice}].` : "";
    const ruta = `${prefijo}${regla.campo}`;
    const actual = padre[regla.campo];
    if (estaVacio(padre[codigo])) {
      if (!estaVacio(actual)) errores.push(`(${prefijo}${codigo}) Informá el código correspondiente a ${ruta}.`);
      return;
    }
    const cod = String(padre[codigo]);
    if (regla.otro && cod === regla.otro) {
      if (estaVacio(actual) || typeof actual !== "string" || /^(otro|otros|otra|otras)$/i.test(actual.trim()))
        errores.push(`(${ruta}) Para ${codigo}=${cod}, escribí la descripción concreta.`);
      return;
    }
    const valor = Object.hasOwn(regla.valores, cod) ? regla.valores[cod] : undefined;
    if (!valor) {
      errores.push(`(${prefijo}${codigo}) Código «${cod}» fuera del catálogo de esta relación.`);
      return;
    }
    deducibles.add(grupo ? `${grupo}.${indice}.${regla.campo}` : regla.campo);
    if (typeof actual !== "string" || actual.trim() !== valor) {
      sugerencias.push({
        grupo, indice, codigo, campo: regla.campo, valor,
        reemplaza: !estaVacio(actual) && (typeof actual !== "string" || !!actual.trim()),
      });
    }
  };
  comprobar(documento, "iTiDE");
  comprobar(documento, "cPaisRec");
  if (tipo !== "7") comprobar(documento, "iTImp");
  if (Array.isArray(documento.DocumentosAsociados))
    documento.DocumentosAsociados.forEach((fila: any, i: number) => comprobar(fila, "iTipDocAso", "DocumentosAsociados", i));
  if (["5", "6"].includes(tipo)) comprobar(documento, "iMotEmi");
  if (tipo === "1") comprobar(documento, "iIndPres");
  if (String(documento.iNatRec) === "2" || (!estaVacio(documento.dDTipIDRec) && estaVacio(documento.iNatRec)))
    comprobar(documento, "iTipIDRec");
  if (["1", "4"].includes(tipo)) {
    comprobar(documento, "iCondOpe");
    for (const grupo of ["Pagos", "FormaPago"]) {
      if (!Array.isArray(documento[grupo])) continue;
      documento[grupo].forEach((pago: any, i: number) => {
        comprobar(pago, "iTiPago", grupo, i);
        if (["3", "4"].includes(String(pago?.iTiPago)) || !estaVacio(pago?.dDesDenTarj))
          comprobar(pago, "iDenTarj", grupo, i);
      });
    }
  }
  if (tipo === "7") {
    comprobar(documento, "iMotEmiNR");
    comprobar(documento, "iRespEmiNR");
    if (Array.isArray(documento.Transporte)) documento.Transporte.forEach((fila: any, i: number) => {
      comprobar(fila, "iTipTrans", "Transporte", i);
      comprobar(fila, "iModTrans", "Transporte", i);
      comprobar(fila, "cPaisDest", "Transporte", i);
      comprobar(fila, "cNacTrans", "Transporte", i);
      if (String(fila?.iNatTrans) === "2" || !estaVacio(fila?.dDTipIDTrans))
        comprobar(fila, "iTipIDTrans", "Transporte", i);
    });
  }
  return { sugerencias, errores, deducibles };
}

export function completarDescripciones(documento: any, tipo: string) {
  const resultado = structuredClone(documento);
  for (const { grupo, indice, campo, valor } of revisarDescripciones(documento, tipo).sugerencias) {
    const padre = grupo && indice !== undefined ? resultado[grupo][indice] : resultado;
    padre[campo] = valor;
  }
  return resultado;
}

const gruposDocumento = ["Detalles", "Pagos", "FormaPago", "Subtotales", "DocumentosAsociados", "Transporte", "Salida", "Entrega", "Cuotas"];

function esFilaDocumento(fila: unknown): fila is Record<string, unknown> {
  return !!fila && typeof fila === "object" && !Array.isArray(fila);
}

export function validarEstructuraDocumento(documento: Record<string, unknown>) {
  return gruposDocumento.flatMap(grupo => {
    if (!(grupo in documento)) return [];
    const filas = documento[grupo];
    if (!Array.isArray(filas)) return [`(${grupo}) Debe ser una lista entre corchetes [ ].`];
    return filas.flatMap((fila, indice) => esFilaDocumento(fila)
      ? [] : [`(${grupo}[${indice}]) El ítem debe ser un objeto entre llaves { }.`]);
  });
}

/** Comprueba F008 cuando el JSON informa los cuatro subtotales de la fórmula. */
function erroresTotalBruto(documento: any, tipo: string, numeros?: ReadonlyMap<string, string>) {
  if (["4", "7"].includes(tipo) || !["1", "3", "4", "5"].includes(String(documento.iTImp))) return [];
  const errores: string[] = [];
  const campos = ["dSubExe", "dSubExo", "dSub5", "dSub10", "dTotOpe"];
  for (const [indice, fila] of (documento.Subtotales || []).entries()) {
    if (!fila) continue;
    const importes = campos.map(campo => {
      const dato = numeros?.get(JSON.stringify(["Subtotales", indice, campo])) ?? String(fila[campo] ?? "");
      if (!/^\d{1,15}(?:\.\d{1,8})?$/.test(dato)) return null;
      const [entero, decimal = ""] = dato.split(".");
      return BigInt(entero + decimal.padEnd(8, "0"));
    });
    if (importes.some(importe => importe === null)) continue;
    const [exento, exonerado, iva5, iva10, total] = importes as bigint[];
    const esperado = exento + exonerado + iva5 + iva10;
    if (total !== esperado) {
      const decimal = (esperado % 100000000n).toString().padStart(8, "0").replace(/0+$/, "");
      const importe = (esperado / 100000000n).toString() + (decimal ? "." + decimal : "");
      errores.push(`(dTotOpe) [Subtotales[${indice}].dTotOpe]: la suma de los cuatro subtotales da ${importe}. Referencia: Manual v150, F008.`);
    }
  }
  return errores;
}

/** Revisión orientativa de la plantilla: obligatorios activos, formatos e importes. */
export function validarDocumento(documento: any, tipo: string, numeros?: ReadonlyMap<string, string>) {
  const estructura = validarEstructuraDocumento(documento);
  if (estructura.length) {
    documento = { ...documento };
    for (const grupo of gruposDocumento) {
      if (!(grupo in documento)) continue;
      const filas = documento[grupo];
      documento[grupo] = Array.isArray(filas)
        ? filas.map(fila => esFilaDocumento(fila) ? fila : undefined)
        : [];
    }
  }
  const relaciones = revisarDescripciones(documento, tipo);
  const usaFormaPago = ["1", "4"].includes(tipo) && !("Pagos" in documento) && Array.isArray(documento.FormaPago);
  if (usaFormaPago) {
    const { FormaPago, ...resto } = documento;
    documento = { ...resto, Pagos: FormaPago };
  }
  const errores = [...estructura, ...camposFaltantes(documento, tipo).map(
    (f) => `(${f.codigo}) ${f.nombre} [${usaFormaPago ? f.ruta.replace(/^Pagos\./, "FormaPago.") : f.ruta}]: falta completar. ${f.motivo}`,
  )];
  if (String(documento.iTiOpe) === "4" && (String(documento.iNatRec) !== "2" || documento.cPaisRec === "PRY")) errores.push("Servicios al exterior: elegí No contribuyente y un país diferente de PRY.");
  if (documento.iTiOpe && String(documento.iTiOpe) !== "4" && documento.cPaisRec !== "PRY") errores.push("(cPaisRec) Para esta operación seleccioná Paraguay (PRY).");
  if (tipo === "4" && (String(documento.iNatRec) !== "1" || String(documento.iTiOpe) !== "2")) errores.push("Autofactura: el receptor debe ser contribuyente y la operación B2C (2).");
  if (tipo === "4" && !estaVacio(documento.iCondOpe) && String(documento.iCondOpe) !== "1")
    errores.push("(iCondOpe) En una autofactura informá Contado (1), según E601.");
  // NT 023: identificación innominada únicamente para B2C, nunca en NC/ND/NR.
  if (String(documento.iTipIDRec) === "5") {
    if (["5", "6", "7"].includes(tipo)) errores.push("(iTipIDRec) Innominado no está permitido en nota de crédito, nota de débito o nota de remisión (NT 023, D208e).");
    if (String(documento.iTiOpe) !== "2") errores.push("(iTipIDRec) Innominado únicamente corresponde a B2C (NT 023, D208f).");
    if (String(documento.dNumIDRec) !== "0") errores.push("(dNumIDRec) Para Innominado informá 0, como indica la NT 023, D210.");
  }
  if (String(documento.iNatRec) === "2") for (const k of ["iTiContRec","dRucRec","dDVRec"]) if (!estaVacio(documento[k])) errores.push(`(${k}) No corresponde a un receptor no contribuyente. Retirá este dato.`);
  if (String(documento.iNatRec) === "1") for (const k of ["iTipIDRec","dDTipIDRec","dNumIDRec"]) if (!estaVacio(documento[k])) errores.push(`(${k}) No corresponde a esta selección del receptor. Retirá este dato.`);

  if (["1","4"].includes(tipo) && !documento.Pagos?.length) {
    if (String(documento.iCondOpe) === "1") errores.push("Venta al contado: agregá al menos una forma de pago.");
    if (String(documento.iCondOpe) === "2" && Number(documento.dMonEnt) > 0)
      errores.push("(Pagos) Informá la forma de pago de la entrega inicial.");
  }
  for (const pago of documento.Pagos || []) {
    if (!pago) continue;
    if (String(pago.iTiPago) !== "2" && (pago.dNumCheq || pago.dBcoEmi)) errores.push("Datos de cheque: solo corresponden cuando la forma de pago es Cheque (2).");
    if (!["3","4"].includes(String(pago.iTiPago)) && (pago.iDenTarj || pago.iForProPa || pago.dNumTarj)) errores.push("Datos de tarjeta: solo corresponden a crédito (3) o débito (4).");
  }
  if (estaVacio(documento.iTiDE) && estaVacio(documento.dDesTiDE))
    errores.push("(iTiDE) Informá el código del tipo de documento.");
  if (!estaVacio(documento.iTiDE) && String(documento.iTiDE) !== tipo)
    errores.push(
      "(iTiDE) Tipo de operación: no coincide con el registro seleccionado.",
    );
  if (!Array.isArray(documento.Detalles) || !documento.Detalles.length)
    errores.push("Productos y servicios: agregá al menos un ítem.");
  if (
    tipo !== "7" &&
    (!Array.isArray(documento.Subtotales) || !documento.Subtotales.length)
  )
    errores.push("Totales del registro: agregá el grupo Subtotales.");
  if (
    ["5", "6"].includes(tipo) &&
    (!Array.isArray(documento.DocumentosAsociados) ||
      !documento.DocumentosAsociados.length)
  )
    errores.push("Registro asociado: indicá la factura que origina la nota.");
  errores.push(...relaciones.errores);
  const rutasDeducibles = new Set([...relaciones.deducibles].map(
    ruta => !("FormaPago" in documento) ? ruta.replace(/^FormaPago\./, "Pagos.") : ruta,
  ));
  // Aplica también a JSON pegados o importados, no solo al formulario.
  recorrerCampos(documento, (codigo, valor, ruta, fila, grupo) => {
    const info = informacionCampo(codigo, documento, tipo, fila, grupo);
    const grupoOriginal = usaFormaPago && grupo === "Pagos" ? "FormaPago" : grupo;
    const indice = grupo ? Number(ruta.split(".")[1]) : -1;
    const clave = JSON.stringify(grupo ? [grupoOriginal, indice, codigo] : [codigo]);
    const original = typeof valor === "number" ? numeros?.get(clave) : undefined;
    const dato = original && !/[eE]/.test(original) ? original : valor;
    const error = errorFormato(codigo, dato);
    const rutaVisible = grupo ? `${grupoOriginal}[${indice}].${codigo}` : ruta;
    if (error && !rutasDeducibles.has(ruta)) errores.push(`(${codigo}) ${info.nombre} [${rutaVisible}]: ${error} Referencia: ${formatoCampo(codigo)?.referencia || info.referencia}.`);
    if (
      !estaVacio(valor) &&
      info.opciones &&
      !info.opciones.some(([opcion]) => opcion === String(valor))
    )
      errores.push(
        `(${codigo}) ${info.nombre} [${rutaVisible}]: seleccioná una opción del catálogo.`,
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
    errores.push("(tipOpe) Operación: el envío de datos utiliza 1.");
  if (Array.isArray(documento.Detalles) && documento.Detalles.length > 999)
    errores.push("Productos: el registro admite hasta 999 ítems.");
  errores.push(...erroresTotalBruto(documento, tipo, numeros));
  return [...new Set(errores)];
}
