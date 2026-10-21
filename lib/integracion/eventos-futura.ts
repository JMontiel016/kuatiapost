/** Contrato de eventos documentado por Futura100 Middleware v1.1, páginas 8 a 11. */
export type TipoEvento = "cancelacion" | "inutilizacion" | "nominacion";
export const eventos = [
  {id:"cancelacion",nombre:"Cancelación",codigo:"5",descripcion:"Solicitar la cancelación de un documento electrónico por su numeración."},
  {id:"inutilizacion",nombre:"Inutilización",codigo:"6",descripcion:"Inutilizar un número o rango de numeración no utilizado."},
  {id:"nominacion",nombre:"Nominación",codigo:"7",descripcion:"Informar datos del receptor para un documento identificado por CDC."},
] as const;
export const plantillasEvento: Record<TipoEvento, Record<string,unknown>> = {
  cancelacion:{tipOpe:"5",dEst:"",dPunExp:"",dNumDoc:"",mOtEve:"",tipoDoc:"FE"},
  inutilizacion:{tipOpe:"6",dEst:"",dPunExp:"",dNumIn:"",dNumFin:"",mOtEve:"",tipoDoc:"FE"},
  nominacion:{tipOpe:"7",cdc:"",mOtEve:"",iNatRec:"1",iTiOpe:"1",cPaisRec:"PRY",iTiContRec:"2",dRucRec:"",dDVRec:"",iTipIDRec:null,dNumIDRec:null,dNomRec:"",dNomFanRec:null,dDirRec:"",dNumCasRec:"0",cDepRec:null,cDisRec:null,cCiuRec:null,dTelRec:null,dCelRec:null,dEmailRec:null,dCodCliente:null},
};
export function validarEvento(tipo:TipoEvento, datos:Record<string,unknown>):string[] {
 const errores:string[]=[];
 const obligatorio=(clave:string,nombre:string)=>{if(typeof datos[clave]!=="string"||!(datos[clave] as string).trim())errores.push("Completá "+nombre+".");};
 if(String(datos.tipOpe)!==({cancelacion:"5",inutilizacion:"6",nominacion:"7"}[tipo]))errores.push("El código de operación no coincide con el evento seleccionado.");
 if(tipo!=="nominacion"){
   for(const [key,n,nombre] of [["dEst",3,"establecimiento"],["dPunExp",3,"punto de expedición"]] as const)if(!new RegExp("^\\d{"+n+"}$").test(String(datos[key]??"")))errores.push("El campo "+nombre+" debe tener "+n+" dígitos.");
   if(!["FE","NCR","NDE","REM","AUT"].includes(String(datos.tipoDoc)))errores.push("Seleccioná un tipo de documento válido.");
   const claves=tipo==="cancelacion"?["dNumDoc"]:["dNumIn","dNumFin"];
   for(const clave of claves)if(!/^\d{7}$/.test(String(datos[clave]??"")))errores.push("El campo "+clave+" debe tener 7 dígitos.");
   if(tipo==="inutilizacion"&&/^\d{7}$/.test(String(datos.dNumIn))&&/^\d{7}$/.test(String(datos.dNumFin))&&String(datos.dNumIn)>String(datos.dNumFin))errores.push("La numeración inicial no puede superar la final.");
 }else {
   if(!/^\d{44}$/.test(String(datos.cdc??"")))errores.push("El CDC debe contener exactamente 44 dígitos.");
   for(const clave of ["iNatRec","iTiOpe","cPaisRec","iTiContRec","dNomRec"])obligatorio(clave,clave);
   if(String(datos.iTiContRec)==="2"){obligatorio("dRucRec","RUC receptor");obligatorio("dDVRec","dígito verificador");}
 }
 obligatorio("mOtEve","el motivo");
 return errores;
}
export function referenciaEvento(tipo:TipoEvento,datos:Record<string,unknown>){
 if(tipo==="nominacion")return "CDC "+String(datos.cdc??"");
 const base=String(datos.dEst??"")+"-"+String(datos.dPunExp??"")+"-";
 return tipo==="cancelacion"?base+String(datos.dNumDoc??""):base+String(datos.dNumIn??"")+" a "+String(datos.dNumFin??"");
}
