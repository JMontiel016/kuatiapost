"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileX2, Ban, UserRound, Send, X, Code2 } from "lucide-react";
import { eventos, plantillasEvento, validarEvento, referenciaEvento, type TipoEvento } from "../../lib/integracion/eventos-futura";
import { pretty, parseObject, request } from "../../lib/integracion/solicitudes-integracion";
import { tiposConsulta } from "../../lib/integracion/consulta-kude";
type Props={url:string;token:string;ocupado:boolean;setOcupado:(v:boolean)=>void;avisar:(s:string,t?:string)=>void;alRegistrar:(r:any)=>void};
export default function EventosDocumento({url,token,ocupado,setOcupado,avisar,alRegistrar}:Props){
 const [tipo,setTipo]=useState<TipoEvento>("cancelacion");
 const [borradores,setBorradores]=useState<Record<TipoEvento,string>>({
 cancelacion:pretty(plantillasEvento.cancelacion),inutilizacion:pretty(plantillasEvento.inutilizacion),nominacion:pretty(plantillasEvento.nominacion)});
 const [mostrarJson,setMostrarJson]=useState(false);
 const [confirmacion,setConfirmacion]=useState<{datos:Record<string,unknown>;referencia:string}|null>(null);
 const [respuesta,setRespuesta]=useState<any>(null);
 const texto=borradores[tipo];
 let datos:Record<string,any>={};let errorJson="";
 try{datos=parseObject(texto)}catch(e:any){errorJson=e.message}
 const editar=(clave:string,valor:unknown)=>setBorradores(v=>({...v,[tipo]:pretty({...datos,[clave]:valor})}));
 const seleccionar=(t:TipoEvento)=>{setTipo(t);setRespuesta(null);setConfirmacion(null)};
 useEffect(()=>{if(!confirmacion)return;const tecla=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!ocupado)setConfirmacion(null)};document.addEventListener("keydown",tecla);return()=>document.removeEventListener("keydown",tecla)},[confirmacion,ocupado]);
 const preparar=()=>{
  if(errorJson){avisar(errorJson,"error");return}
  const errores=validarEvento(tipo,datos);
  if(errores.length){avisar(errores.join(" "),"warning");return}
  if(!url.trim()||!token.trim()){avisar("Configurá la URL de operación y el token antes de aplicar un evento.","warning");return}
  setConfirmacion({datos:{...datos},referencia:referenciaEvento(tipo,datos)});
 };
 const enviar=async()=>{
  if(!confirmacion||ocupado)return;
  setOcupado(true);
  const solicitud=confirmacion.datos;setConfirmacion(null);
  try{
   const resultado=await request(url,"POST",solicitud,token);
   setRespuesta(resultado);
   alRegistrar({id:crypto.randomUUID(),date:new Date().toLocaleString("es-PY"),type:"Evento "+tipo,operation:"Evento "+tipo,request:solicitud,response:resultado,url});
   const fallo=resultado.http<200||resultado.http>=300||resultado.data?.status!=="success";
   if(fallo){
    const msg=resultado.data?.message;
    const detalle=typeof msg==="string"?msg:typeof msg==="object"?JSON.stringify(msg):"Verificá la respuesta del middleware.";
    avisar("El evento no fue confirmado por el servicio. "+detalle,"error");
   }else avisar("Evento registrado correctamente por el middleware. Verificá la respuesta fiscal cuando corresponda.","success");
  }catch(e:any){avisar(e?.message||"No se pudo enviar el evento.","error")}
  finally{setOcupado(false)}
 };
 const iconos={cancelacion:FileX2,inutilizacion:Ban,nominacion:UserRound};
 const descripcion=eventos.find(e=>e.id===tipo)!;
 const campo=(clave:string,etiqueta:string,opts:{largo?:number;requerido?:boolean;ayuda?:string;numero?:boolean}={})=><label className="field" key={clave}><span>{etiqueta}{opts.requerido!==false&&<b className="asterisco"> *</b>}</span><input value={String(datos[clave]??"")} inputMode={opts.numero?"numeric":undefined} maxLength={opts.largo} onChange={e=>editar(clave,opts.numero?e.target.value.replace(/\D/g,""):e.target.value)} aria-label={etiqueta}/>{opts.ayuda&&<small>{opts.ayuda}</small>}</label>;
 return <section className="eventos-seccion">
 <div className="eventos-selector" role="tablist" aria-label="Tipos de eventos">{eventos.map(e=>{const Icon=iconos[e.id];return <button type="button" role="tab" aria-selected={tipo===e.id} className={tipo===e.id?"evento-tab elegido":"evento-tab"} key={e.id} onClick={()=>seleccionar(e.id)}><Icon size={19}/><span><strong>{e.nombre}</strong><small>{e.descripcion}</small></span></button>})}</div>
 <section className="panel eventos-formulario">
 <div className="eventos-encabezado"><div><div className="eyebrow">EVENTO · OPERACIÓN {descripcion.codigo}</div><h2>{descripcion.nombre}</h2><p>{descripcion.descripcion}</p></div><button className="outline" type="button" onClick={()=>setMostrarJson(!mostrarJson)}><Code2 size={16}/>{mostrarJson?"Ocultar JSON":"Ver JSON"}</button></div>
 {errorJson&&<p role="alert" className="eventos-error">JSON inválido: {errorJson}</p>}
 {tipo!=="nominacion"?<div className="consulta-campos eventos-campos">
 <label className="field"><span>Tipo de documento *</span><select value={String(datos.tipoDoc??"FE")} onChange={e=>editar("tipoDoc",e.target.value)}>{tiposConsulta.map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></label>
 {campo("dEst","(dEst) Establecimiento",{largo:3,numero:true,ayuda:"3 dígitos, con ceros iniciales"})}
 {campo("dPunExp","(dPunExp) Punto de expedición",{largo:3,numero:true,ayuda:"3 dígitos, con ceros iniciales"})}
 {tipo==="cancelacion"?campo("dNumDoc","(dNumDoc) Número de documento",{largo:7,numero:true,ayuda:"7 dígitos, con ceros iniciales"}):<>{campo("dNumIn","(dNumIn) Numeración inicial",{largo:7,numero:true})}{campo("dNumFin","(dNumFin) Numeración final",{largo:7,numero:true})}</>}
 </div>:<><div className="eventos-campos-nominacion">{campo("cdc","CDC del documento",{largo:44,numero:true})}{campo("iNatRec","Naturaleza del receptor (iNatRec)")}{campo("iTiOpe","Tipo de operación (iTiOpe)")}{campo("cPaisRec","País del receptor (cPaisRec)")}{campo("iTiContRec","Tipo de contribuyente (iTiContRec)")}{campo("dRucRec","RUC receptor (dRucRec)",{requerido:String(datos.iTiContRec)==="2"})}{campo("dDVRec","DV receptor (dDVRec)",{requerido:String(datos.iTiContRec)==="2"})}{campo("dNomRec","Nombre / razón social (dNomRec)")}{campo("dDirRec","Dirección (dDirRec)",{requerido:false})}{campo("dNumCasRec","Número de casa (dNumCasRec)",{requerido:false})}</div><p className="tiny">Los códigos se conservan editables según el manual. Los demás campos del receptor, incluidos valores nulos, están disponibles en el JSON avanzado.</p></>}
 <label className="field eventos-motivo"><span>(mOtEve) Motivo del evento <b className="asterisco">*</b></span><textarea rows={3} value={String(datos.mOtEve??"")} onChange={e=>editar("mOtEve",e.target.value)} placeholder="Explicá el motivo de este evento"/></label>
 {mostrarJson&&<label className="field eventos-json"><span>JSON del evento · editable</span><textarea value={texto} onChange={e=>setBorradores(v=>({...v,[tipo]:e.target.value}))} spellCheck={false} rows={15}/><small>Se enviará el JSON indicado, luego de validarlo y confirmarlo.</small></label>}
 <div className="eventos-barra"><p><AlertTriangle size={16}/>Esta operación puede afectar un documento fiscal. Revisá la numeración antes de continuar.</p><button className="primary" type="button" disabled={ocupado||!!errorJson} onClick={preparar}><Send size={17}/>Preparar {descripcion.nombre.toLowerCase()}</button></div>
 </section>
 {respuesta&&<section className="panel consulta-resultado"><div className="panel-top"><strong>Respuesta del evento</strong><span className={"badge "+(respuesta.http>=200&&respuesta.http<300&&respuesta.data?.status==="success"?"success":"warning")}>{respuesta.data?.status||"HTTP "+respuesta.http}</span></div><p>{typeof respuesta.data?.message==="string"?respuesta.data.message:"Revisá el detalle enviado por el middleware."}</p><details><summary>Ver respuesta completa</summary><pre className="response-code">{JSON.stringify(respuesta.data,null,2)}</pre></details></section>}
 {confirmacion&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!ocupado)setConfirmacion(null)}}><div className="modal eventos-confirmacion" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-evento"><div className="eventos-icono-alerta"><AlertTriangle size={25}/></div><h2 id="confirmar-evento">¿Querés aplicar el evento de {descripcion.nombre.toLowerCase()}?</h2><p>Vas a solicitar la operación sobre el siguiente documento o rango:</p><div className="eventos-referencia">{confirmacion.referencia}</div><p><strong>Motivo:</strong> {String(confirmacion.datos.mOtEve)}</p><p className="eventos-atencion">La confirmación enviará la solicitud real al middleware. No es una simulación.</p><div className="consulta-acciones eventos-botones"><button className="outline" autoFocus type="button" onClick={()=>setConfirmacion(null)}><X size={16}/>Volver y revisar</button><button className="primary" disabled={ocupado} onClick={enviar}><CheckCircle2 size={17}/>Sí, aplicar evento</button></div></div></div>}
 </section>;
}
