/** Tipos y longitudes de los campos presentes en la plantilla documental.
 * A admite texto y caracteres válidos XML; no significa solo letras.
 * Los campos desconocidos quedan bajo el contrato de la integración.
 */
export type FormatoCampo = {
  tipo: string;
  minimo: number;
  maximo: number;
  decimales: number;
  referencia: string;
};
const formatos: Record<string, FormatoCampo> = {
  dDesIndPres: { tipo: "texto", minimo: 10, maximo: 30, decimales: 0, referencia: "Reglas de campos" },
  dDTipIDRec: { tipo: "texto", minimo: 9, maximo: 41, decimales: 0, referencia: "Reglas de campos" },
  dDesTiPag: { tipo: "texto", minimo: 4, maximo: 30, decimales: 0, referencia: "Reglas de campos" },
  dNumCheq: { tipo: "texto", minimo: 8, maximo: 8, decimales: 0, referencia: "Reglas de campos" },
  dBcoEmi: { tipo: "texto", minimo: 4, maximo: 20, decimales: 0, referencia: "Reglas de campos" },
  iDenTarj: { tipo: "numero", minimo: 1, maximo: 2, decimales: 0, referencia: "Reglas de campos" },
  dDesDenTarj: { tipo: "texto", minimo: 4, maximo: 20, decimales: 0, referencia: "Reglas de campos" },
  iForProPa: { tipo: "numero", minimo: 1, maximo: 1, decimales: 0, referencia: "Reglas de campos" },
  dRSProTar: { tipo: "texto", minimo: 4, maximo: 60, decimales: 0, referencia: "Reglas de campos" },
  dRUCProTar: { tipo: "numero", minimo: 3, maximo: 8, decimales: 0, referencia: "Reglas de campos" },
  dDVProTar: { tipo: "numero", minimo: 1, maximo: 1, decimales: 0, referencia: "Reglas de campos" },
  dCodAuOpe: { tipo: "numero", minimo: 6, maximo: 10, decimales: 0, referencia: "Reglas de campos" },
  dNomTit: { tipo: "texto", minimo: 4, maximo: 30, decimales: 0, referencia: "Reglas de campos" },
  dNumTarj: { tipo: "numero", minimo: 4, maximo: 4, decimales: 0, referencia: "Reglas de campos" },
  iCondCred: { tipo: "numero", minimo: 1, maximo: 1, decimales: 0, referencia: "Reglas de campos" },
  dPlazoCre: { tipo: "texto", minimo: 2, maximo: 15, decimales: 0, referencia: "Reglas de campos" },
  dCuotas: { tipo: "numero", minimo: 1, maximo: 3, decimales: 0, referencia: "Reglas de campos" },
  dInfoEmi: {
    tipo: "texto",
    minimo: 1,
    maximo: 3000,
    decimales: 0,
    referencia: "B005",
  },
  dInfoFisc: {
    tipo: "texto",
    minimo: 1,
    maximo: 3000,
    decimales: 0,
    referencia: "B006",
  },
  iTiDE: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "C002",
  },
  dEst: {
    tipo: "numero",
    minimo: 3,
    maximo: 3,
    decimales: 0,
    referencia: "Numeración e identificación",
  },
  dPunExp: {
    tipo: "numero",
    minimo: 3,
    maximo: 3,
    decimales: 0,
    referencia: "Numeración e identificación",
  },
  dNumDoc: {
    tipo: "numero",
    minimo: 7,
    maximo: 7,
    decimales: 0,
    referencia: "Numeración e identificación",
  },
  dFeEmiDE: {
    tipo: "fecha",
    minimo: 19,
    maximo: 19,
    decimales: 0,
    referencia: "D002",
  },
  iTipTra: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "D011",
  },
  iTImp: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "D013",
  },
  cMoneOpe: {
    tipo: "letras",
    minimo: 3,
    maximo: 3,
    decimales: 0,
    referencia: "Catálogo ISO",
  },
  dCondTiCam: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "D017",
  },
  dTiCam: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 4,
    referencia: "Importes y cambio de moneda",
  },
  iNatRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "D201",
  },
  iTiOpe: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "D202",
  },
  cPaisRec: {
    tipo: "letras",
    minimo: 3,
    maximo: 3,
    decimales: 0,
    referencia: "Catálogo ISO",
  },
  iTiContRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "D205",
  },
  dRucRec: {
    tipo: "numero",
    minimo: 3,
    maximo: 8,
    decimales: 0,
    referencia: "Identificación tributaria",
  },
  dDVRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "Numeración e identificación",
  },
  dNumIDRec: {
    tipo: "texto",
    minimo: 1,
    maximo: 20,
    decimales: 0,
    referencia: "D210",
  },
  dNomRec: {
    tipo: "texto",
    minimo: 4,
    maximo: 255,
    decimales: 0,
    referencia: "D211",
  },
  dDirRec: {
    tipo: "texto",
    minimo: 1,
    maximo: 255,
    decimales: 0,
    referencia: "D213",
  },
  dNumCasRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 6,
    decimales: 0,
    referencia: "D218",
  },
  cDepRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "D219",
  },
  cDisRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 4,
    decimales: 0,
    referencia: "D221",
  },
  cCiuRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "D223",
  },
  dTelRec: {
    tipo: "texto",
    minimo: 6,
    maximo: 15,
    decimales: 0,
    referencia: "D214",
  },
  dCelRec: {
    tipo: "texto",
    minimo: 10,
    maximo: 20,
    decimales: 0,
    referencia: "D215",
  },
  dEmailRec: {
    tipo: "texto",
    minimo: 3,
    maximo: 80,
    decimales: 0,
    referencia: "D216",
  },
  iIndPres: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E011",
  },
  iNatVen: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E301",
  },
  dNumIDVen: {
    tipo: "texto",
    minimo: 1,
    maximo: 20,
    decimales: 0,
    referencia: "E306",
  },
  dNomVen: {
    tipo: "texto",
    minimo: 4,
    maximo: 60,
    decimales: 0,
    referencia: "E307",
  },
  dDirVen: {
    tipo: "texto",
    minimo: 1,
    maximo: 255,
    decimales: 0,
    referencia: "E308",
  },
  dNumCasVen: {
    tipo: "numero",
    minimo: 1,
    maximo: 6,
    decimales: 0,
    referencia: "E309",
  },
  cDepVen: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E310",
  },
  cDisVen: {
    tipo: "numero",
    minimo: 1,
    maximo: 4,
    decimales: 0,
    referencia: "E312",
  },
  cCiuVen: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "E314",
  },
  dDirProv: {
    tipo: "texto",
    minimo: 1,
    maximo: 255,
    decimales: 0,
    referencia: "E316",
  },
  cDepProv: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E317",
  },
  cDisProv: {
    tipo: "numero",
    minimo: 1,
    maximo: 4,
    decimales: 0,
    referencia: "E319",
  },
  cCiuProv: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "E321",
  },
  iMotEmi: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E401",
  },
  iMotEmiNR: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E501",
  },
  dDesMotEmiNR: {
    tipo: "texto",
    minimo: 5,
    maximo: 60,
    decimales: 0,
    referencia: "E502",
  },
  iRespEmiNR: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E503",
  },
  dKmR: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "E505",
  },
  dFecEm: {
    tipo: "fecha-dia",
    minimo: 10,
    maximo: 10,
    decimales: 0,
    referencia: "Fecha de traslado",
  },
  iCondOpe: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E601",
  },
  iTiPago: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E606",
  },
  dMonTiPag: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 4,
    referencia: "E608",
  },
  cMoneTiPag: {
    tipo: "letras",
    minimo: 3,
    maximo: 3,
    decimales: 0,
    referencia: "Catálogo ISO",
  },
  dTiCamTiPag: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 4,
    referencia: "E611",
  },
  dCodInt: {
    tipo: "texto",
    minimo: 1,
    maximo: 20,
    decimales: 0,
    referencia: "E701",
  },
  dDesProSer: {
    tipo: "texto",
    minimo: 1,
    maximo: 120,
    decimales: 0,
    referencia: "E708",
  },
  cUniMed: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "E709",
  },
  dCantProSer: {
    tipo: "numero",
    minimo: 1,
    maximo: 10,
    decimales: 8,
    referencia: "E711; NT 023",
  },
  dTiCamIt: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 4,
    referencia: "Importes y cambio de moneda",
  },
  iAfecIVA: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E731",
  },
  dPropIVA: {
    tipo: "numero",
    minimo: 1,
    maximo: 3,
    decimales: 8,
    referencia: "E733",
  },
  dTasaIVA: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E734",
  },
  dBasGravIVA: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "E735",
  },
  dLiqIVAItem: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "E736",
  },
  iTipTrans: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E901",
  },
  iModTrans: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E903",
  },
  iRespFlete: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E905",
  },
  dNuDespImp: {
    tipo: "texto",
    minimo: 16,
    maximo: 16,
    decimales: 0,
    referencia: "E908",
  },
  dDirLocSal: {
    tipo: "texto",
    minimo: 1,
    maximo: 255,
    decimales: 0,
    referencia: "E921",
  },
  dNumCasSal: {
    tipo: "numero",
    minimo: 1,
    maximo: 6,
    decimales: 0,
    referencia: "E922",
  },
  cDepSal: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E925",
  },
  cDisSal: {
    tipo: "numero",
    minimo: 1,
    maximo: 4,
    decimales: 0,
    referencia: "E927",
  },
  cCiuSal: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "E929",
  },
  dDirLocEnt: {
    tipo: "texto",
    minimo: 1,
    maximo: 255,
    decimales: 0,
    referencia: "E941",
  },
  dNumCasEnt: {
    tipo: "numero",
    minimo: 1,
    maximo: 6,
    decimales: 0,
    referencia: "E942",
  },
  cDepEnt: {
    tipo: "numero",
    minimo: 1,
    maximo: 2,
    decimales: 0,
    referencia: "E945",
  },
  cDisEnt: {
    tipo: "numero",
    minimo: 1,
    maximo: 4,
    decimales: 0,
    referencia: "E947",
  },
  cCiuEnt: {
    tipo: "numero",
    minimo: 1,
    maximo: 5,
    decimales: 0,
    referencia: "E949",
  },
  iNatTrans: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E981",
  },
  dNomTrans: {
    tipo: "texto",
    minimo: 4,
    maximo: 60,
    decimales: 0,
    referencia: "E982",
  },
  dRucTrans: {
    tipo: "numero",
    minimo: 3,
    maximo: 8,
    decimales: 0,
    referencia: "Identificación tributaria",
  },
  dDVTrans: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "Numeración e identificación",
  },
  iTipIDTrans: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "E985",
  },
  dNumIDTrans: {
    tipo: "texto",
    minimo: 1,
    maximo: 20,
    decimales: 0,
    referencia: "E987",
  },
  dNumIDChof: {
    tipo: "texto",
    minimo: 1,
    maximo: 20,
    decimales: 0,
    referencia: "E990",
  },
  dNomChof: {
    tipo: "texto",
    minimo: 4,
    maximo: 60,
    decimales: 0,
    referencia: "E991",
  },
  dSubExe: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F002",
  },
  dSubExo: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F003",
  },
  dSub5: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F004",
  },
  dSub10: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F005",
  },
  dTotOpe: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F008",
  },
  dTotDesc: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F009",
  },
  dTotDescGlotem: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F033",
  },
  dTotAntItem: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F034",
  },
  dTotAnt: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F035",
  },
  dPorcDescTotal: {
    tipo: "numero",
    minimo: 1,
    maximo: 3,
    decimales: 8,
    referencia: "F010",
  },
  dDescTotal: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F011",
  },
  dAnticipo: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F012",
  },
  dRedon: {
    tipo: "numero",
    minimo: 1,
    maximo: 3,
    decimales: 4,
    referencia: "F013",
  },
  dTotGralOpe: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F014",
  },
  dIVA5: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F015",
  },
  dIVA10: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F016",
  },
  dTotIVA: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F017",
  },
  dBaseGrav5: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F018",
  },
  dBaseGrav10: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F019",
  },
  dTBasGraIVA: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F020",
  },
  dTotalGs: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "F023",
  },
  iTipDocAso: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "H002",
  },
  dCdCDERef: {
    tipo: "numero",
    minimo: 44,
    maximo: 44,
    decimales: 0,
    referencia: "Numeración e identificación",
  },
  iTipIDRec: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "Catálogo documental",
  },
  iTipIDVen: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "Catálogo documental",
  },
  dPUniProSer: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "Importes y cambio de moneda",
  },
  dTotBruOpeItem: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "Importes y cambio de moneda",
  },
  dTotOpeItem: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "Importes y cambio de moneda",
  },
  dBaseExe: {
    tipo: "numero",
    minimo: 1,
    maximo: 15,
    decimales: 8,
    referencia: "Importes y cambio de moneda",
  },
  tipOpe: {
    tipo: "numero",
    minimo: 1,
    maximo: 1,
    decimales: 0,
    referencia: "API middleware v1.1",
  },
};

/** Devuelve el formato conocido sin inventar restricciones para claves de otra API. */
export function formatoCampo(codigo: string): FormatoCampo | undefined {
  return formatos[codigo];
}

/** Describe el formato al lado de la entrada; los decimales utilizan punto. */
export function descripcionFormato(codigo: string) {
  const f = formatoCampo(codigo);
  if (!f) return "";
  if (f.tipo === "fecha") return "Fecha y hora: AAAA-MM-DDThh:mm:ss.";
  if (f.tipo === "fecha-dia") return "Fecha: AAAA-MM-DD.";
  if (f.tipo === "numero" && f.decimales)
    return `Hasta ${f.maximo} dígitos enteros y ${f.decimales} decimales; sin separadores de miles.`;
  return `${f.tipo === "numero" ? "Dígitos" : f.tipo === "letras" ? "Letras mayúsculas" : "Texto"}: ${f.minimo === f.maximo ? f.maximo : f.minimo + " a " + f.maximo} caracteres.`;
}

/** Revisa datos sin recortar nombres o eliminar caracteres silenciosamente. */
export function errorFormato(codigo: string, valor: unknown): string {
  if (valor === "" || valor == null) return "";
  if (typeof valor !== "string" && typeof valor !== "number")
    return "Debe contener texto o un número, no un objeto.";
  const f = formatoCampo(codigo);
  if (!f) return "";
  const texto = String(valor);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(texto))
    return "Contiene caracteres no admitidos en el registro.";
  if (f.tipo === "fecha" || f.tipo === "fecha-dia") {
    const patron =
      f.tipo === "fecha"
        ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
        : /^\d{4}-\d{2}-\d{2}$/;
    const fecha = new Date(texto.slice(0, 10) + "T00:00:00Z");
    if (
      !patron.test(texto) ||
      Number.isNaN(Date.parse(texto)) ||
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== texto.slice(0, 10)
    )
      return descripcionFormato(codigo);
    return "";
  }
  if (f.tipo === "numero") {
    const patron = new RegExp(
      `^\\d{${f.minimo},${f.maximo}}${f.decimales ? `(\\.\\d{1,${f.decimales}})?` : ""}$`,
    );
    if (!patron.test(texto)) return descripcionFormato(codigo);
  } else {
    const largo = [...texto].length;
    if (largo < f.minimo || largo > f.maximo) return descripcionFormato(codigo);
    if (f.tipo === "letras" && !/^[A-Z]+$/.test(texto))
      return descripcionFormato(codigo);
  }
  if (codigo === "dCantProSer" && Number(texto) <= 0)
    return "La cantidad debe ser mayor que cero.";
  if (codigo === "dEmailRec" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto))
    return "Ingresá un correo válido.";
  return "";
}
