"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileX2, Ban, UserRound, Send, X } from "lucide-react";
import { eventos, plantillasEvento, validarEvento, referenciaEvento, extraerDocumentoDeCdc, erroresMiddleware, type ErrorCampo, type TipoEvento, type ModoCancelacion } from "../../lib/integracion/eventos-futura";
import { pretty, parseObject, request } from "../../lib/integracion/solicitudes-integracion";
import { tiposConsulta } from "../../lib/integracion/consulta-kude";
type Props={url:string;token:string;ocupado:boolean;setOcupado:(v:boolean)=>void;avisar:(s:string,t?:string)=>void;alRegistrar:(r:any)=>void};
export default function EventosDocumento({url,token,ocupado,setOcupado,avisar,alRegistrar}:Props){
 const [tipo,setTipo]=useState<TipoEvento>("cancelacion");
 const [borradores,setBorradores]=useState<Record<TipoEvento,string>>({
 cancelacion:pretty(plantillasEvento.cancelacion),inutilizacion:pretty(plantillasEvento.inutilizacion),nominacion:pretty(plantillasEvento.nominacion)});
 const [modo,setModo]=useState<ModoCancelacion>("numero");
 const [cdcCancelacion,setCdcCancelacion]=useState("");
 const [verErrores,setVerErrores]=useState(false);
 const [erroresApi,setErroresApi]=useState<ErrorCampo[]>([]);
 const bloqueo=useRef(false);
 const [confirmacion,setConfirmacion]=useState<{datos:Record<string,unknown>;referencia:string}|null>(null);
 const [respuesta,setRespuesta]=useState<any>(null);
 const texto=borradores[tipo];
 let datos:Record<string,any>={};let errorJson="";
 try{datos=parseObject(texto)}catch(e:any){errorJson=e.message}
 const editar=(clave:string,valor:unknown)=>{setBorradores(v=>({...v,[tipo]:pretty({...datos,[clave]:valor})}));setErroresApi([])};
 const cambiarCdc=(valor:string)=>{
  const cdc=valor.replace(/\D/g,"").slice(0,44);setCdcCancelacion(cdc);
  let info:{tipoDoc:string;dEst:string;dPunExp:string;dNumDoc:string}={tipoDoc:"FE",dEst:"",dPunExp:"",dNumDoc:""};
  try{info=extraerDocumentoDeCdc(cdc)}catch{}
  setBorradores(v=>({...v,cancelacion:pretty({...datos,...info})}));setErroresApi([]);
 };
 const cambiarModo=(m:ModoCancelacion)=>{
  setModo(m);setVerErrores(false);setErroresApi([]);
  if(m==="cdc"){try{const info=extraerDocumentoDeCdc(cdcCancelacion);setBorradores(v=>({...v,cancelacion:pretty({...datos,...info})}));}catch{}}
 };
 const cdcEnUso=tipo==="cancelacion"&&modo==="cdc"?cdcCancelacion:undefined;
 const listaErrores=errorJson?[]:validarEvento(tipo,datos,cdcEnUso);
 const visibles=verErrores?[...listaErrores,...erroresApi]:erroresApi;
 const errorCampo=(campo:string)=>visibles.find(e=>e.campo===campo)?.mensaje;
 const seleccionar=(t:TipoEvento)=>{setTipo(t);setRespuesta(null);setConfirmacion(null);setVerErrores(false);setErroresApi([])};
 useEffect(()=>{if(!confirmacion)return;const tecla=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!ocupado)setConfirmacion(null)};document.addEventListener("keydown",tecla);return()=>document.removeEventListener("keydown",tecla)},[confirmacion,ocupado]);
 const preparar=()=>{
  setVerErrores(true);setErroresApi([]);
  if(errorJson){avisar(errorJson,"error");return}
  const errores=validarEvento(tipo,datos,cdcEnUso);
  if(errores.length){avisar("Revisá los campos marcados: "+errores.length+" validación(es) pendiente(s).","warning");return}
  if(!url.trim()||!token.trim()){avisar("Configurá la URL de operación y el token antes de aplicar un evento.","warning");return}
  setConfirmacion({datos:{...datos},referencia:referenciaEvento(tipo,datos,cdcEnUso)});
 };
 const enviar=async()=>{
  if(!confirmacion||ocupado||bloqueo.current)return;
  bloqueo.current=true;setOcupado(true);
  const solicitud=confirmacion.datos;setConfirmacion(null);
  try{
   const resultado=await request(url,"POST",solicitud,token);
   setRespuesta(resultado);
   alRegistrar({id:crypto.randomUUID(),date:new Date().toLocaleString("es-PY"),type:"Evento "+tipo,operation:"Evento "+tipo,request:solicitud,response:resultado,url});
   const fallo=resultado.http<200||resultado.http>=300||resultado.data?.status!=="success";
   if(fallo){
    setErroresApi(erroresMiddleware(resultado.data));setVerErrores(true);
    avisar("El middleware rechazó el evento. Revisá los errores y la respuesta.","error");
   }else avisar("Evento registrado correctamente por el middleware. Verificá la respuesta fiscal cuando corresponda.","success");
  }catch(e:any){avisar(e?.message||"No se pudo enviar el evento.","error")}
  finally{bloqueo.current=false;setOcupado(false)}
 };
 const iconos={cancelacion:FileX2,inutilizacion:Ban,nominacion:UserRound};
 const descripcion=eventos.find(e=>e.id===tipo)!;
 const campo=(clave:string,etiqueta:string,opts:{largo?:number;requerido?:boolean;ayuda?:string;numero?:boolean}={})=><label className="field evento-field" key={clave}><span>{etiqueta}{opts.requerido!==false&&<b className="asterisco"> *</b>}</span><input value={String(datos[clave]??"")} inputMode={opts.numero?"numeric":undefined} maxLength={opts.largo} onChange={e=>editar(clave,opts.numero?e.target.value.replace(/\D/g,""):e.target.value)} aria-label={etiqueta} aria-invalid={!!errorCampo(clave)}/>{opts.ayuda&&<small>{opts.ayuda}</small>}{errorCampo(clave)&&<small className="evento-error-campo" role="alert">{errorCampo(clave)}</small>}</label>;
 return <section className="eventos-seccion">
 <div className="eventos-selector" role="tablist" aria-label="Tipos de eventos">{eventos.map(e=>{const Icon=iconos[e.id];return <button type="button" role="tab" aria-selected={tipo===e.id} className={tipo===e.id?"evento-tab elegido":"evento-tab"} key={e.id} onClick={()=>seleccionar(e.id)}><Icon size={19}/><span><strong>{e.nombre}</strong><small>{e.descripcion}</small></span></button>})}</div>
 <section className="panel eventos-formulario">
 <div className="eventos-encabezado"><div><div className="eyebrow">EVENTO · OPERACIÓN {descripcion.codigo}</div><h2>{descripcion.nombre}</h2><p>{descripcion.descripcion}</p></div></div>
 {errorJson&&<p role="alert" className="evento-errores">JSON inválido: {errorJson}</p>}
 {visibles.length>0&&<div className="evento-errores" role="alert"><strong>Campos para corregir</strong><ul>{visibles.map((x,i)=><li key={i}>{x.campo!=="general"?x.campo+": ":""}{x.mensaje}</li>)}</ul></div>}
 {tipo==="cancelacion"&&<div className="evento-modo"><button type="button" className={modo==="numero"?"seleccionado":""} onClick={()=>cambiarModo("numero")}>Por numeración</button><button type="button" className={modo==="cdc"?"seleccionado":""} onClick={()=>cambiarModo("cdc")}>Por CDC</button></div>}
 {tipo==="cancelacion"&&modo==="cdc"&&<><label className="field evento-field eventos-cdc"><span>CDC del documento *</span><input inputMode="numeric" maxLength={44} value={cdcCancelacion} onChange={e=>cambiarCdc(e.target.value)} aria-invalid={!!errorCampo("cdc")} placeholder="Ingresá los 44 dígitos del CDC"/>{errorCampo("cdc")&&<small className="evento-error-campo" role="alert">{errorCampo("cdc")}</small>}</label><p className="evento-aclaracion">El middleware no recibe directamente el CDC para cancelar. Se extraen la numeración y el tipo del CDC y se muestran en el JSON que se enviará.</p></>}
 {tipo!=="nominacion"&&!(tipo==="cancelacion"&&modo==="cdc")?<div className="consulta-campos eventos-campos">
 <label className="field"><span>Tipo de documento *</span><select value={String(datos.tipoDoc??"FE")} onChange={e=>editar("tipoDoc",e.target.value)}>{tiposConsulta.map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></label>
 {campo("dEst","(dEst) Establecimiento",{largo:3,numero:true,ayuda:"3 dígitos, con ceros iniciales"})}
 {campo("dPunExp","(dPunExp) Punto de expedición",{largo:3,numero:true,ayuda:"3 dígitos, con ceros iniciales"})}
 {tipo==="cancelacion"?campo("dNumDoc","(dNumDoc) Número de documento",{largo:7,numero:true,ayuda:"7 dígitos, con ceros iniciales"}):<>{campo("dNumIn","(dNumIn) Numeración inicial",{largo:7,numero:true})}{campo("dNumFin","(dNumFin) Numeración final",{largo:7,numero:true})}</>}
 </div>:<><div className="eventos-campos-nominacion">{campo("cdc","CDC del documento",{largo:44,numero:true})}{campo("iNatRec","Naturaleza del receptor (iNatRec)")}{campo("iTiOpe","Tipo de operación (iTiOpe)")}{campo("cPaisRec","País del receptor (cPaisRec)")}{campo("iTiContRec","Tipo de contribuyente (iTiContRec)")}{campo("dRucRec","RUC receptor (dRucRec)",{requerido:String(datos.iTiContRec)==="2"})}{campo("dDVRec","DV receptor (dDVRec)",{requerido:String(datos.iTiContRec)==="2"})}{campo("dNomRec","Nombre / razón social (dNomRec)")}{campo("dDirRec","Dirección (dDirRec)",{requerido:false})}{campo("dNumCasRec","Número de casa (dNumCasRec)",{requerido:false})}</div><p className="tiny">Los códigos se conservan editables según el manual. Los demás campos del receptor, incluidos valores nulos, están disponibles en el JSON avanzado.</p></>}
 <label className="field evento-field eventos-motivo"><span>(mOtEve) Motivo del evento <b className="asterisco">*</b></span><textarea rows={3} value={String(datos.mOtEve??"")} onChange={e=>editar("mOtEve",e.target.value)} placeholder="Explicá el motivo de este evento" aria-invalid={!!errorCampo("mOtEve")}/>{errorCampo("mOtEve")&&<small className="evento-error-campo">{errorCampo("mOtEve")}</small>}</label>
 {<label className="field evento-field eventos-json"><span>JSON del evento · editable</span><textarea value={texto} onChange={e=>setBorradores(v=>({...v,[tipo]:e.target.value}))} spellCheck={false} rows={12}/><small>Este es el JSON exacto de la solicitud. Revisalo y ajustalo antes de confirmar.</small></label>}
 <div className="eventos-barra"><p><AlertTriangle size={16}/>Esta operación puede afectar un documento fiscal. Revisá la numeración antes de continuar.</p><button className="primary" type="button" disabled={ocupado||!!errorJson} onClick={preparar}><Send size={17}/>Preparar {descripcion.nombre.toLowerCase()}</button></div>
 </section>
 {respuesta&&<section className="panel consulta-resultado"><div className="panel-top"><strong>Respuesta del evento</strong><span className={"badge "+(respuesta.http>=200&&respuesta.http<300&&respuesta.data?.status==="success"?"success":"warning")}>{respuesta.data?.status||"HTTP "+respuesta.http}</span></div><p>{typeof respuesta.data?.message==="string"?respuesta.data.message:"Revisá el detalle enviado por el middleware."}</p><details open={respuesta.data?.status!=="success"}><summary>Ver respuesta completa</summary><pre className="response-code">{JSON.stringify(respuesta.data,null,2)}</pre></details></section>}
 {confirmacion&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!ocupado)setConfirmacion(null)}}><div className="modal eventos-confirmacion" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-evento"><div className="eventos-icono-alerta"><AlertTriangle size={25}/></div><h2 id="confirmar-evento">¿Querés aplicar el evento de {descripcion.nombre.toLowerCase()}?</h2><p>Vas a solicitar la operación sobre el siguiente documento o rango:</p><div className="eventos-referencia">{confirmacion.referencia}</div><p><strong>Motivo:</strong> {String(confirmacion.datos.mOtEve)}</p><p className="eventos-atencion">La confirmación enviará la solicitud real al middleware. No es una simulación.</p><div className="consulta-acciones eventos-botones"><button className="outline" autoFocus type="button" onClick={()=>setConfirmacion(null)}><X size={16}/>Volver y revisar</button><button className="primary" disabled={ocupado} onClick={enviar}><CheckCircle2 size={17}/>Sí, aplicar evento</button></div></div></div>}
 </section>;
}
