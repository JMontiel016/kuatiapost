"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, ClipboardCheck, FileText, Search, UserRound, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import ConsultarDocumento from "./ConsultarDocumento";
import { validarDatosCancelacion, interpretarResultado } from "../../lib/eventos/cancelacion";
import { parseObject, request, safeUrl } from "../../lib/integracion/solicitudes-integracion";
import { paises } from "../../lib/documentos/catalogo-paises";

type TipoEvento = "cancelacion" | "inutilizacion" | "nominacion";
type Datos = Record<string,string>;
const TIPOS_DOC = [["FE","Factura"],["NCR","Nota de crédito"],["NDE","Nota de débito"],["REM","Nota de remisión"],["AUT","Autofactura"]];
const CAMPOS_NOMINACION: {id:string;label:string;required?:boolean;hint?:string}[] = [
  {id:"cdc",label:"CDC del documento",required:true,hint:"44 dígitos"},
  {id:"iNatRec",label:"Naturaleza del receptor",required:true},
  {id:"iTiOpe",label:"Tipo de operación",required:true},
  {id:"cPaisRec",label:"País del receptor (ISO-3)",required:true},
  {id:"iTiContRec",label:"Tipo de contribuyente",required:true},
  {id:"dRucRec",label:"RUC receptor",required:true},
  {id:"dDVRec",label:"DV receptor",required:true},
  {id:"dNomRec",label:"Nombre / razón social",required:true},
  {id:"dDirRec",label:"Dirección"},
  {id:"dNumCasRec",label:"Número de casa"},
  {id:"iTipIDRec",label:"Tipo de identificación",required:true},
  {id:"dDTipIDRec",label:"Descripción de la identificación",required:true},
  {id:"dNumIDRec",label:"Número de identificación",required:true},
  {id:"dTelRec",label:"Teléfono"},
  {id:"dEmailRec",label:"Correo electrónico"},
];
const iniciales: Record<TipoEvento, Datos> = {
  cancelacion: { modo:"numero",tipoDoc:"FE", dEst:"",dPunExp:"",dNumDoc:"",cdc:"",mOtEve:"" },
  inutilizacion: { tipoDoc:"FE", dEst:"",dPunExp:"",dNumIni:"",dNumFin:"",mOtEve:"" },
  nominacion: { cdc:"",iNatRec:"1",iTiOpe:"1",cPaisRec:"PRY",iTiContRec:"2",dRucRec:"",dDVRec:"",dNomRec:"",dDirRec:"",dNumCasRec:"0",iTipIDRec:"",dNumIDRec:"",dTelRec:"",dEmailRec:"",mOtEve:"" },
};
const CLAVE="kuatiapost.eventos.consultas.v2";
const soloDigitos=(s:string,n:number)=>s.replace(/\D/g,"").slice(0,n);
const largoExacto=(s:string,n:number)=>new RegExp(`^\\d{${n}}$`).test(s);
const aplicaCampo = (id: string, datos: Datos) => {
  if (["iTiContRec", "dRucRec", "dDVRec"].includes(id)) return datos.iNatRec === "1";
  if (id === "dDTipIDRec") return datos.iNatRec === "2" && datos.iTipIDRec === "9";
  if (["iTipIDRec", "dNumIDRec"].includes(id)) return datos.iNatRec === "2";
  return true;
};
const jsonDe=(tipo:TipoEvento,d:Datos)=>{
  if(tipo==="cancelacion") return d.modo==="cdc"?{tipOpe:"5",cdc:d.cdc.trim(),mOtEve:d.mOtEve.trim()}: {tipOpe:"5",dEst:d.dEst,dPunExp:d.dPunExp,dNumDoc:d.dNumDoc,mOtEve:d.mOtEve.trim(),tipoDoc:d.tipoDoc};
  if(tipo==="inutilizacion") return {tipOpe:"6",dEst:d.dEst,dPunExp:d.dPunExp,dNumIni:d.dNumIni,dNumFin:d.dNumFin,mOtEve:d.mOtEve.trim(),tipoDoc:d.tipoDoc};
  const out:Record<string,unknown>={tipOpe:"7"};
  for(const {id} of CAMPOS_NOMINACION) if(aplicaCampo(id,d) && d[id]?.trim()) out[id]=d[id].trim();
  out.mOtEve=d.mOtEve.trim();
  return out;
};
const validar=(tipo:TipoEvento,d:Datos):string[]=>{
  const e:string[]=[];
  if(tipo==="cancelacion"&&d.modo==="cdc"){
    if(!largoExacto(d.cdc,44))e.push("El CDC debe tener exactamente 44 dígitos.");
  } else if(tipo!=="nominacion"){
    if(!largoExacto(d.dEst,3))e.push("Establecimiento: ingresá 3 dígitos.");
    if(!largoExacto(d.dPunExp,3))e.push("Punto de expedición: ingresá 3 dígitos.");
    if(tipo==="cancelacion"&&!largoExacto(d.dNumDoc,7))e.push("Número del documento: ingresá 7 dígitos.");
    if(tipo==="inutilizacion") {
      if(!largoExacto(d.dNumIni,7)||!largoExacto(d.dNumFin,7))e.push("Los números inicial y final requieren 7 dígitos.");
      else if(Number(d.dNumIni) < 1 || Number(d.dNumFin)<Number(d.dNumIni))e.push("El rango debe comenzar en 1 o más, y el número final debe ser igual o superior al inicial.");
      else if(Number(d.dNumFin)-Number(d.dNumIni)>=1000)e.push("Podés inutilizar hasta 1.000 números por evento.");
    }
    if(!TIPOS_DOC.some(([v])=>v===d.tipoDoc))e.push("Seleccioná un tipo de documento válido.");
  } else {
    if(!/^01\d{42}$/.test(d.cdc)) e.push("Ingresá el CDC de 44 dígitos de la factura innominada.");
    if(!["1","2"].includes(d.iNatRec))e.push("Seleccioná la naturaleza del receptor.");
    if(!["1","2","3","4"].includes(d.iTiOpe))e.push("Ingresá un tipo de operación del 1 al 4.");
    if(!paises.some(pais=>pais.codigo===d.cPaisRec))e.push("País: ingresá un código ISO-3 de tres letras.");
    if(d.iTiOpe==="4" && (d.iNatRec!=="2" || d.cPaisRec==="PRY"))e.push("Para servicios al exterior, indicá un receptor no contribuyente y un país distinto de Paraguay.");
    // Los datos de identificación dependen de la naturaleza del receptor.
    if(d.iNatRec==="1") {
      if(!/^\d{1,8}$/.test(d.dRucRec))e.push("Informá el RUC del receptor contribuyente.");
      if(!/^\d$/.test(d.dDVRec))e.push("Informá el DV del receptor contribuyente.");
      if(!["1","2"].includes(d.iTiContRec))e.push("Elegí el tipo de contribuyente.");
    } else {
      if(!["1","2","3","4","6","9"].includes(d.iTipIDRec) || !d.dNumIDRec.trim() || d.dNumIDRec.trim().length > 20)
        e.push("Informá un tipo de identificación válido y un número de hasta 20 caracteres.");
      if(d.iTipIDRec==="9" && (!d.dDTipIDRec?.trim() || d.dDTipIDRec.trim().length>41))
        e.push("Describí el tipo de identificación en hasta 41 caracteres.");
    }
    if(!d.dNomRec.trim())e.push("Informá el nombre o razón social del receptor.");
  }
  e.push(...validarDatosCancelacion("0".repeat(44), d.mOtEve.trim()));
  return e;
};
const etiquetas:Record<TipoEvento,{titulo:string,descripcion:string,op:string}>= {
  cancelacion:{titulo:"Cancelación",descripcion:"Cancelar un documento por numeración o ingresando su CDC.",op:"5"},
  inutilizacion:{titulo:"Inutilización",descripcion:"Inutilizar un número o un rango no utilizado.",op:"6"},
  nominacion:{titulo:"Nominación",descripcion:"Informar los datos del receptor del documento identificado por CDC.",op:"7"},
};

type ConsultaProps=React.ComponentProps<typeof ConsultarDocumento>;
type Resultado = { referencia: string; texto: string; detalle?: string; fecha: string; http?: number };
const textoVisible = (texto: string) => texto.replace(/\bSIFEN\b/gi, "servicio fiscal");

export default function EventosConsultas({consulta,token,url}: {consulta:ConsultaProps;token:string;url:string}) {
  const [pestana,setPestana]=useState<"consulta"|"eventos">("consulta");
  const [tipo,setTipo]=useState<TipoEvento>("cancelacion");
  const [formularios,setFormularios]=useState<Record<TipoEvento,Datos>>(()=>structuredClone(iniciales));
  const [jsonEditado,setJsonEditado]=useState<Record<TipoEvento,string>>({cancelacion:"",inutilizacion:"",nominacion:""});
  const [verJson,setVerJson]=useState(false);
  const [mensaje,setMensaje]=useState("");
  const [errores,setErrores]=useState<string[]>([]);
  const [resultados,setResultados]=useState<Partial<Record<TipoEvento, Resultado[]>>>({});
  const [ocupado,setOcupado]=useState(false);
  const enCurso=useRef(false);
  const enviados=useRef(new Set<string>());
  const [listo,setListo]=useState(false);
  useEffect(()=>{
    try {
      const s=localStorage.getItem(CLAVE);if(!s)return;
      const obj=JSON.parse(s);
      if(obj.formularios) setFormularios(Object.fromEntries((Object.keys(iniciales) as TipoEvento[]).map(k=>[k,{...iniciales[k],...(obj.formularios[k]||{})}])) as Record<TipoEvento,Datos>);
      if(obj.pestana==="eventos")setPestana("eventos");
      if(Object.keys(iniciales).includes(obj.tipo))setTipo(obj.tipo);
      if(obj.jsonEditado)setJsonEditado({...{cancelacion:"",inutilizacion:"",nominacion:""},...obj.jsonEditado});
    } catch {} finally {setListo(true);}
  },[]);
  useEffect(()=>{if(!listo)return;try{localStorage.setItem(CLAVE,JSON.stringify({pestana,tipo,formularios,jsonEditado}));}catch{}},[pestana,tipo,formularios,jsonEditado,listo]);
  const datos=formularios[tipo];
  const json=useMemo(()=>jsonEditado[tipo]||JSON.stringify(jsonDe(tipo,datos),null,2),[tipo,datos,jsonEditado]);
  function cambiar(id:string,valor:string){
    setFormularios(p=>({...p,[tipo]:{...p[tipo],[id]:valor}}));
    setJsonEditado(p=>({...p,[tipo]:""}));setErrores([]);setMensaje("");
  }
  function seleccionar(t:TipoEvento){setTipo(t);setVerJson(false);setErrores([]);setMensaje("");}
  function preparar(){
    let erroresNuevos=validar(tipo,datos);
    try{
      const obj=JSON.parse(json);
      if(obj.tipOpe!==etiquetas[tipo].op) erroresNuevos.push("El tipo de operación del JSON no coincide con el evento.");
      if(obj.mOtEve!==datos.mOtEve.trim())erroresNuevos.push("El motivo del JSON no coincide con el formulario.");
      if(!erroresNuevos.length){const normal=jsonDe(tipo,datos) as Record<string,unknown>;for(const k of Object.keys(normal))if(String(obj[k]??"")!==String(normal[k]??""))erroresNuevos.push(`El campo ${k} del JSON no coincide con el formulario.`);}
    }catch{erroresNuevos.push("El JSON no es válido. Revisá su sintaxis.");}
    setErrores(erroresNuevos);if(erroresNuevos.length){setMensaje("Revisá los campos indicados.");return;}
    setJsonEditado(p=>({...p,[tipo]:JSON.stringify(jsonDe(tipo,datos),null,2)}));setVerJson(true);
    setMensaje("JSON preparado. Revisalo antes de enviar.");
  }
  function nuevo(){
    setFormularios(prev=>({...prev,[tipo]:{...iniciales[tipo]}}));
    setJsonEditado(prev=>({...prev,[tipo]:""}));
    setVerJson(false);setErrores([]);setMensaje("");
  }
  async function enviar(){
    if(enCurso.current)return;
    try{
      if(!token.trim())throw Error("Ingresá el token en Configuración.");
      const destino=safeUrl(url);
      const problemas=validar(tipo,datos);
      const solicitud=parseObject(json);
      const original=jsonDe(tipo,datos) as Record<string,unknown>;
      for(const [campo,valor] of Object.entries(original))
        if(solicitud[campo]!==valor)problemas.push(`El campo ${campo} del JSON debe coincidir con el formulario.`);
      if(problemas.length){setErrores(problemas);return;}
      const referencia=datos.modo==="cdc"||tipo==="nominacion"?datos.cdc:
        [datos.tipoDoc,datos.dEst,datos.dPunExp,tipo==="inutilizacion"?`${datos.dNumIni} a ${datos.dNumFin}`:datos.dNumDoc].join(" · ");
      const clave=JSON.stringify([destino,tipo,referencia]);
      if(enviados.current.has(clave))throw Error("Ya hay un resultado registrado o pendiente para este evento. Consultá su estado.");
      if(!window.confirm(`¿Confirmás enviar ${etiquetas[tipo].titulo.toLowerCase()} para ${referencia}?`))return;
      enCurso.current=true;setOcupado(true);enviados.current.add(clave);setErrores([]);setMensaje("");
      const registrar=(resultado:Omit<Resultado,"referencia"|"fecha">)=>setResultados(prev=>({
        ...prev,[tipo]:[{...resultado,referencia,fecha:new Date().toLocaleString("es-PY")},...(prev[tipo]??[])],
      }));
      try{
        const res=await request(destino,"POST",solicitud,token);
        const respuesta=res.data;
        const resultado=interpretarResultado(res.http,respuesta);
        const exito=res.http>=200&&res.http<300&&respuesta?.status==="success"&&
          /^evento registrado (correctamente|exitosamente)[.!]?$/i.test(String(respuesta.message??"").trim());
        const rechazado=res.http<500&&(resultado.estado==="rechazado"||respuesta?.status==="error");
        if(rechazado&&!resultado.texto.includes("4003"))enviados.current.delete(clave);
        const texto=res.http>=500?"El resultado está pendiente de confirmación. Consultá el estado antes de reenviar.":
          rechazado? (resultado.estado==="rechazado"?resultado.texto:"El servicio rechazó el evento.") :
          exito?"Evento registrado correctamente.":resultado.texto;
        registrar({texto:textoVisible(texto),http:res.http,detalle:textoVisible(JSON.stringify(respuesta,null,2)??"")});
      }catch(error){
        registrar({texto:textoVisible(`${(error as Error).message} Consultá el estado antes de reenviar.`)});
      }finally{enCurso.current=false;setOcupado(false);}
    }catch(error){setErrores([textoVisible((error as Error).message)]);}
  }
  function volverFormulario(){
    try{
      const obj=JSON.parse(json);
      const campos:Datos={...datos};
      for(const [k,v] of Object.entries(obj))if(k!=="tipOpe"&&typeof v==="string")campos[k]=v;
      setFormularios(p=>({...p,[tipo]:campos}));setJsonEditado(p=>({...p,[tipo]:""}));
      setVerJson(false);setMensaje("");setErrores([]);
    }catch{setMensaje("Corregí la sintaxis del JSON antes de volver a los campos.");}
  }
  const input=(id:string,label:string,length?:number,required=true)=> <label className="field" key={id}><span>{label}{required&& <b className="asterisco"> *</b>}</span><input value={datos[id]||""} inputMode={length?"numeric":undefined} maxLength={length} onChange={e=>cambiar(id,length?soloDigitos(e.target.value,length):e.target.value)}/>{length&&<small>{length} dígitos, incluyendo ceros iniciales.</small>}</label>;
  const selector=<label className="field"><span>Tipo de documento <b className="asterisco">*</b></span><select value={datos.tipoDoc} onChange={e=>cambiar("tipoDoc",e.target.value)}>{TIPOS_DOC.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>;
  return <div className="eventos-consultas">
    <div className="page-heading"><div><div className="eyebrow">DATOS EMITIDOS</div><h1>Eventos / Consultas</h1><p>Consultá estados y KUDE, o aplicá eventos a documentos electrónicos.</p></div></div>
    <div className="eventos-pestanas"><button type="button" className={pestana==="consulta"?"activo":""} onClick={()=>setPestana("consulta")}><Search size={15}/> Consultas y KUDE</button><button type="button" className={pestana==="eventos"?"activo":""} onClick={()=>setPestana("eventos")}><FileText size={15}/> Eventos</button></div>
    {pestana==="consulta"?<div className="consulta-integrada"><ConsultarDocumento {...consulta}/></div>:<>
    <div className="eventos-tipos">{(["cancelacion","inutilizacion","nominacion"] as TipoEvento[]).map((t,i)=>{const Icon=[FileText,Ban,UserRound][i];return <button type="button" key={t} className={t===tipo?"activo":""} onClick={()=>seleccionar(t)}><Icon size={16}/><span><strong>{etiquetas[t].titulo}</strong><small>{etiquetas[t].descripcion}</small></span></button>})}</div>
    <section className="panel eventos-formulario"><div className="eventos-formulario-head"><div><div className="eyebrow">EVENTO · OPERACIÓN {etiquetas[tipo].op}</div><h2>{etiquetas[tipo].titulo}</h2><p>{etiquetas[tipo].descripcion}</p></div><button type="button" className="outline" disabled={ocupado} onClick={nuevo}>Nuevo evento</button></div>
    {!verJson?<>
      {tipo==="cancelacion"&&<div className="eventos-modos"><button className={datos.modo==="numero"?"activo":""} onClick={()=>cambiar("modo","numero")}>Por numeración</button><button className={datos.modo==="cdc"?"activo":""} onClick={()=>cambiar("modo","cdc")}>Por CDC</button></div>}
      <div className="eventos-campos">
        {tipo==="cancelacion"&&(datos.modo==="cdc"?input("cdc","CDC del documento",44):<>{selector}{input("dEst","(dEst) Establecimiento",3)}{input("dPunExp","(dPunExp) Punto de expedición",3)}{input("dNumDoc","(dNumDoc) Número de documento",7)}</>)}
        {tipo==="inutilizacion"&&<>{selector}{input("dEst","(dEst) Establecimiento",3)}{input("dPunExp","(dPunExp) Punto de expedición",3)}{input("dNumIni","(dNumIni) Numeración inicial",7)}{input("dNumFin","(dNumFin) Numeración final",7)}</>}
        {tipo==="nominacion"&&CAMPOS_NOMINACION.filter(f=>aplicaCampo(f.id,datos)).map(f=> <label className="field" key={f.id}><span>{f.label}{f.required&&<b className="asterisco"> *</b>}</span>{f.id==="iNatRec"?<select value={datos[f.id]} onChange={e=>cambiar(f.id,e.target.value)}><option value="1">1 · Contribuyente</option><option value="2">2 · No contribuyente</option></select>:f.id==="iTiContRec"?<select value={datos[f.id]} onChange={e=>cambiar(f.id,e.target.value)}><option value="1">1 · Persona física</option><option value="2">2 · Persona jurídica</option></select>:<input value={datos[f.id]||""} onChange={e=>cambiar(f.id,f.id==="cdc"?soloDigitos(e.target.value,44):e.target.value)}/>}</label>)}
      </div>
      <label className="field eventos-motivo"><span>(mOtEve) Motivo del evento <b className="asterisco">*</b></span><textarea value={datos.mOtEve} maxLength={500} rows={3} placeholder="Escribí el motivo de este evento" onChange={e=>cambiar("mOtEve",e.target.value)}/><small>Texto libre, sin autocompletar · 5 a 500 caracteres.</small></label>
    </>:null}
    {verJson&&<div className="eventos-json"><div className="eventos-json-cabecera"><strong>JSON del evento · editable</strong><button className="outline" onClick={volverFormulario}><ArrowLeft size={14}/> Volver a completar campos</button></div><textarea spellCheck={false} aria-label="JSON editable del evento" value={json} onChange={e=>{setJsonEditado(p=>({...p,[tipo]:e.target.value}));setMensaje("");}} rows={12}/></div>}
    {errores.length>0&&<div role="alert" className="eventos-errores">{errores.map((e,i)=><p key={i}><AlertTriangle size={14}/>{e}</p>)}</div>}
    {mensaje&&<p role="status" className="eventos-mensaje">{mensaje}</p>}
    <div className="eventos-pie"><span><AlertTriangle size={15}/> Revisá la numeración y los datos fiscales antes de continuar.</span><button className="primary" disabled={ocupado} onClick={preparar}><ClipboardCheck size={16}/> Validar y preparar {etiquetas[tipo].titulo.toLowerCase()}</button>{verJson&&<button type="button" className="outline" disabled={ocupado} onClick={()=>void enviar()}>{ocupado?"Enviando…":"Enviar evento"}</button>}</div>
    {resultados[tipo]?.map((resultado,i)=><article className="eventos-mensaje" key={i}>
      <strong>{resultado.texto}</strong><p>{resultado.referencia} · {resultado.fecha}{resultado.http ? ` · HTTP ${resultado.http}` : ""}</p>
      {resultado.detalle&&<details><summary>Ver respuesta del servicio</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{resultado.detalle}</pre></details>}
    </article>)}
    </section></>}
  </div>;
}
