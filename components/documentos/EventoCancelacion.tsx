"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileJson, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { crearBorradorCancelacion, formularioInicial, interpretarResultado, motivoFinal, razonesSugeridas, validarBorradorCancelacion, validarDatosCancelacion, type FormCancelacion } from "../../lib/eventos/cancelacion";
import { pretty, request } from "../../lib/integracion/solicitudes-integracion";

const CLAVE = "kuatiapost.evento-cancelacion.v1";
type Resultado = { estado: "borrador"|"aprobado"|"rechazado"|"incierto"; texto:string; http?:number; respuesta?:unknown; fecha:string; cdc:string };
type Props = { token: string; setNotice: (text: string, tipo?: string)=>void };
function restaurar(): {form: FormCancelacion; resultado: Resultado|null} {
  try {
    const parsed=JSON.parse(localStorage.getItem(CLAVE)||"null");
    if (parsed && typeof parsed === "object") return {
      form: { ...formularioInicial, ...parsed.form }, resultado: parsed.resultado || null,
    };
  } catch {}
  return {form: formularioInicial,resultado:null};
}

export default function EventoCancelacion({ token, setNotice }: Props) {
  const [form,setForm]=useState<FormCancelacion>(formularioInicial);
  const [resultado,setResultado]=useState<Resultado|null>(null);
  const [hidratado,setHidratado]=useState(false);
  const [editando,setEditando]=useState(false);
  const [ocupado,setOcupado]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{const estado=restaurar();setForm(estado.form);setResultado(estado.resultado);setHidratado(true);},[]);
  useEffect(()=>{
    if(!hidratado)return;
    try {localStorage.setItem(CLAVE,JSON.stringify({form,resultado}));} catch { /* Espacio o almacenamiento bloqueado. */ }
  },[form,resultado,hidratado]);
  const motivo=useMemo(()=>motivoFinal(form),[form]);
  const problemas=useMemo(()=>validarDatosCancelacion(form.cdc,motivo),[form.cdc,motivo]);
  function cambiar(campo:keyof FormCancelacion,valor:string){
    setForm(anterior=>({...anterior,[campo]:valor,json:campo==="json" ? valor : ""}));
    if(campo!=="json")setEditando(false);
    setError("");
  }
  function preparar(){
    try {const datos=crearBorradorCancelacion(form.cdc,motivo);setForm(v=>({...v,json:pretty(datos)}));setEditando(true);setError("");}
    catch(e:any){setError(e.message);}
  }
  async function enviar(){
    if(ocupado)return;
    setError("");
    try {
      if(!form.url.trim()) throw Error("Informá la URL del servicio de eventos de cancelación en HTTPS.");
      if(!token.trim())throw Error("Ingresá el token de tu servicio en Configuración.");
      if(!form.json) throw Error("Primero prepará y revisá el JSON del evento.");
      if(resultado && resultado.cdc===form.cdc && ["aprobado","incierto"].includes(resultado.estado))
        throw Error("Este CDC tiene una cancelación informada o de resultado incierto. Verificá el estado anterior antes de iniciar otra solicitud.");
      const cuerpo=validarBorradorCancelacion(form.json,form.cdc,motivo);
      if(!window.confirm(`Vas a solicitar la cancelación del CDC ${form.cdc}. Es un evento fiscal. ¿Confirmás el envío a la API que configuraste?`))return;
      const pendiente:Resultado={estado:"incierto",texto:"Envío iniciado. Si se interrumpe, verificá el resultado antes de reintentar.",fecha:new Date().toLocaleString("es-PY"),cdc:form.cdc};
      setResultado(pendiente);
      // Registrar el estado incierto antes de llamar a la API para desalentar duplicaciones.
      try{localStorage.setItem(CLAVE,JSON.stringify({form,resultado:pendiente}));}catch{}
      setOcupado(true);
      try {
        const res=await request(form.url,"POST",cuerpo,token);
        const interpretado=interpretarResultado(res.http,res.data);
        setResultado({...interpretado,http:res.http,respuesta:res.data,fecha:new Date().toLocaleString("es-PY"),cdc:form.cdc});
        setNotice(interpretado.texto,interpretado.estado==="aprobado"?"success":interpretado.estado==="rechazado"?"error":"warning");
      } catch(e:any) {
        setResultado({...pendiente,texto:`No se confirmó el resultado de envío: ${e.message || "error de conexión"}. Consultá antes de reenviar.`});
        throw e;
      } finally {setOcupado(false);}
    } catch(e:any){setError(e.message || "No se completó la operación.");}
  }
  function reiniciar(){
    if(!window.confirm("¿Vaciar el formulario de cancelación y su última respuesta en este navegador? Esta acción no cancela ni revierte eventos en SIFEN."))return;
    setForm(formularioInicial);setResultado(null);setError("");setEditando(false);
  }
  return <div className="evento-cancelacion">
    <div className="page-heading"><div><div className="eyebrow">EVENTOS · SIFEN</div><h1>Cancelación de documento</h1>
      <p>Prepará y verificá el evento con su CDC y una justificación. La cancelación no es una nota de crédito.</p></div></div>
    <div className="evento-grid">
      <section className="panel evento-panel">
        <div className="evento-panel-head"><div><h2>Solicitud de cancelación</h2><p>Tipo de evento <strong>1 · Cancelación</strong> (GDE006)</p></div><button type="button" className="outline" onClick={reiniciar}><RotateCcw size={15}/> Nuevo</button></div>
        <div className="evento-fields">
          <label className="field"><span>CDC del documento electrónico *</span>
            <input inputMode="numeric" maxLength={44} value={form.cdc} onChange={e=>cambiar("cdc",e.target.value.replace(/\D/g,"").slice(0,44))} placeholder="44 dígitos del CDC" aria-invalid={!!form.cdc && !/^\d{44}$/.test(form.cdc)}/><small>{form.cdc.length}/44 · identificador del DTE (GEC002)</small></label>
          <label className="field"><span>Motivo de cancelación *</span>
            <select value={form.opcion} onChange={e=>cambiar("opcion",e.target.value)}>
              <option value="">Seleccioná un motivo</option>{razonesSugeridas.map(x=><option key={x.id} value={x.id}>{x.etiqueta}</option>)}
            </select><small>La lista ofrece textos sugeridos, no códigos oficiales de motivo.</small></label>
          {(form.opcion==="otro" || (!form.opcion && !!form.motivoManual)) && <label className="field evento-ancho"><span>Especificar motivo · campo libre *</span>
            <textarea rows={3} maxLength={500} placeholder="Describí concretamente por qué se solicita la cancelación..." value={form.motivoManual} onChange={e=>cambiar("motivoManual",e.target.value)}/>
            <small>{form.motivoManual.trim().length}/500 caracteres · mínimo 5 y máximo 500 (GEC003)</small></label>}
          {!!form.opcion && form.opcion!=="otro" && <div className="evento-motivo-previo"><span>Justificación que se informará</span><p>{motivo}</p></div>}
          <label className="field evento-ancho"><span>URL de la API de eventos *</span>
            <input type="url" value={form.url} onChange={e=>cambiar("url",e.target.value)} placeholder="https://tu-integracion.com/api/eventos/cancelacion"/>
            <small>Debe ser el endpoint específico que procesa y firma eventos. No uses la URL de emisión de facturas sin verificar su contrato.</small></label>
        </div>
        {error && <div className="evento-alerta error" role="alert"><XCircle size={18}/>{error}</div>}
        <div className="evento-acciones"><button className="outline" onClick={preparar}><FileJson size={16}/> Validar y ver JSON</button>
          <button disabled={!form.json || ocupado || problemas.length>0} className="primary" onClick={()=>void enviar()}><Send size={16}/>{ocupado?"Procesando…":"Enviar cancelación"}</button></div>
        {editando && <div className="evento-json"><div className="evento-panel-head"><strong>JSON editable del evento</strong><button className="text-button" onClick={()=>setEditando(false)}>Volver a completar campos</button></div>
          <p>Representación editable de los campos SIFEN, <strong>no es XML firmado</strong>. Confirmá que tu servicio admite este contrato antes de enviar.</p>
          <textarea spellCheck={false} aria-label="JSON del evento de cancelación" rows={10} value={form.json} onChange={e=>cambiar("json",e.target.value)}/></div>}
      </section>
      <aside className="evento-lateral"><section className="panel evento-panel"><h3><ShieldCheck size={17}/> Revisión previa</h3>
        <p>CDC correcto en longitud, motivo descriptivo entre 5 y 500 caracteres y JSON revisable.</p>
        <p>La aprobación del documento y los plazos de cancelación (48 h para FE; 168 h para otros DTE aplicables) deben comprobarse con SIFEN.</p>
        {problemas.map((mensaje,i)=><div key={i} className="evento-error-linea"><AlertTriangle size={15}/>{mensaje}</div>)}
        {!problemas.length && <div className="evento-criterio"><ClipboardCheck size={17}/> Campos principales completos</div>}
      </section>
      {resultado && <section className="panel evento-panel"><h3>{resultado.estado==="aprobado"?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>} Último resultado</h3>
        <span className={`evento-estado ${resultado.estado}`}>{resultado.estado.toUpperCase()}</span>
        <p>{resultado.texto}</p><small>CDC {resultado.cdc} · {resultado.fecha}{resultado.http?` · HTTP ${resultado.http}`:""}</small>
        {resultado.respuesta!==undefined && <details><summary>Ver respuesta técnica</summary><pre>{pretty(resultado.respuesta)}</pre></details>}
      </section>}
      </aside>
    </div>
  </div>;
}
