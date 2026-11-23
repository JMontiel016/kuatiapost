"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowRight, Check, CheckCheck, CheckCircle2, ChevronDown,
  ClipboardList, Copy, Download, FileCheck2, FileCode2,
  FileText, Files, FolderOpen, Info, Layers3, PackageCheck,
  PackageOpen, RefreshCcw, Search, ShieldCheck,
  Trash2, Upload, X,
} from "lucide-react";
import {
  analizarFactura, compararFacturas, claveLinea, crearBorradorNotaRemision, prepararNotaRemision, verificarBorradorNR,
  revisarCamposNR, crearDatosNR, actualizarDatoNR, catalogosNR,
  type DatosNR, type FacturaOrigen, type LineaFactura, type SeleccionLineas,
} from "../../lib/documentos/nota-remision-masiva";
import { pretty, parseObject } from "../../lib/integracion/solicitudes-integracion";
import SelectorGeografia, { type Ubicacion } from "./SelectorGeografia";
import SelectorPais from "./SelectorPais";
import { verificarUbicacion } from "../../lib/documentos/validar-geografia";

interface Props {
  onClose: () => void;
  setBody: (v: string) => void;
  setType: (v: "7") => void;
  setMode: (v: "emit") => void;
  setErrors: (v: string[]) => void;
  setNotice: (v: string, tipo?: string) => void;
  setView: (v: "workspace") => void;
  setEditorTab: (v: "json") => void;
  sessionData?: Record<string, any> | null;
  onSessionChange?: (datos: Record<string, any>) => void;
  oscuro?: boolean;
  onToggleTema?: () => void;
}
interface Registro { id: number; nombre: string; tamano: number; factura?: FacturaOrigen; error?: string }
const fechaLocal = () => {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const formatoPY = new Intl.NumberFormat("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 8 });
function num(v: string | undefined) {
  if (!v || !/^\d+(?:\.\d+)?$/.test(v)) return v || "—";
  const n = Number(v); return Number.isFinite(n) ? formatoPY.format(n) : v;
}
function aUnidades(value: string) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value) || !/[1-9]/.test(value)) return null;
  const [entero, frac = ""] = value.split(".");
  return BigInt(entero) * 100000000n + BigInt(frac.padEnd(8, "0") || "0");
}
function errorCantidad(cantidad: string, original: string) {
  const actual = aUnidades(cantidad);
  if (actual === null) return "Ingresá una cantidad positiva (máximo 8 decimales).";
  const limite = aUnidades(original);
  if (limite !== null && actual > limite) return "Supera la cantidad facturada.";
  return "";
}
function resumenFactura(f: FacturaOrigen) {
  return `${f.timbrado.establecimiento}-${f.timbrado.punto}-${f.timbrado.numero}`;
}
function descargar(nombre: string, texto: string, tipo: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", texto], { type: tipo }));
  const link = document.createElement("a"); link.href = url; link.download = nombre; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Selección masiva detallada. Los importes visualizados son referencia, no datos de la NR. */
export default function GenerarNotaRemisionMasiva({
  onClose, setBody, setType, setMode, setErrors, setNotice, setView, setEditorTab, sessionData, onSessionChange,
}: Props) {
  const archivosRef = useRef<HTMLInputElement>(null);
  const carpetaRef = useRef<HTMLInputElement>(null);
  const consecutivo = useRef(Math.max(0, ...(Array.isArray(sessionData?.registros) ? sessionData.registros.map((r: Registro) => Number(r.id) || 0) : [0])));
  const [registros, setRegistros] = useState<Registro[]>(Array.isArray(sessionData?.registros) ? sessionData.registros : []);
  const [principal, setPrincipal] = useState(typeof sessionData?.principal === "string" ? sessionData.principal : "");
  const [seleccion, setSeleccion] = useState<SeleccionLineas>(sessionData?.seleccion && typeof sessionData.seleccion === "object" ? sessionData.seleccion : {});
  const [jsonEditable, setJsonEditable] = useState(typeof sessionData?.jsonEditable === "string" ? sessionData.jsonEditable : "");
  const [datos, setDatos] = useState<DatosNR>({ ...crearDatosNR(fechaLocal()), ...(sessionData?.datos && typeof sessionData.datos === "object" ? sessionData.datos : {}) });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "incluidos" | "excluidos">("todos");
  const [mostrarJson, setMostrarJson] = useState(false);
  const [erroresCampos, setErroresCampos] = useState<string[]>([]);

  useEffect(() => {
    onSessionChange?.({ registros, principal, seleccion, jsonEditable, datos });
  }, [registros, principal, seleccion, jsonEditable, datos, onSessionChange]);
  useEffect(() => {
    const bloquear = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", bloquear);
    return () => window.removeEventListener("keydown", bloquear);
  }, [onClose]);

  const facturas = useMemo(() => registros.flatMap(r => r.factura ? [r.factura] : []), [registros]);
  const elegida = facturas.find(f => f.cdc === principal) || facturas[0] || null;
  const principalCDC = elegida?.cdc || "";
  const discrepancias = useMemo(() => {
    const salida = new Map<number, string[]>(); const vistos = new Set<string>();
    for (const registro of registros) {
      if (!registro.factura) continue;
      const errores: string[] = [];
      if (vistos.has(registro.factura.cdc)) errores.push("CDC repetido: esta factura ya fue agregada.");
      vistos.add(registro.factura.cdc);
      if (elegida) errores.push(...compararFacturas(elegida, registro.factura));
      if (errores.length) salida.set(registro.id, errores);
    }
    return salida;
  }, [registros, elegida]);
  const totalLineas = facturas.reduce((total, f) => total + f.lineas.length, 0);
  const activas = facturas.flatMap(f => f.lineas.map(l => ({ factura: f, linea: l, clave: claveLinea(f, l.indice), opcion: seleccion[claveLinea(f, l.indice)] }))).filter(r => r.opcion?.activo !== false);
  const seleccionadas = activas.length;
  const filasInvalidas = activas.filter(r => errorCantidad(r.opcion?.cantidad ?? r.linea.cantidad, r.linea.cantidad)).length;
  const problemas = registros.filter(r => r.error).length + discrepancias.size;
  const hayProblemas = problemas > 0 || filasInvalidas > 0;
  const listo = facturas.length > 0 && !hayProblemas && seleccionadas > 0;
  const partidasFiltradas = useMemo(() => facturas.map(f => ({
    factura: f,
    lineas: f.lineas.filter(l => {
      const clave = claveLinea(f, l.indice);
      if (filtro === "incluidos" && seleccion[clave]?.activo === false) return false;
      if (filtro === "excluidos" && seleccion[clave]?.activo !== false) return false;
      const texto = `${f.archivo} ${resumenFactura(f)} ${f.cdc} ${l.codigo} ${l.descripcion}`.toLocaleLowerCase("es-PY");
      return texto.includes(busqueda.toLocaleLowerCase("es-PY").trim());
    }),
  })).filter(g => g.lineas.length > 0), [facturas, filtro, seleccion, busqueda]);

  function invalidar() { setJsonEditable(""); setMensaje(""); setErroresCampos([]); }
  async function cargarArchivos(lista: FileList | null) {
    if (!lista?.length) return;
    const recibidos = Array.from(lista);
    const candidatos = recibidos.filter(f => /\.(xml|txt)$/i.test(f.name));
    const ignorados = recibidos.length - candidatos.length;
    if (!candidatos.length) { setMensaje("No encontramos archivos XML o TXT en la selección."); return; }
    if (registros.length + candidatos.length > 200) { setMensaje("Podés importar hasta 200 archivos por lote."); return; }
    if (registros.reduce((n,r) => n+r.tamano, 0) + candidatos.reduce((n,f) => n+f.size, 0) > 50_000_000) { setMensaje("El lote supera el máximo de 50 MB."); return; }
    setCargando(true); invalidar();
    try {
      const nuevos = await Promise.all(candidatos.map(async f => {
        const id = ++consecutivo.current;
        const nombre = f.webkitRelativePath || f.name;
        try {
          if (f.size > 10_000_000) throw Error("El archivo supera el máximo de 10 MB.");
          return { id, nombre, tamano: f.size, factura: analizarFactura(await f.text(), nombre) } as Registro;
        } catch (e) {
          return { id, nombre, tamano: f.size, error: e instanceof Error ? e.message : "No se pudo leer." } as Registro;
        }
      }));
      setRegistros(anteriores => [...anteriores, ...nuevos]);
      if (!principal) {
        const primera = nuevos.find(r => r.factura)?.factura;
        if (primera) setPrincipal(primera.cdc);
      }
      setMensaje(`${nuevos.filter(x => x.factura).length} de ${nuevos.length} archivos leídos correctamente.${ignorados ? ` ${ignorados} archivos omitidos por formato.` : ""} Revisá las validaciones antes de continuar.`);
    } finally { setCargando(false); }
  }
  function quitarRegistro(id: number) { setRegistros(prev => prev.filter(r => r.id !== id)); invalidar(); }
  function cambiarLinea(clave: string, cambios: {activo?: boolean; cantidad?: string}, original: string) {
    setSeleccion(prev => ({ ...prev, [clave]: {
      activo: cambios.activo ?? prev[clave]?.activo ?? true,
      cantidad: cambios.cantidad ?? prev[clave]?.cantidad ?? original,
    } }));
    invalidar();
  }
  function aplicarLote(modo: "incluir" | "excluir" | "restaurar") {
    setSeleccion(prev => {
      const nuevo = { ...prev };
      for (const f of facturas) for (const l of f.lineas) {
        const clave = claveLinea(f, l.indice);
        nuevo[clave] = { activo: modo === "restaurar" ? prev[clave]?.activo !== false : modo === "incluir", cantidad: modo === "restaurar" ? l.cantidad : prev[clave]?.cantidad ?? l.cantidad };
      }
      return nuevo;
    });
    invalidar();
  }
  function actualizarDato(campo: keyof DatosNR, valor: string) { setDatos(prev => actualizarDatoNR(prev, campo, valor)); invalidar(); }
  function modificarLugar(lado: "salida" | "entrega", cambios: Partial<Ubicacion>) {
    const mapa = { departamento:"Departamento", departamentoDesc:"DepartamentoDesc", distrito:"Distrito",
      distritoDesc:"DistritoDesc", ciudad:"Ciudad", ciudadDesc:"CiudadDesc" } as const;
    setDatos(prev => {
      const nuevo = { ...prev };
      for (const [clave,valor] of Object.entries(cambios)) {
        const sufijo = mapa[clave as keyof Ubicacion];
        if (sufijo) (nuevo as unknown as Record<string,string>)[`${lado}${sufijo}`] = valor;
      }
      return nuevo;
    });
    invalidar();
  }
  async function verificarLugares() {
    for (const lado of ["salida", "entrega"] as const) {
      const get = (sufijo:string) => String(datos[`${lado}${sufijo}` as keyof DatosNR] || "");
      await verificarUbicacion({departamento:get("Departamento"),departamentoDesc:get("DepartamentoDesc"),
        distrito:get("Distrito"),distritoDesc:get("DistritoDesc"),
        ciudad:get("Ciudad"),ciudadDesc:get("CiudadDesc")},
        lado === "salida" ? "Local de salida" : "Local de entrega");
    }
  }

  async function preparar() {
    try {
      if (!facturas.length) throw Error("Primero importá facturas XML/TXT.");
      if (problemas) throw Error("Corregí o quitá las facturas con errores de CDC, duplicados o datos del cliente distintos.");
      if (filasInvalidas) throw Error(`Corregí ${filasInvalidas} cantidad(es) inválida(s) en los productos.`);
      const fallos = revisarCamposNR(datos, elegida || undefined);
      if (fallos.length) { setErroresCampos(fallos); throw Error(`Revisá ${fallos.length} campo(s) del formulario antes de continuar.`); }
      await verificarLugares();
      const resultado = prepararNotaRemision(facturas, principalCDC, seleccion, datos);
      if (jsonEditable.trim()) verificarBorradorNR(parseObject(jsonEditable), facturas, principalCDC, seleccion, datos);
      if (!jsonEditable.trim()) setJsonEditable(pretty(resultado));
      setMostrarJson(true);
      setMensaje("Borrador de NR preparado. Completá y revisá los datos de transporte, salida y entrega antes de emitir.");
    } catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo preparar la NR."); }
  }
  function usar() {
    try {
      const doc = jsonEditable.trim()
        ? parseObject(jsonEditable)
        : crearBorradorNotaRemision(facturas, principalCDC, seleccion, datos);
      if (doc.iTiDE != null && doc.iTiDE !== "" && String(doc.iTiDE) !== "7") {
        throw Error("La nota de remisión debe tener iTiDE=7.");
      }
      if (doc.iTiDE == null || doc.iTiDE === "") doc.iTiDE = "7";
      setBody(pretty(doc)); setType("7"); setMode("emit"); setErrors([]); setView("workspace");
      setEditorTab("json");
      setNotice("Borrador de NR abierto en el editor.", "success");
      onClose();
    } catch (e) { setMensaje(e instanceof Error ? e.message : "Revisá el borrador JSON."); }
  }
  function exportarCSV() {
    const cabecera = ["Archivo", "CDC de origen", "Línea", "Código", "Descripción", "Unidad", "Cantidad factura", "Cantidad NR", "Precio unitario (solo referencia)"];
    const celda = (v: string) => {
      const seguro = /^[=+@-]/.test(v) ? "'" + v : v;
      return `"${seguro.replace(/"/g, '""')}"`;
    };
    const filas = [cabecera.map(celda).join(";")];
    for (const f of facturas) for (const l of f.lineas) {
      const op = seleccion[claveLinea(f, l.indice)]; if (op?.activo === false) continue;
      filas.push([f.archivo, f.cdc, String(l.indice), l.codigo, l.descripcion, l.unidad, l.cantidad, op?.cantidad ?? l.cantidad, l.precioUnitario || ""].map(celda).join(";"));
    }
    descargar("NR-trazabilidad-facturas.csv", filas.join("\n"), "text/csv;charset=utf-8");
  }
  async function copiarCDC(cdc: string) {
    try { await navigator.clipboard.writeText(cdc); setMensaje("CDC copiado al portapapeles."); }
    catch { setMensaje("No se pudo copiar el CDC. Podés seleccionarlo desde el detalle de la factura."); }
  }

  const entrada = (etiqueta: string, llave: keyof DatosNR, config: { max?: number; tipo?: string; ayuda?: string; numerico?: boolean; ancho?: boolean; placeholder?: string } = {}) => (
    <label className={`nr-field ${config.ancho ? "nr-wide" : ""}`} key={llave}><span>{etiqueta}</span>
      <input type={config.tipo || "text"} value={datos[llave] || ""} maxLength={config.max}
        inputMode={config.numerico ? "numeric" : undefined} placeholder={config.placeholder || ""}
        onChange={e => actualizarDato(llave, config.numerico ? e.target.value.replace(/\D/g, "") : e.target.value.length === 16 && config.tipo === "datetime-local" ? `${e.target.value}:00` : e.target.value)}/>
      {config.ayuda && <small>{config.ayuda}</small>}
    </label>
  );
  const seleccionar = (etiqueta: string, llave: keyof DatosNR, opciones: Record<string, string>, ayuda: string, vacio = false) => (
    <label className="nr-field" key={llave}><span>{etiqueta}</span>
      <select value={datos[llave] || ""} onChange={e => actualizarDato(llave, e.target.value)}>
        {vacio && <option value="">Seleccionar…</option>}
        {Object.entries(opciones).map(([v, t]) => <option key={v} value={v}>{v} · {t}</option>)}
      </select><small>{ayuda}</small>
    </label>
  );

  return (
    <div className="modal-backdrop nr-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="nr-titulo" className="nr-workspace">
        <header className="nr-hero nr-hero-compact">
          <div className="nr-hero-top"><div className="nr-hero-eyebrow"><Layers3 size={17}/> KUATIAPOST / NOTA DE REMISIÓN</div><div className="nr-hero-actions"><button type="button" className="nr-hero-action" title="Cerrar" aria-label="Cerrar nota de remisión" onClick={onClose}><X size={18}/></button></div></div>
          <div className="nr-hero-content"><div><h2 id="nr-titulo">Crear nota de remisión</h2><p>Importá facturas, confirmá los datos del cliente y completá únicamente los campos que correspondan.</p></div></div>
        </header>

        <div className="nr-main">
          <section className="nr-import-zone" onDragOver={e => { e.preventDefault(); setArrastrando(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastrando(false); }} onDrop={e => { e.preventDefault(); setArrastrando(false); void cargarArchivos(e.dataTransfer.files); }} data-dragging={arrastrando}>
            <div className="nr-upload-icon"><Upload size={23}/></div>
            <div className="nr-import-copy"><strong>Importá las facturas que vas a remitir</strong><p>Seleccioná múltiples XML/TXT, una carpeta o arrastrá archivos aquí. Hasta 200 archivos, 50 MB por lote.</p></div>
            <div className="nr-import-buttons"><button type="button" className="nr-btn nr-btn-main" disabled={cargando} onClick={() => archivosRef.current?.click()}><Files size={16}/>{cargando ? "Procesando…" : "Seleccionar archivos"}</button><button type="button" className="nr-btn nr-btn-neutral" disabled={cargando} onClick={() => carpetaRef.current?.click()}><FolderOpen size={17}/> Elegir carpeta</button></div>
          </section>
          <input ref={archivosRef} hidden type="file" accept=".xml,.txt" multiple onChange={e => { void cargarArchivos(e.currentTarget.files); e.currentTarget.value = ""; }}/>
          <input ref={carpetaRef} hidden type="file" accept=".xml,.txt" multiple {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={e => { void cargarArchivos(e.currentTarget.files); e.currentTarget.value = ""; }}/>

          <div className="nr-kpis" aria-label="Resumen del lote">
            <div className="nr-kpi"><span className="nr-kpi-icon blue"><Files size={19}/></span><div><span>FACTURAS LEÍDAS</span><strong>{facturas.length}</strong></div></div>
            <div className="nr-kpi"><span className="nr-kpi-icon green"><CheckCheck size={19}/></span><div><span>PRODUCTOS INCLUIDOS</span><strong>{seleccionadas}<small> / {totalLineas}</small></strong></div></div>
            <div className="nr-kpi"><span className="nr-kpi-icon amber"><AlertCircle size={19}/></span><div><span>OBSERVACIONES</span><strong>{problemas + filasInvalidas}</strong></div></div>
            <div className="nr-kpi"><span className="nr-kpi-icon purple"><PackageCheck size={19}/></span><div><span>DOCUMENTO FINAL</span><strong className="nr-kpi-tag">{jsonEditable ? "Borrador listo" : "Por preparar"}</strong></div></div>
          </div>
          {mensaje && <div className={`nr-message ${hayProblemas || /no se pudo|correg|supera|inválid|error|no encontramos|primero/i.test(mensaje) ? "nr-message-warn" : ""}`} role="status"><Info size={18}/><span>{mensaje}</span><button type="button" aria-label="Ocultar aviso" onClick={() => setMensaje("")}><X size={16}/></button></div>}

          <section className="nr-section" aria-labelledby="nr-facturas-title">
            <div className="nr-section-head"><div className="nr-heading"><span className="nr-heading-number">01</span><div><h3 id="nr-facturas-title">Facturas importadas</h3><p>Validación del CDC, emisor y receptor por cada archivo.</p></div></div><div className="nr-head-actions"><span className="nr-head-count">{registros.length} archivos</span>{registros.length > 0 && <button type="button" className="nr-btn nr-btn-quiet nr-danger" onClick={() => { if (window.confirm("¿Quitar todas las facturas del lote actual?")) { setRegistros([]); setPrincipal(""); setSeleccion({}); invalidar(); } }}><Trash2 size={15}/> Limpiar lote</button>}</div></div>
            {registros.length === 0 ? <div className="nr-empty"><span><FileText size={25}/></span><strong>Tus facturas aparecerán aquí</strong><p>Agregá archivos XML/TXT para comprobar sus datos y mostrar los productos disponibles.</p></div> : <div className="nr-table-scroll"><table className="nr-table nr-invoices"><thead><tr><th>Factura / archivo</th><th>CDC verificado</th><th>Cliente</th><th>Estado</th><th className="nr-col-right">Acciones</th></tr></thead><tbody>{registros.map(r => {
              const fallos = r.error ? [r.error] : discrepancias.get(r.id) || [];
              return <tr key={r.id} className={fallos.length ? "nr-row-error" : ""}><td><div className="nr-file-cell"><span className="nr-file-icon"><FileText size={17}/></span><div><strong title={r.nombre}>{r.factura ? resumenFactura(r.factura) : r.nombre.split("/").pop()}</strong><small title={r.nombre}>{r.nombre}</small></div></div></td><td>{r.factura ? <div className="nr-cdc"><code title={r.factura.cdc}>{r.factura.cdc.slice(0,16)}…{r.factura.cdc.slice(-6)}</code><button type="button" title="Copiar CDC completo" aria-label={`Copiar CDC de ${r.nombre}`} onClick={() => void copiarCDC(r.factura!.cdc)}><Copy size={14}/></button></div> : <span className="nr-muted">—</span>}</td><td><div className="nr-client-cell"><strong>{r.factura?.receptor.dNomRec || "No disponible"}</strong><small>{r.factura?.receptor.dRucRec ? `RUC ${r.factura.receptor.dRucRec}-${r.factura.receptor.dDVRec || ""}` : r.factura?.receptor.dNumIDRec ? `CI ${r.factura.receptor.dNumIDRec}` : "—"}</small></div></td><td>{fallos.length ? <details className="nr-error-details"><summary><AlertCircle size={15}/> Revisar ({fallos.length}) <ChevronDown size={13}/></summary><div>{fallos.map((e, i) => <p key={i}>{e}</p>)}</div></details> : <span className="nr-status-ok"><CheckCircle2 size={15}/> Correcto</span>}</td><td className="nr-col-right"><button type="button" className="nr-icon-btn nr-danger" title={`Quitar ${r.nombre}`} aria-label={`Quitar ${r.nombre}`} onClick={() => quitarRegistro(r.id)}><Trash2 size={17}/></button></td></tr>;
            })}</tbody></table></div>}
          </section>

          {facturas.length > 0 && <section className="nr-section" aria-labelledby="nr-cliente-title">
            <div className="nr-section-head"><div className="nr-heading"><span className="nr-heading-number">02</span><div><h3 id="nr-cliente-title">Factura principal y datos del cliente</h3><p>Una única identidad para todos los documentos; los productos se consolidan sin comparar montos.</p></div></div><span className="nr-section-icon"><ShieldCheck size={20}/></span></div>
            <div className="nr-section-body"><label className="nr-field nr-principal-label"><span>FACTURA PRINCIPAL</span><select value={principalCDC} onChange={e => { setPrincipal(e.target.value); setDatos(prev => ({...prev, clienteDireccion:"", clienteTelefono:"", clienteEmail:""})); invalidar(); }}><option value="" disabled>Seleccionar factura principal</option>{facturas.map((f, i) => <option key={`${f.cdc}:${i}`} value={f.cdc}>{resumenFactura(f)} · {f.receptor.dNomRec} · CDC …{f.cdc.slice(-8)}</option>)}</select><small>De esta factura se toma la identidad del receptor para la NR.</small></label>
              {elegida && <div className="nr-identity"><div><span>RAZÓN SOCIAL / NOMBRE</span><strong>{elegida.receptor.dNomRec}</strong></div><div><span>RUC / DOCUMENTO</span><strong>{elegida.receptor.dRucRec ? `${elegida.receptor.dRucRec}-${elegida.receptor.dDVRec || ""}` : elegida.receptor.dNumIDRec}</strong></div><div><span>DIRECCIÓN DEL CLIENTE</span><strong>{elegida.receptor.dDirRec || "Sin informar en factura"}</strong></div></div>}
              <div className="nr-inline-note"><Info size={16}/><span>Se utiliza <strong>gDatRec (receptor/cliente)</strong> de la factura principal, nunca gEmis. El RUC emisor solo se coteja para no mezclar facturas distintas. <strong>No se comparan precios ni subtotales.</strong></span></div>
            </div>
          </section>}

          {facturas.length > 0 && <section className="nr-section nr-products" aria-labelledby="nr-products-title">
            <div className="nr-section-head"><div className="nr-heading"><span className="nr-heading-number">03</span><div><h3 id="nr-products-title">Productos y cantidades de la remisión</h3><p>Cantidad NR editable. Los importes de factura se muestran únicamente como referencia.</p></div></div><span className="nr-head-count">{seleccionadas} de {totalLineas} incluidos</span></div>
            <div className="nr-products-toolbar"><label className="nr-search"><Search size={17}/><input aria-label="Buscar producto por código, descripción, factura o CDC" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar código, descripción o factura..."/></label><div className="nr-filter-group" role="group" aria-label="Filtrar productos"><button type="button" className={filtro === "todos" ? "active" : ""} onClick={() => setFiltro("todos")}>Todos</button><button type="button" className={filtro === "incluidos" ? "active" : ""} onClick={() => setFiltro("incluidos")}>Incluidos</button><button type="button" className={filtro === "excluidos" ? "active" : ""} onClick={() => setFiltro("excluidos")}>Excluidos</button></div></div>
            <div className="nr-bulk-actions"><span>ACCIONES RÁPIDAS</span><button type="button" onClick={() => aplicarLote("incluir")}><CheckCheck size={15}/> Seleccionar todos</button><button type="button" onClick={() => aplicarLote("excluir")}><X size={15}/> Deseleccionar</button><button type="button" onClick={() => aplicarLote("restaurar")}><RefreshCcw size={15}/> Restaurar cantidades</button></div>
            <div className="nr-products-list">{partidasFiltradas.length === 0 ? <div className="nr-empty nr-empty-filter"><PackageOpen size={24}/><strong>Sin productos para mostrar</strong><p>Probá con otra búsqueda o filtro.</p></div> : partidasFiltradas.map(({ factura: f, lineas }, grupo) => <div className="nr-product-group" key={`${f.cdc}:${grupo}`}><div className="nr-group-heading"><span className="nr-group-icon"><FileText size={17}/></span><div><strong>Factura {resumenFactura(f)}</strong><small>{f.archivo}</small></div><span className="nr-group-counter">{f.lineas.filter(l => seleccion[claveLinea(f,l.indice)]?.activo !== false).length} / {f.lineas.length} seleccionados</span></div>
              <div className="nr-table-scroll"><table className="nr-table nr-product-table"><thead><tr><th>Usar</th><th>Código</th><th>Descripción del producto</th><th>Unidad</th><th className="nr-col-right">Cant. factura</th><th>Cantidad NR editable</th><th className="nr-col-right">Precio unit. FC</th></tr></thead><tbody>{lineas.map((l: LineaFactura) => {
                const clave = claveLinea(f, l.indice), op = seleccion[clave];
                const incluido = op?.activo !== false; const cantidad = op?.cantidad ?? l.cantidad;
                const error = incluido ? errorCantidad(cantidad, l.cantidad) : "";
                return <tr key={`${clave}:${grupo}`} className={`${!incluido ? "nr-excluded" : ""} ${error ? "nr-row-error" : ""}`}><td><label className="nr-check" title={incluido ? "Excluir producto de la NR" : "Incluir producto en la NR"}><input type="checkbox" aria-label={`Incluir ítem ${l.indice} (${l.codigo || l.descripcion}) de ${f.archivo}`} checked={incluido} onChange={e => cambiarLinea(clave, { activo: e.target.checked }, l.cantidad)}/><span><Check size={13}/></span></label></td><td><span className="nr-product-code" title={l.codigo}>{l.codigo || "SIN CÓDIGO"}</span></td><td><div className="nr-product-desc"><strong>{l.descripcion}</strong><small>Ítem #{l.indice} · {resumenFactura(f)}</small></div></td><td><span className="nr-unit" title={`Código de unidad: ${l.unidad}`}>{l.unidadDescripcion || (l.unidad === "77" ? "Unidad" : l.unidad)}</span></td><td className="nr-col-right"><span className="nr-original-qty">{num(l.cantidad)}</span></td><td><div className="nr-qty-wrap"><input aria-label={`Cantidad para remisión de ${l.descripcion} de ${f.archivo}`} title="No puede superar la cantidad facturada" aria-invalid={!!error} disabled={!incluido} inputMode="decimal" value={cantidad} onChange={e => cambiarLinea(clave, { cantidad: e.target.value }, l.cantidad)}/><button type="button" disabled={!incluido || cantidad === l.cantidad} aria-label={`Restaurar cantidad original de ${l.descripcion}`} title="Restaurar cantidad original" onClick={() => cambiarLinea(clave, { cantidad: l.cantidad }, l.cantidad)}><RefreshCcw size={14}/></button></div>{error && <small className="nr-qty-error"><AlertCircle size={12}/>{error}</small>}</td><td className="nr-col-right"><div className="nr-price"><strong>{num(l.precioUnitario)}</strong><small>solo referencia</small></div></td></tr>;
              })}</tbody></table></div></div>)}</div>
            <div className="nr-price-policy"><ShieldCheck size={18}/><div><strong>La Nota de Remisión registra el traslado y la cantidad, no el monto de venta.</strong><span>El precio se visualiza para identificar el producto, pero nunca se incorpora al JSON de la NR. Las cantidades no pueden superar las facturadas.</span></div></div>
          </section>}

          {erroresCampos.length > 0 && <div className="nr-validation-list" role="alert"><strong>Campos pendientes ({erroresCampos.length})</strong><ul>{erroresCampos.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}

          <section className="nr-section nr-numbering" aria-labelledby="nr-num-title">
            <div className="nr-section-head"><div className="nr-heading"><span className="nr-heading-number">04</span><div><h3 id="nr-num-title">Datos de la nueva nota de remisión</h3><p>Numeración propia de la NR. Ningún campo proviene de la numeración de las facturas.</p></div></div><button type="button" className="nr-btn nr-btn-quiet" onClick={() => { if (window.confirm("¿Restablecer solo los datos de esta NR? Las facturas importadas permanecerán cargadas.")) { setDatos(crearDatosNR(fechaLocal())); invalidar(); } }}>Restablecer formulario</button></div>
            <div className="nr-fields">
              {entrada("ESTABLECIMIENTO", "establecimiento", { max: 3, ayuda: "Obligatorio · 3 dígitos", numerico: true })}
              {entrada("PUNTO DE EXPEDICIÓN", "punto", { max: 3, ayuda: "Obligatorio · 3 dígitos", numerico: true })}
              {entrada("NÚMERO DE LA NR", "numero", { max: 7, ayuda: "Obligatorio · 7 dígitos", numerico: true })}
              {entrada("FECHA Y HORA DE EMISIÓN", "fecha", { tipo: "datetime-local", ayuda: "Obligatorio · nueva NR" })}
              {seleccionar("MOTIVO DE TRASLADO", "motivo", catalogosNR.motivo, "Obligatorio")}
              {datos.motivo === "99" && entrada("DESCRIBÍ EL MOTIVO (99 · OTRO)", "descripcionMotivo", { max: 60, ayuda: "Obligatorio solo para Otro · entre 5 y 60 caracteres. No escribas solamente Otro.", ancho: true, placeholder: "Ej.: Traslado de materiales a depósito temporal" })}
              {datos.motivo === "5" && entrada("NÚMERO DE DESPACHO DE IMPORTACIÓN", "despachoImportacion", { max: 16, ayuda: "Obligatorio solo para Importación · 16 caracteres", ancho: true })}
              {seleccionar("RESPONSABLE DE LA EMISIÓN", "responsableEmision", catalogosNR.emision, "Obligatorio · no cambia quién es el cliente")}
              {entrada("KILÓMETROS ESTIMADOS", "km", { max: 5, ayuda: "Opcional · máximo 5 dígitos", numerico: true })}
              {entrada("INFORMACIÓN ADICIONAL DE LA NR", "infoEmisor", { max: 2000, ayuda: "Opcional · solo se incluye si se informa", ancho: true })}
              {entrada("INFORMACIÓN DE INTERÉS FISCAL", "infoFisco", { max: 2000, ayuda: "Opcional · solo se incluye si se informa", ancho: true })}
            </div>
          </section>

          {facturas.length > 0 && <section className="nr-section" aria-labelledby="nr-cliente-complemento">
            <details className="nr-fold"><summary><span><strong id="nr-cliente-complemento">Datos complementarios del cliente</strong><small>Identidad importada del XML principal; completá solo los datos que quieras modificar.</small></span><ChevronDown size={17}/></summary>
              <div className="nr-fields">
                {entrada("DIRECCIÓN DEL CLIENTE", "clienteDireccion", { max: 255, placeholder: elegida?.receptor.dDirRec || "Dirección del receptor", ayuda: "Opcional · si queda vacío, usa el dato de la factura" })}
                {entrada("TELÉFONO DEL CLIENTE", "clienteTelefono", { max: 15, placeholder: elegida?.receptor.dTelRec || "Teléfono del receptor", ayuda: "Opcional" })}
                {entrada("CORREO DEL CLIENTE", "clienteEmail", { max: 80, placeholder: elegida?.receptor.dEmailRec || "Correo del receptor", ayuda: "Opcional" })}
              </div>
              <p className="nr-fold-note">El RUC/CI, DV y nombre se mantienen vinculados al receptor del XML. No se completan automáticamente con datos del emisor.</p>
            </details>
          </section>}

          <section className="nr-section" aria-labelledby="nr-transporte-title">
            <details className="nr-fold" open><summary><span><strong id="nr-transporte-title">05 · Traslado y transporte</strong><small>Obligatorios solo donde corresponde; los opcionales vacíos se omiten.</small></span><ChevronDown size={17}/></summary>
              <div className="nr-fields">
                {seleccionar("TIPO DE TRANSPORTE", "tipoTransporte", catalogosNR.transporte, "Obligatorio")}
                {seleccionar("MODALIDAD DE TRANSPORTE", "modalidad", catalogosNR.modalidad, "Obligatorio")}
                {seleccionar("RESPONSABLE DEL FLETE", "responsableFlete", catalogosNR.flete, "Obligatorio")}
                {entrada("INICIO ESTIMADO DEL TRASLADO", "inicioTraslado", { tipo: "date", ayuda: "Obligatorio" })}
                {entrada("FIN ESTIMADO DEL TRASLADO", "finTraslado", { tipo: "date", ayuda: "Obligatorio · igual o posterior al inicio" })}
                {entrada("NÚMERO DE MANIFIESTO / CARTA DE PORTE", "manifiesto", { max: 15, ayuda: "Opcional" })}
                <SelectorPais titulo="PAÍS DE DESTINO (OPCIONAL)" codigo={datos.paisDestino} opcional alCambiar={(codigo,nombre) => {
                  setDatos(v => ({...v,paisDestino:codigo,descripcionPais:nombre})); invalidar();
                }}/>

                {(datos.motivo === "3" || datos.motivo === "5") && entrada("CONDICIÓN DE NEGOCIACIÓN (INCOTERM)", "incoterm", { max: 3, ayuda: "Opcional · código de 3 letras, ej. FOB" })}
              </div>
              <div className="nr-fold-divider"/>
              <h4 className="nr-mini-heading">Transportista y conductor {datos.modalidad === "1" && datos.tipoIdentificacionVehiculo === "1" ? "(grupo opcional)" : "(obligatorio)"}</h4>
              <div className="nr-fields">
                {seleccionar("NATURALEZA DEL TRANSPORTISTA", "naturalezaTransportista", catalogosNR.naturaleza, datos.modalidad === "1" && datos.tipoIdentificacionVehiculo === "1" ? "Opcional solo para terrestre con identificación vehicular por número" : "Obligatorio", true)}
                {entrada("NOMBRE / RAZÓN SOCIAL DEL TRANSPORTISTA", "nombreTransportista", { max: 60, ayuda: "Obligatorio · 4 a 60 caracteres", ancho: true })}
                {datos.naturalezaTransportista === "1" && <>{entrada("RUC DEL TRANSPORTISTA", "rucTransportista", { max: 8, ayuda: "Obligatorio si es contribuyente", numerico: true })}{entrada("DV DEL TRANSPORTISTA", "dvTransportista", { max: 1, ayuda: "Obligatorio si es contribuyente", numerico: true })}</>}
                {datos.naturalezaTransportista === "2" && <>{seleccionar("TIPO DE DOCUMENTO", "tipoIdTransportista", catalogosNR.documento, "Obligatorio si no es contribuyente", true)}{entrada("NÚMERO DE DOCUMENTO", "numeroIdTransportista", { max: 20, ayuda: "Obligatorio si no es contribuyente" })}</>}
                {entrada("NOMBRE Y APELLIDO DEL CONDUCTOR", "nombreChofer", { max: 60, ayuda: "Obligatorio · 4 a 60 caracteres" })}
                {entrada("DOCUMENTO DEL CONDUCTOR", "documentoChofer", { max: 20, ayuda: "Obligatorio" })}
                {entrada("DOMICILIO FISCAL DEL TRANSPORTISTA", "domicilioTransportista", { max: 150, ayuda: "Opcional" })}
                {entrada("DIRECCIÓN DEL CONDUCTOR", "direccionChofer", { max: 255, ayuda: "Opcional" })}
              </div>
              <div className="nr-fold-divider"/>
              <h4 className="nr-mini-heading">Vehículo de traslado</h4>
              <div className="nr-fields">
                {entrada("TIPO DE VEHÍCULO", "tipoVehiculo", { max: 10, ayuda: "Obligatorio · 4 a 10 caracteres. Ej.: Camión" })}
                {entrada("MARCA DEL VEHÍCULO", "marcaVehiculo", { max: 10, ayuda: "Obligatorio · 1 a 10 caracteres" })}
                {seleccionar("TIPO DE IDENTIFICACIÓN", "tipoIdentificacionVehiculo", catalogosNR.identificacion, "Obligatorio")}
                {datos.tipoIdentificacionVehiculo === "1" && entrada("NÚMERO DE IDENTIFICACIÓN VEHÍCULO", "identificacionVehiculo", { max: 20, ayuda: "Obligatorio si identificás por número" })}
                {datos.tipoIdentificacionVehiculo === "2" && entrada("CHAPA / MATRÍCULA", "matriculaVehiculo", { max: 6, ayuda: "Obligatorio si identificás por matrícula · 6 caracteres" })}
                {datos.modalidad === "3" && entrada("NÚMERO DE VUELO", "vuelo", { max: 6, ayuda: "Obligatorio en modalidad aérea · 6 caracteres" })}
              </div>
            </details>
          </section>

          <section className="nr-section" aria-labelledby="nr-especial-title"><details className="nr-fold"><summary><span><strong id="nr-especial-title">Datos adicionales del transporte</strong><small>Opcionales: nacionalidad, agente y observaciones del vehículo. Solo si corresponden.</small></span><ChevronDown size={17}/></summary><div className="nr-fields">
            <SelectorPais titulo="NACIONALIDAD DEL TRANSPORTISTA (OPCIONAL)" codigo={datos.nacionalidadTransportista} opcional alCambiar={(codigo,nombre) => {
              setDatos(v => ({...v,nacionalidadTransportista:codigo,descripcionNacionalidad:nombre})); invalidar();
            }}/>

            {entrada("NOMBRE / RAZÓN SOCIAL DEL AGENTE", "agenteNombre", { max: 60, ayuda: "Opcional · uso especial" })}
            {entrada("RUC DEL AGENTE", "agenteRuc", { max: 8, numerico: true, ayuda: "Opcional · si informás RUC, indicá DV" })}
            {!!(datos.agenteRuc || datos.agenteDV) && entrada("DV DEL AGENTE", "agenteDV", { max: 1, numerico: true, ayuda: "Condicional · obligatorio con RUC" })}
            {entrada("DIRECCIÓN DEL AGENTE", "agenteDireccion", { max: 255, ayuda: "Opcional · uso especial" })}
            {entrada("DATOS ADICIONALES DEL VEHÍCULO", "datosVehiculo", { max: 20, ayuda: "Opcional" })}
          </div></details></section>

          <section className="nr-section" aria-labelledby="nr-lugares-title">
            <details className="nr-fold" open><summary><span><strong id="nr-lugares-title">06 · Local de salida y entrega</strong><small>Dirección, departamento y ciudad obligatorios; distrito y contactos opcionales.</small></span><ChevronDown size={17}/></summary>
              {(["salida", "entrega"] as const).map((lado, idx) => <div className="nr-location-group" key={lado}><h4 className="nr-mini-heading">{idx ? "Lugar de entrega" : "Lugar de salida"}</h4><div className="nr-fields">
                {entrada("DIRECCIÓN PRINCIPAL", `${lado}Direccion`, { max: 255, ayuda: "Obligatorio · calle principal" })}
                {entrada("NÚMERO DE CASA", `${lado}Numero`, { max: 6, ayuda: "Obligatorio · 0 si no tiene", numerico: true })}
                {entrada("COMPLEMENTO 1", `${lado}Complemento1`, { max: 255, ayuda: "Opcional · calle secundaria" })}
                {entrada("COMPLEMENTO 2", `${lado}Complemento2`, { max: 255, ayuda: "Opcional · piso, local, depósito" })}
                <div className="nr-geo-contenedor"><SelectorGeografia titulo={lado === "salida" ? "Lugar de salida" : "Lugar de entrega"} valor={{
                  departamento:datos[`${lado}Departamento`], departamentoDesc:datos[`${lado}DepartamentoDesc`],
                  distrito:datos[`${lado}Distrito`], distritoDesc:datos[`${lado}DistritoDesc`],
                  ciudad:datos[`${lado}Ciudad`], ciudadDesc:datos[`${lado}CiudadDesc`],
                }} alCambiar={v=>modificarLugar(lado,v)}/></div>
                {entrada("TELÉFONO", `${lado}Telefono`, { max: 15, ayuda: "Opcional · 6 a 15 caracteres" })}
              </div></div>)}
              <p className="nr-fold-note">Los códigos y descripciones deben corresponder al catálogo vigente que utiliza tu servicio emisor. No se inventan nombres de distritos ni ciudades.</p>
            </details>
          </section>

          {jsonEditable && <section className="nr-section nr-result"><div className="nr-section-head"><div className="nr-heading"><span className="nr-heading-number nr-finish"><Check size={17}/></span><div><h3>Borrador de NR preparado</h3><p>Revisá antes de enviar a tu servicio emisor. No significa aprobación DNIT.</p></div></div><button type="button" className="nr-btn nr-btn-neutral" aria-expanded={mostrarJson} onClick={() => setMostrarJson(!mostrarJson)}><FileCode2 size={16}/>{mostrarJson ? "Ocultar JSON" : "Ver JSON"}<ChevronDown size={15} className={mostrarJson ? "nr-rotated" : ""}/></button></div>{mostrarJson && <div className="nr-json-content"><label htmlFor="nr-json">JSON de la NR</label><textarea id="nr-json" value={jsonEditable} spellCheck={false} onChange={e => setJsonEditable(e.target.value)}/><small>Podés seguir editando este JSON después de abrir el borrador.</small></div>}</section>}

        </div>
        <footer className="nr-footer"><div className="nr-footer-actions"><button type="button" className="nr-btn nr-btn-neutral" disabled={!seleccionadas} onClick={exportarCSV}><Download size={16}/> Exportar detalle</button><button type="button" className="nr-btn nr-btn-outline" disabled={!listo || cargando} onClick={preparar}><ShieldCheck size={17}/> Validar y preparar</button><button type="button" className="nr-btn nr-btn-main" disabled={cargando || hayProblemas} onClick={usar}>Usar NR en el editor <ArrowRight size={17}/></button></div></footer>
      </section>
    </div>
  );
}
