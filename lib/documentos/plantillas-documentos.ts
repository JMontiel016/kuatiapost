/** Plantillas vacías por tipo de documento. Los ejemplos pertenecen a la ayuda, no a los datos. */
// Plantillas de la integración: valores vacíos, nombres basados en el proyecto de referencia.
export const tiposDocumento = [
  { id: "1", name: "Factura", short: "FC" },
  { id: "5", name: "Nota de crédito", short: "NC" },
  { id: "6", name: "Nota de débito", short: "ND" },
  { id: "7", name: "Nota de remisión", short: "NR" },
  { id: "4", name: "Autofactura", short: "AF" },
];
/** Convierte una lista de códigos en campos con cadenas vacías. */
const blank = (fields: string) =>
  Object.fromEntries(fields.split(" ").map((k) => [k, ""]));
/** Crea una plantilla nueva y no reutiliza datos de otro cliente o documento. */
export function crearPlantilla(type: string) {
  // Cabecera común: los códigos conservan su nombre esperado por la integración.
  const common = blank(
    "tipOpe iTiDE dEst dPunExp dNumDoc dFeEmiDE dInfoEmi dInfoFisc iTipTra iTImp cMoneOpe dCondTiCam dTiCam iIndPres dDesIndPres iNatRec iTiOpe cPaisRec iTiContRec dRucRec dDVRec iTipIDRec dDTipIDRec dNumIDRec dNomRec dDirRec dNumCasRec cDepRec cDisRec cCiuRec dTelRec dCelRec dEmailRec",
  );

  // Cada documento tiene su propia cabecera: no se exponen campos de otros tipos.
  if (!["1", "4"].includes(type)) delete common.iTipTra;
  if (type !== "1") delete common.iIndPres;
  if (type === "7") for (const codigo of ["iTImp", "cMoneOpe", "dCondTiCam", "dTiCam"]) delete common[codigo];

  // Primera fila de productos: agregar filas no modifica esta definición.
  const item = blank(
    "dCodInt dDesProSer cUniMed dCantProSer dPUniProSer dTotBruOpeItem dTotOpeItem iAfecIVA dPropIVA dTasaIVA dBasGravIVA dLiqIVAItem dBaseExe dTiCamIt",
  );

  if (type === "7") for (const codigo of ["dPUniProSer", "dTotBruOpeItem", "dTotOpeItem", "iAfecIVA", "dPropIVA", "dTasaIVA", "dBasGravIVA", "dLiqIVAItem", "dBaseExe", "dTiCamIt"]) delete item[codigo];

  // Solo se agregan los grupos propios del tipo seleccionado.
  let extra: any = {};
  if (type === "1")
    extra = {
      ...blank("iCondOpe iCondCred dPlazoCre dCuotas dMonEnt"),
      Pagos: [blank("iTiPago dDesTiPag dMonTiPag cMoneTiPag dTiCamTiPag dNumCheq dBcoEmi iDenTarj dDesDenTarj iForProPa dRSProTar dRUCProTar dDVProTar dCodAuOpe dNomTit dNumTarj")],
    };
  if (["5", "6"].includes(type))
    extra = {
      iMotEmi: "",
      DocumentosAsociados: [blank("iTipDocAso dCdCDERef")],
    };
  if (type === "7")
    extra = {
      ...blank("iMotEmiNR dDesMotEmiNR iRespEmiNR dKmR dFecEm"),
      Transporte: [
        blank(
          "iTipTrans iModTrans iRespFlete dNuDespImp iNatTrans dNomTrans dRucTrans dDVTrans iTipIDTrans dNumIDTrans dNomChof dNumIDChof",
        ),
      ],
      Salida: [blank("dDirLocSal dNumCasSal cDepSal cDisSal cCiuSal")],
      Entrega: [blank("dDirLocEnt dNumCasEnt cDepEnt cDisEnt cCiuEnt")],
    };
  if (type === "4")
    extra = { ...blank("iCondOpe iCondCred dPlazoCre dCuotas dMonEnt"), Pagos: [blank("iTiPago dDesTiPag dMonTiPag cMoneTiPag dTiCamTiPag dNumCheq dBcoEmi iDenTarj dDesDenTarj iForProPa dRSProTar dRUCProTar dDVProTar dCodAuOpe dNomTit dNumTarj")], ...blank(
      "iNatVen iTipIDVen dNumIDVen dNomVen dDirVen dNumCasVen cDepVen cDisVen cCiuVen dDirProv cDepProv cDisProv cCiuProv",
    ) };

  // La remisión no contiene el grupo de importes de venta.
  return {
    ...common,
    ...extra,
    // La operación y el tipo proceden de la selección, no de datos ficticios.
    tipOpe: "1",
    iTiDE: type,
    Detalles: [item],
    ...(type === "7"
      ? {}
      : {
          Subtotales: [
            blank(
              "dSubExe dSubExo dSub5 dSub10 dTotOpe dTotDesc dTotDescGlotem dTotAntItem dTotAnt dPorcDescTotal dDescTotal dAnticipo dRedon dTotGralOpe dIVA5 dIVA10 dTotIVA dBaseGrav5 dBaseGrav10 dTBasGraIVA dTotalGs",
            ),
          ],
        }),
  };
}
