/** Contrato de eventos del Middleware Futura100 v1.1 (tipOpe 5, 6 y 7). */
export type TipoEvento = "cancelacion" | "inutilizacion" | "nominacion";
export type ModoCancelacion = "numero" | "cdc";
export type ErrorCampo = { campo: string; mensaje: string };
export const eventos = [
 {id:"cancelacion",nombre:"Cancelación",codigo:"5",descripcion:"Cancelar un documento por numeración o ingresando su CDC."},
 {id:"inutilizacion",nombre:"Inutilización",codigo:"6",descripcion:"Inutilizar un número o un rango no utilizado."},
 {id:"nominacion",nombre:"Nominación",codigo:"7",descripcion:"Informar los datos del receptor del documento identificado por CDC."},
] as const;
export const plantillasEvento: Record<TipoEvento,Record<string,unknown>> = {
 cancelacion:{tipOpe:"5",dEst:"",dPunExp:"",dNumDoc:"",mOtEve:"",tipoDoc:"FE"},
 inutilizacion:{tipOpe:"6",dEst:"",dPunExp:"",dNumIn:"",dNumFin:"",mOtEve:"",tipoDoc:"FE"},
 nominacion:{tipOpe:"7",cdc:"",mOtEve:"",iNatRec:"1",iTiOpe:"1",cPaisRec:"PRY",iTiContRec:"2",
 dRucRec:"",dDVRec:"",iTipIDRec:null,dNumIDRec:null,dNomRec:"",dNomFanRec:null,dDirRec:"",
 dNumCasRec:"0",cDepRec:null,cDisRec:null,cCiuRec:null,dTelRec:null,dCelRec:null,dEmailRec:null,dCodCliente:null},
};
const tiposCdc:Record<string,string>={"01":"FE","04":"AUT","05":"NCR","06":"NDE","07":"REM"};
const tiposPermitidos = new Set(["FE","AUT","NCR","NDE","REM"]);
/** SIFEN CDC: DV módulo 11, pesos 2 a 11 de derecha a izquierda. */
export function digitoVerificadorCdc(cdcSinDv:string):number{
 if(!/^\d{43}$/.test(cdcSinDv))throw Error("El CDC debe tener 43 dígitos previos al dígito verificador.");
 let suma=0;
 for(let i=42,peso=2;i>=0;i--,peso=peso===11?2:peso+1)suma+=Number(cdcSinDv[i])*peso;
 const resto=suma%11; return resto>1?11-resto:0;
}
/** El middleware de cancelación no documenta cdc: se derivan los parámetros admitidos. */
export function extraerDocumentoDeCdc(cdc:string){
 if(!/^\d{44}$/.test(cdc))throw Error("El CDC debe contener exactamente 44 dígitos numéricos.");
 if(Number(cdc[43])!==digitoVerificadorCdc(cdc.slice(0,43)))
  throw Error("El dígito verificador del CDC no coincide. Revisá los 44 dígitos.");
 const tipoDoc=tiposCdc[cdc.slice(0,2)];
 if(!tipoDoc)throw Error("El tipo de documento del CDC no está admitido por la integración.");
 return {tipoDoc,dEst:cdc.slice(11,14),dPunExp:cdc.slice(14,17),dNumDoc:cdc.slice(17,24)};
}
export function validarEvento(tipo:TipoEvento,datos:Record<string,unknown>,cdcCancelacion?:string):ErrorCampo[]{
 const errores:ErrorCampo[]=[];
 const agregar=(campo:string,mensaje:string)=>errores.push({campo,mensaje});
 const requerido=(campo:string,nombre:string)=>{
  if(typeof datos[campo]!=="string"||!(datos[campo] as string).trim())agregar(campo,"Completá "+nombre+".");
 };
 const longitud=(campo:string,n:number,nombre:string)=>{
  if(!new RegExp("^\\d{"+n+"}$").test(String(datos[campo]??"")))
   agregar(campo,nombre+": ingresá "+n+" dígitos numéricos.");
 };
 const operacion={cancelacion:"5",inutilizacion:"6",nominacion:"7"}[tipo];
 if(datos.tipOpe!==operacion)agregar("tipOpe",'La operación debe tener tipOpe = "'+operacion+'".');
 requerido("mOtEve","el motivo del evento");
 if(tipo!=="nominacion"){
  longitud("dEst",3,"Establecimiento");
  longitud("dPunExp",3,"Punto de expedición");
  if(!tiposPermitidos.has(String(datos.tipoDoc??"")))agregar("tipoDoc","Seleccioná un tipo de documento válido.");
  if(tipo==="cancelacion")longitud("dNumDoc",7,"Número de documento");
  else{
   longitud("dNumIn",7,"Numeración inicial");longitud("dNumFin",7,"Numeración final");
   if(/^\d{7}$/.test(String(datos.dNumIn))&&/^\d{7}$/.test(String(datos.dNumFin))&&
    String(datos.dNumIn)>String(datos.dNumFin))agregar("dNumFin","La numeración final no puede ser menor que la inicial.");
  }
  if(tipo==="cancelacion"&&cdcCancelacion!==undefined){
   try{
    const extraido=extraerDocumentoDeCdc(cdcCancelacion);
    for(const campo of ["dEst","dPunExp","dNumDoc","tipoDoc"] as const)
     if(datos[campo]!==extraido[campo])agregar("cdc","El JSON no coincide con el CDC. Volvé a ingresar el CDC.");
   }catch(e){agregar("cdc",(e as Error).message);}
  }
 }else{
  longitud("cdc",44,"CDC");
  if(/^\d{44}$/.test(String(datos.cdc??""))){
   try{extraerDocumentoDeCdc(String(datos.cdc));}catch(e){agregar("cdc",(e as Error).message);}
  }
  for(const campo of ["iNatRec","iTiOpe","cPaisRec","iTiContRec","dNomRec"])requerido(campo,campo);
  if(String(datos.iTiContRec)==="2"){requerido("dRucRec","RUC del receptor");requerido("dDVRec","DV del receptor");}
 }
 return errores;
}
export function referenciaEvento(tipo:TipoEvento,datos:Record<string,unknown>,cdcCancelacion?:string):string{
 if(tipo==="cancelacion"&&cdcCancelacion)return "CDC "+cdcCancelacion;
 if(tipo==="nominacion")return "CDC "+String(datos.cdc??"");
 const n=tipo==="cancelacion"?String(datos.dNumDoc??""):String(datos.dNumIn??"")+" a "+String(datos.dNumFin??"");
 return String(datos.dEst??"")+"-"+String(datos.dPunExp??"")+"-"+n;
}
export function erroresMiddleware(data:unknown):ErrorCampo[]{
 if(!data||typeof data!=="object")return [{campo:"general",mensaje:"El servicio no devolvió respuesta válida."}];
 const obj=data as Record<string,unknown>,valor=obj.message??obj.errors??"Operación rechazada por el servicio.";
 const salida:ErrorCampo[]=[];
 const visitar=(v:unknown,campo:string,nivel:number):void=>{
  if(nivel>3||salida.length>30)return;
  if(typeof v==="string"){if(v.trim())salida.push({campo,mensaje:v});}
  else if(Array.isArray(v))v.forEach(x=>visitar(x,campo,nivel+1));
  else if(v&&typeof v==="object")Object.entries(v).forEach(([k,x])=>visitar(x,k,nivel+1));
 };
 visitar(valor,"general",0);
 if(!salida.length)salida.push({campo:"general",mensaje:"Operación rechazada por el servicio."});
 return salida;
}
