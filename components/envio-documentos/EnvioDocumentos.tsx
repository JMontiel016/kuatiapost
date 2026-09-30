"use client";
import { useEffect, useRef, useState } from "react";
import {
  Braces,
  Send,
  FileJson,
  Files,
  Settings,
  Download,
  Upload,
  Search,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  FileCode,
  ExternalLink,
  X,
  KeyRound,
  ArrowDownToLine,
  PanelLeft,
  AlertTriangle,
} from "lucide-react";
import {
  tiposDocumento as documentTypes,
  crearPlantilla as template,
} from "../../lib/documentos/plantillas-documentos";
import {
  pretty,
  parseObject,
  pointer,
  safeUrl,
  request,
} from "../../lib/integracion/solicitudes-integracion";
import {
  validarDocumento as validateDocument,
  camposFaltantes,
  vaciarCamposOpcionales,
} from "../../lib/documentos/campos-documentos";
import CamposDocumento, {
  type CampoEnfocado,
} from "../documentos/CamposDocumento";
import BurbujaAyuda from "../asistente/BurbujaAyuda";
import Field from "../formularios/CampoTexto";
import {
  exportExcel,
  importExcel,
  exportHistory,
  exportarEjemploMasivo,
} from "../../lib/documentos/excel-documentos";
import ConfiguracionIntegracion from "../configuracion/ConfiguracionIntegracion";
import ConsultaLlama from "../asistente/ConsultaLlama";
import ConsultarDocumento from "../documentos/ConsultarDocumento";
import {
  crearConsulta,
  revisarConsulta,
  obtenerPdfKude,
  type DatosConsulta,
} from "../../lib/integracion/consulta-kude";
import GenerarNotaCredito from "../documentos/GenerarNotaCredito";

type View = "workspace" | "consulta" | "assistant" | "settings";
/** Las pantallas describen tareas concretas; no hay login porque el acceso es público. */
const navigation = [
  { id: "workspace", label: "Envío de documentos", icon: Braces },
  { id: "consulta", label: "Consulta y KUDE", icon: Files },
  { id: "assistant", label: "Asistente", icon: MessageSquare },
];

/** Descarga un archivo generado localmente y libera la URL temporal. */
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Coordina los documentos, la conexión y los datos de esta sesión, sin persistencia. */
export default function EnvioDocumentos() {
  const [campoEnfocado, setCampoEnfocado] = useState<CampoEnfocado | null>(
    null,
  );

  // Navegación, tipo de documento y vista del editor.
  const [view, setView] = useState<View>("workspace"),
    [type, setType] = useState("1"),
    [mode, setMode] = useState("emit"),
    [body, setBody] = useState(pretty(template("1"))),
    [editorTab, setEditorTab] = useState("form");

  // Conexión y credenciales temporales de la integración.
  const [url, setUrl] = useState(""),
    [method, setMethod] = useState("POST"),
    [token, setToken] = useState(""),
    [ruc, setRuc] = useState(""),
    [password, setPassword] = useState(""),
    [authUrl, setAuthUrl] = useState("");
  // Direcciones independientes; KUDE comparte consulta solo cuando se elige esa opción.
  const [consultaUrl, setConsultaUrl] = useState("");
  const [kudeUrl, setKudeUrl] = useState("");
  const [compartirKude, setCompartirKude] = useState(true);
  // Borrador editable: se conserva incluso mientras su sintaxis está incompleta.
  const [authJson, setAuthJson] = useState(pretty({ ruc: "", password: "" }));
  const [authError, setAuthError] = useState("");
  function editarAuthJson(texto: string) {
    setAuthJson(texto);
    try {
      const datos = parseObject(texto);
      if (typeof datos.ruc !== "string" || typeof datos.password !== "string") throw Error('El JSON debe incluir "ruc" y "password" como texto.');
      setRuc(datos.ruc); setPassword(datos.password); setAuthError("");
    } catch (e: any) { setAuthError(e.message); }
  }
  function editarCredencial(campo: "ruc" | "password", texto: string) {
    let previo: any = {};
    try { previo = parseObject(authJson); } catch {}
    const datos = { ...previo, ruc, password, [campo]: texto };
    setRuc(datos.ruc); setPassword(datos.password);
    setAuthJson(pretty(datos)); setAuthError("");
  }
  const tokenPath = "token";

  // Respuesta, historial y mensajes de revisión de esta sesión.
  const [busy, setBusy] = useState(false),
    [response, setResponse] = useState<any>(null),
    [records, setRecords] = useState<any[]>([]),
    [notice, setNotice] = useState(""),
    [errors, setErrors] = useState<string[]>([]),
    [find, setFind] = useState(""),
    [replace, setReplace] = useState("");

  // La consulta tiene un borrador independiente de la emisión y del asistente.
  const [datosConsulta, setDatosConsulta] = useState<DatosConsulta>({
    dEst: "",
    dPunExp: "",
    dNumDoc: "",
    tipoDoc: "FE",
  });
  // Dos borradores independientes permiten ampliar cada operación sin perder propiedades.
  const [jsonConsulta, setJsonConsulta] = useState(pretty(crearConsulta(datosConsulta, "estado")));
  const [jsonKude, setJsonKude] = useState(pretty(crearConsulta(datosConsulta, "kude")));
  function cambiarDatosConsulta(datos: DatosConsulta) {
    setDatosConsulta(datos);
    const actualizar = (texto: string, operacion: "estado" | "kude") => {
      let previo: any = {};
      try { previo = parseObject(texto); } catch {}
      return pretty({ ...crearConsulta(datos, operacion), ...previo,
        dEst: datos.dEst, dPunExp: datos.dPunExp, dNumDoc: datos.dNumDoc, tipoDoc: datos.tipoDoc });
    };
    setJsonConsulta((v) => actualizar(v, "estado"));
    setJsonKude((v) => actualizar(v, "kude"));
  }
  function cambiarJsonConsulta(operacion: "estado" | "kude", texto: string) {
    (operacion === "estado" ? setJsonConsulta : setJsonKude)(texto);
    // La sintaxis incompleta se conserva; nunca se reformatea mientras se escribe.
    try {
      const objeto = parseObject(texto);
      const datos = { ...datosConsulta };
      for (const clave of ["dEst", "dPunExp", "dNumDoc", "tipoDoc"] as const)
        if (typeof objeto[clave] === "string") datos[clave] = objeto[clave];
      setDatosConsulta(datos);
      const otro = operacion === "estado" ? setJsonKude : setJsonConsulta;
      otro((anterior) => {
        try { return pretty({ ...parseObject(anterior), ...datos }); }
        catch { return anterior; }
      });
    } catch { /* El error se informa al intentar consultar; el texto no se pierde. */ }
  }
  const [resultadoConsulta, setResultadoConsulta] = useState<any>(null);
  const [pdfConsulta, setPdfConsulta] = useState<Blob | null>(null);
  const borradores = useRef<Record<string, string>>({});

  // Pregunta, explicación y referencias del asistente.
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [aiError, setAiError] = useState(""),
    [sources, setSources] = useState<any[]>([]),
    [aiBusy, setAiBusy] = useState(false),
    [includeDoc, setIncludeDoc] = useState(false);

  // Datos y opciones de la nota de crédito desde XML.
  const [xmlOpen, setXmlOpen] = useState(false),
    [xml, setXml] = useState(""),
    [xmlOpts, setXmlOpts] = useState<any>({
      establishment: "",
      point: "",
      number: "",
      date: "",
      reason: "",
      code: "",
      quantity: "",
      amount: "",
      single: false,
    });
  const editor = useRef<HTMLTextAreaElement>(null),
    file = useRef<HTMLInputElement>(null),
    xmlFile = useRef<HTMLInputElement>(null);
  useEffect(() => {
    borradores.current[`${mode}:${type}`] = body;
  }, [body, mode, type]);

  /* Registra una acción de preparación de JSON, sin realizar envíos. */
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "stage_document_json",
          description:
            "Carga un JSON editable en la mesa de trabajo. No envía documentos.",
          inputSchema: {
            type: "object",
            properties: { json: { type: "string" } },
            required: ["json"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: ({ json }: any) => {
            const doc = parseObject(json);
            setBody(
              pretty(vaciarCamposOpcionales(doc, String(doc.iTiDE || type))),
            );
            setView("workspace");
            return { staged: true, fields: Object.keys(doc).length };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const selected = documentTypes.find((d) => d.id === type)!;
  let parsed: any = null;
  try {
    parsed = parseObject(body);
  } catch {}
  /** Presenta errores de acciones en una alerta legible y mantiene la sesión activa. */
  const attempt = async (fn: () => any) => {
    try {
      await fn();
    } catch (e: any) {
      setNotice(e.message || "No se completó la operación.");
    }
  };

  /** Guarda cada borrador antes de cambiar de tipo u operación. Navegar no borra datos. */
  function chooseType(next: string) {
    borradores.current[`${mode}:${type}`] = body;
    setCampoEnfocado(null);
    setType(next);
    setMode("emit");
    setMethod("POST");
    setBody(borradores.current[`emit:${next}`] || pretty(template(next)));
    setErrors([]);
  }

  /** Conserva por separado el JSON de emisión y el de una solicitud personalizada. */
  function chooseMode(next: string) {
    borradores.current[`${mode}:${type}`] = body;
    setMode(next);
    setMethod("POST");
    setErrors([]);
    setBody(
      borradores.current[`${next}:${type}`] ||
        pretty(next === "emit" ? template(type) : {}),
    );
  }

  /** Consulta estado o KUDE usando siempre el token compartido de la sesión. */
  async function consultarDocumento(operacion: "estado" | "kude") {
    await attempt(async () => {
      const solicitud = parseObject(operacion === "kude" ? jsonKude : jsonConsulta);
      const problemas = revisarConsulta(solicitud as DatosConsulta);
      if (problemas.length) throw Error(problemas.join(" "));
      const destino = operacion === "kude" && !compartirKude ? kudeUrl : consultaUrl;
      if (!destino) throw Error("Ingresá la URL de esta operación en Configuración.");
      if (!token.trim())
        throw Error("Generá o ingresá el token en Configuración.");
      setBusy(true);
      try {
        const resultado = await request(destino, "POST", solicitud, token);
        setResultadoConsulta(resultado);
        setPdfConsulta(null);
        setRecords((anteriores) => [
          {
            id: crypto.randomUUID(),
            date: new Date().toLocaleString("es-PY"),
            type: datosConsulta.tipoDoc,
            operation: operacion,
            request: solicitud,
            response: resultado,
            url: destino,
          },
          ...anteriores,
        ]);
        if (
          resultado.http < 200 ||
          resultado.http >= 300 ||
          resultado.data?.status === "error"
        )
          throw Error(
            typeof resultado.data?.message === "string"
              ? resultado.data.message
              : `Consulta rechazada: HTTP ${resultado.http}.`,
          );
        if (operacion === "kude")
          setPdfConsulta(obtenerPdfKude(resultado.data));
        setNotice(
          operacion === "kude"
            ? "KUDE recibido. Ya podés visualizarlo o descargarlo."
            : "Estado del documento consultado.",
        );
      } finally {
        setBusy(false);
      }
    });
  }

  /** Revisa campos aplicables antes de confirmar y enviar el documento. */
  async function sendRequest() {
    await attempt(async () => {
      let data = parseObject(body);
      if (!token.trim())
        throw Error("Generá o ingresá el token en Configuración.");
      if (mode === "emit") {
        const problems = validateDocument(data, type);
        setErrors(problems);
        if (problems.length) {
          setNotice("Completá los campos indicados antes de enviar.");
          return;
        }
        if (
          !window.confirm(
            `Se enviará ${selected.name.toLowerCase()} a ${url}. ¿Confirmás el envío?`,
          )
        )
          return;
      }
      setBusy(true);
      try {
        const result = await request(url, method, data, token);
        setResponse(result);
        setRecords((old) => [
          {
            id: crypto.randomUUID(),
            date: new Date().toLocaleString("es-PY"),
            type: selected.name,
            operation: mode === "emit" ? "Emisión" : "Solicitud personalizada",
            request: data,
            response: result,
            url,
          },
          ...old,
        ]);
      } finally {
        setBusy(false);
      }
    });
  }

  /** Solicita un token sin guardar la contraseña ni enviarla al asistente. */
  async function authenticate() {
    await attempt(async () => {
      if (!authUrl) throw Error("Ingresá la URL para generar el token.");
      setBusy(true);
      try {
        if (authError) throw Error("Corregí el JSON de autenticación antes de generar el token.");
        const credenciales = parseObject(authJson);
        if (typeof credenciales.ruc !== "string" || typeof credenciales.password !== "string") throw Error("Usuario y contraseña deben ser texto.");
        const result = await request(authUrl, "POST", credenciales, "");
        setResponse(result);
        const t = pointer(result.data, tokenPath);
        if (result.http < 200 || result.http >= 300)
          throw Error(`Autenticación rechazada: HTTP ${result.http}.`);
        if (typeof t !== "string" || !t || t.toLowerCase() === "error")
          throw Error(
            "No se encontró el token. Revisá la ruta de token en la respuesta.",
          );
        setToken(t);
        setNotice(
          "Token generado. Se utilizará en todos los envíos y consultas.",
        );
      } finally {
        setBusy(false);
      }
    });
  }

  /** Importa JSON o Excel y conserva los códigos y decimales como texto. */
  async function loadFile(f: File) {
    await attempt(async () => {
      if (f.size > 10_000_000)
        throw Error("El archivo debe pesar menos de 10 MB.");
      const doc = f.name.endsWith(".xlsx")
        ? await importExcel(f)
        : parseObject(await f.text());
      setBody(pretty(vaciarCamposOpcionales(doc, String(doc.iTiDE || type))));
      if (documentTypes.some((d) => d.id === String(doc.iTiDE)))
        setType(String(doc.iTiDE));
      setMode("emit");
      setView("workspace");
      setErrors([]);
      setNotice("Documento cargado. Revisá el JSON antes de enviarlo.");
    });
  }

  /** Exporta el documento y su respuesta a un archivo Excel. */
  async function downloadExcel(doc = parsed, res = response) {
    await attempt(async () => {
      if (!doc) throw Error("Corregí el JSON antes de exportar.");
      save(
        await exportExcel(
          vaciarCamposOpcionales(doc, String(doc.iTiDE || type)),
          res,
        ),
        `${selected.short}-${doc.dNumDoc || "plantilla"}.xlsx`,
      );
    });
  }

  /** Busca y selecciona coincidencias con resaltado azul en el editor. */
  function searchEditor() {
    if (!find) return;
    const start = body
      .toLowerCase()
      .indexOf(find.toLowerCase(), editor.current?.selectionEnd || 0);
    const i =
      start < 0 ? body.toLowerCase().indexOf(find.toLowerCase()) : start;
    if (i < 0) {
      setNotice("No se encontraron coincidencias.");
      return;
    }
    setEditorTab("json");
    setTimeout(() => {
      editor.current?.focus();
      editor.current?.setSelectionRange(i, i + find.length);
      const lines = body.slice(0, i).split("\n").length;
      if (editor.current)
        editor.current.scrollTop = Math.max(0, (lines - 5) * 24);
    }, 0);
  }

  /** Consulta al backend Llama: las credenciales IA nunca llegan al navegador. */
  async function askLlama(preguntaElegida?: unknown) {
    const preguntaParaEnviar =
      typeof preguntaElegida === "string" ? preguntaElegida : question;
    await attempt(async () => {
      if (!preguntaParaEnviar.trim()) throw Error("Escribí tu pregunta.");
      if (aiBusy) return;
      setAiError("");
      setAiBusy(true);
      // Cada consulta sustituye la explicación anterior, sin acumular historial.
      setAnswer("");
      setSources([]);
      try {
        const r = await fetch("/api/asistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: preguntaParaEnviar,
            ...(includeDoc ? { json: body } : {}),
          }),
          signal: AbortSignal.timeout(250000),
        });
        const data: any = await r.json();
        if (!r.ok) throw Error(data.error || "El asistente no pudo responder.");
        setAnswer(data.answer);
        setSources(data.sources || []);
      } catch (e: any) {
        setAiError(e.name === "TimeoutError" ? "La consulta tardó demasiado. Probá una pregunta más corta y comprobá la conexión." : e.message || "No se pudo consultar al asistente.");
      } finally {
        setAiBusy(false);
      }
    });
  }
  // La guía se actualiza con los datos del formulario, sin llamar a la IA por cada tecla.
  const faltantesActuales =
    parsed && mode === "emit" ? camposFaltantes(parsed, type) : [];
  // Solo el estado explícito del documento permite mostrar aprobación.
  const approved =
    response?.data?.Estado === "Aprobado" ||
    response?.data?.message?.Estado === "Aprobado";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("workspace");
          }}
        >
          <span className="brand-mark">
            <Braces size={23} />
          </span>
          <span>
            KuatiaPost<span className="brand-sub">DOCUMENTOS</span>
          </span>
        </a>
        <div className="workspace-label">DOCUMENTOS ELECTRÓNICOS</div>
        <nav>
          {navigation.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(n.id as View)}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "workspace" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={20} />
          <strong>Tu conexión, tus datos</strong>
          <p>Credenciales y documentos permanecen en esta sesión.</p>
        </div>
        <button
          className={
            view === "settings"
              ? "nav-item active settings-link"
              : "nav-item settings-link"
          }
          onClick={() => setView("settings")}
        >
          <Settings size={19} />
          Configuración
        </button>
        <div className="sidebar-footer">
          <span className="avatar">K</span>
          <div>
            Acceso público<small>Sin cuenta · sin instalación</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            KuatiaPost <ChevronRight size={14} />
            <strong>
              {navigation.find((n) => n.id === view)?.label || "Configuración"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="tag">KuatiaPost</span>
            <span className="tiny">POST predeterminado</span>
          </div>
        </header>
        {notice && (
          <div role="status" className="notice">
            <AlertTriangle size={18} />
            <span>{notice}</span>
            <button aria-label="Cerrar mensaje" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="main-content">
          {view === "workspace" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PREPARAR · ENVIAR · CONSULTAR</div>
                  <h1>Envío de documentos</h1>
                  <p>
                    Conectá tu integración y trabajá con documentos
                    electrónicos.
                  </p>
                </div>
                <button className="outline" onClick={() => setView("settings")}>
                  <KeyRound size={16} />
                  {token ? "Token configurado" : "Configurar conexión"}
                </button>
              </div>
              <div className="document-switch">
                {documentTypes.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => chooseType(d.id)}
                    className={type === d.id ? "selected" : ""}
                  >
                    <span className="doc-code">{d.short}</span>
                    {d.name}
                  </button>
                ))}
              </div>
              <div className="work-grid">
                <section className="request-panel panel">
                  <div className="panel-top">
                    <div>
                      <span className="square-icon">
                        <FileJson size={19} />
                      </span>
                      <strong>
                        {mode === "emit"
                          ? selected.name
                          : "Solicitud personalizada"}
                      </strong>
                    </div>
                    <span className="tag light">Plantilla base · editable</span>
                  </div>
                  <div className="operation-row">
                    <label>
                      Operación
                      <select
                        value={mode}
                        onChange={(e) => chooseMode(e.target.value)}
                      >
                        <option value="emit">Emitir documento</option>
                        <option value="custom">Solicitud personalizada</option>
                      </select>
                    </label>
                    <span className="tiny">
                      {mode === "emit"
                        ? `Código de documento: ${type}`
                        : "Completá el JSON que recibe tu servicio."}
                    </span>
                  </div>
                  <div className="endpoint">
                    <select
                      aria-label="Método HTTP"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      <option>POST</option>
                      <option disabled={mode === "emit"}>GET</option>
                    </select>
                    <input
                      aria-label="URL de integración"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://tu-integracion.com/api/operation"
                    />
                    <button
                      className="primary"
                      disabled={busy || !url}
                      onClick={sendRequest}
                    >
                      <Send size={16} />
                      {busy ? "Enviando…" : "Enviar"}
                    </button>
                  </div>
                  <div className="editor-toolbar">
                    <div className="tabs">
                      <button
                        className={editorTab === "json" ? "on" : ""}
                        onClick={() => setEditorTab("json")}
                      >
                        Editar JSON <span>JSON</span>
                      </button>
                      <button
                        className={editorTab === "form" ? "on" : ""}
                        onClick={() => setEditorTab("form")}
                      >
                        Completar campos
                      </button>
                      <button
                        className={editorTab === "auth" ? "on" : ""}
                        onClick={() => setEditorTab("auth")}
                      >
                        Token de acceso{token && <Check size={13} />}
                      </button>
                    </div>
                    <button
                      title="Formatear JSON"
                      aria-label="Formatear JSON"
                      onClick={() =>
                        attempt(() => setBody(pretty(parseObject(body))))
                      }
                    >
                      <Braces size={17} />
                    </button>
                  </div>
                  {editorTab === "json" && (
                    <>
                      <div className="search-bar">
                        <Search size={15} />
                        <input
                          aria-label="Buscar en JSON"
                          value={find}
                          onChange={(e) => setFind(e.target.value)}
                          placeholder="Buscar campo o valor"
                          onKeyDown={(e) => e.key === "Enter" && searchEditor()}
                        />
                        <button onClick={searchEditor}>Buscar</button>
                        <input
                          aria-label="Texto de reemplazo"
                          value={replace}
                          onChange={(e) => setReplace(e.target.value)}
                          placeholder="Reemplazar por…"
                        />
                        <button
                          onClick={() => {
                            if (find) setBody(body.split(find).join(replace));
                          }}
                        >
                          En todos
                        </button>
                      </div>
                      <div className="code-editor">
                        <div className="line-numbers" aria-hidden="true">
                          {body.split("\n").map((_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>
                        <textarea
                          ref={editor}
                          spellCheck={false}
                          aria-label="Cuerpo JSON editable"
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          onScroll={(e) => {
                            const gutter =
                              e.currentTarget.previousElementSibling;
                            if (gutter)
                              gutter.scrollTop = e.currentTarget.scrollTop;
                          }}
                        />
                      </div>
                    </>
                  )}
                  {editorTab === "form" && (
                    <div className="fields-scroll">
                      {parsed ? (
                        <CamposDocumento
                          documento={parsed}
                          tipo={type}
                          alCambiar={(v: any) => setBody(pretty(v))}
                          alEnfocar={setCampoEnfocado}
                        />
                      ) : (
                        <p>
                          Corregí la sintaxis del JSON para editar los campos.
                        </p>
                      )}
                    </div>
                  )}
                  {editorTab === "auth" && (
                    <div className="auth-body">
                      <h3>Token de acceso</h3>
                      <Field
                        label="Token de acceso"
                        type="password"
                        value={token}
                        onChange={setToken}
                        placeholder="Pegá tu token o generá uno en Configuración"
                      />
                      <p>
                        Se envía únicamente a la URL que elegís. No se guarda al
                        cerrar esta página.
                      </p>
                      <button
                        className="outline"
                        onClick={() => setView("settings")}
                      >
                        <KeyRound size={16} />
                        Generar token
                      </button>
                    </div>
                  )}
                  <div className="editor-footer">
                    <span className={parsed ? "syntax-ok" : "syntax-error"}>
                      {parsed ? (
                        <Check size={14} />
                      ) : (
                        <AlertTriangle size={14} />
                      )}{" "}
                      {parsed ? "Sintaxis JSON válida" : "JSON con errores"}
                    </span>
                    <span>
                      {body.length.toLocaleString("es-PY")} caracteres · UTF-8
                    </span>
                  </div>
                  {errors.length > 0 && (
                    <div className="validation">
                      <strong>Campos por revisar</strong>
                      {errors.slice(0, 15).map((e, i) => (
                        <p key={i}>{e}</p>
                      ))}
                      {errors.length > 15 && (
                        <p>Y {errors.length - 15} campos más.</p>
                      )}
                    </div>
                  )}
                  <div className="bottom-tools">
                    <button
                      onClick={() =>
                        attempt(() => {
                          const p = parseObject(body);
                          setErrors(
                            mode === "emit" ? validateDocument(p, type) : [],
                          );
                          setNotice(
                            mode === "emit"
                              ? "Revisión de campos completada. El servicio confirma la aceptación del documento."
                              : "JSON válido. Revisá los datos de la solicitud.",
                          );
                        })
                      }
                    >
                      <ShieldCheck size={16} />
                      Revisar
                    </button>
                    <button
                      onClick={() =>
                        attempt(async () => {
                          await navigator.clipboard.writeText(body);
                          setNotice("JSON copiado.");
                        })
                      }
                    >
                      <Copy size={16} />
                      Copiar
                    </button>
                    <button
                      onClick={() =>
                        attempt(() =>
                          save(
                            new Blob(
                              [
                                pretty(
                                  vaciarCamposOpcionales(
                                    parseObject(body),
                                    type,
                                  ),
                                ),
                              ],
                              {
                                type: "application/json",
                              },
                            ),
                            `${selected.short}.json`,
                          ),
                        )
                      }
                    >
                      <Download size={16} />
                      JSON
                    </button>
                    <button onClick={() => downloadExcel()}>
                      <ArrowDownToLine size={16} />
                      Excel
                    </button>
                  </div>
                </section>
                <aside className="right-column">
                  <section className="panel import-panel">
                    <div className="section-label">PREPARÁ TU DOCUMENTO</div>
                    <h3>Cargar datos del documento</h3>
                    <p>
                      Completá los campos o importá tus datos. El JSON queda
                      siempre editable.
                    </p>
                    <button
                      className="import-option"
                      onClick={() => file.current?.click()}
                    >
                      <span className="import-icon">
                        <Upload size={18} />
                      </span>
                      <span>
                        <strong>Importar Excel o JSON</strong>
                        <small>Usá el formato de la plantilla Excel</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <input
                      ref={file}
                      type="file"
                      hidden
                      accept=".json,.xlsx"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) loadFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      className="import-option"
                      onClick={() => setXmlOpen(true)}
                    >
                      <span className="import-icon">
                        <FileCode size={18} />
                      </span>
                      <span>
                        <strong>Crear NC desde XML</strong>
                        <small>Factura completa o selección de ítems</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      className="import-option"
                      onClick={() =>
                        attempt(async () =>
                          save(
                            await exportarEjemploMasivo(),
                            "Ejemplo-exportacion-masiva.xlsx",
                          ),
                        )
                      }
                    >
                      <span className="import-icon">
                        <Download size={18} />
                      </span>
                      <span>
                        <strong>Ejemplo de exportación masiva</strong>
                        <small>
                          Un documento de ejemplo y hojas relacionadas
                        </small>
                      </span>
                    </button>
                    <button
                      className="import-option"
                      disabled={!records.length}
                      onClick={() =>
                        attempt(async () =>
                          save(
                            await exportHistory(records),
                            "KuatiaPost-documentos-sesion.xlsx",
                          ),
                        )
                      }
                    >
                      <span className="import-icon">
                        <Files size={18} />
                      </span>
                      <span>
                        <strong>Exportar sesión a Excel</strong>
                        <small>
                          {records.length} solicitudes de esta sesión
                        </small>
                      </span>
                    </button>
                    <button
                      className="text-button reset"
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Vaciar los campos del documento actual?",
                          )
                        ) {
                          setBody(pretty(template(type)));
                          setErrors([]);
                        }
                      }}
                    >
                      <RefreshCw size={14} />
                      Restablecer plantilla
                    </button>
                  </section>
                  <section className="panel guidance">
                    <span className="assistant-symbol">
                      <MessageSquare size={22} />
                    </span>
                    <h3>
                      Entendé el error.
                      <br />
                      Encontrá la solución.
                    </h3>
                    <p>
                      El asistente explica los campos y errores usando el manual
                      y las notas técnicas.
                    </p>
                    <button
                      className="outline"
                      onClick={() => {
                        setView("assistant");
                        if (response)
                          setQuestion(
                            "Explicá este error del documento: " +
                              pretty(response.data).slice(0, 1500),
                          );
                      }}
                    >
                      Consultar al asistente
                    </button>
                    <span className="tiny">
                      Con referencias al documento y la página
                    </span>
                  </section>
                </aside>
              </div>
              <section className="response-panel panel">
                <div className="panel-top">
                  <div>
                    <span className="square-icon">
                      <PanelLeft size={18} />
                    </span>
                    <strong>Respuesta de la integración</strong>
                  </div>
                  {response ? (
                    <div className="response-meta">
                      <span
                        className={
                          response.http < 300
                            ? "badge success"
                            : "badge warning"
                        }
                      >
                        HTTP {response.http}
                      </span>
                      <span>{response.elapsed} ms</span>
                      {approved && (
                        <span className="badge success">Aprobado</span>
                      )}
                    </div>
                  ) : (
                    <span className="tiny">Sin solicitudes enviadas</span>
                  )}
                </div>
                {response ? (
                  <pre className="response-code">{pretty(response.data)}</pre>
                ) : (
                  <div className="empty-response">
                    <Send size={24} />
                    <strong>Resultado del envío</strong>
                    <p>
                      La respuesta del servicio aparecerá aquí después de
                      enviar.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
          {view === "settings" && (
            <ConfiguracionIntegracion
              authUrl={authUrl}
              setAuthUrl={setAuthUrl}
              ruc={ruc}
              setRuc={(v: string) => editarCredencial("ruc", v)}
              password={password}
              setPassword={(v: string) => editarCredencial("password", v)}
              authJson={authJson} editarAuthJson={editarAuthJson} authError={authError}
              busy={busy}
              authenticate={authenticate}
              token={token}
              setToken={setToken}
              url={url}
              setUrl={setUrl}
              setNotice={setNotice}
              consultaUrl={consultaUrl} setConsultaUrl={setConsultaUrl}
              kudeUrl={kudeUrl} setKudeUrl={setKudeUrl}
              compartirKude={compartirKude} setCompartirKude={setCompartirKude}
            />
          )}
          {view === "assistant" && (
            <ConsultaLlama
              error={aiError}
              question={question}
              setQuestion={setQuestion}
              answer={answer}
              sources={sources}
              includeDoc={includeDoc}
              setIncludeDoc={setIncludeDoc}
              aiBusy={aiBusy}
              askLlama={askLlama}
            />
          )}
          {view === "consulta" && (
            <ConsultarDocumento
              token={token} setToken={setToken}
              consultaUrl={consultaUrl} setConsultaUrl={setConsultaUrl}
              kudeUrl={kudeUrl} setKudeUrl={setKudeUrl}
              compartirKude={compartirKude}
              datos={datosConsulta}
              alCambiar={cambiarDatosConsulta}
              jsonConsulta={jsonConsulta} jsonKude={jsonKude}
              alEditarJson={cambiarJsonConsulta}
              alConsultar={consultarDocumento}
              ocupado={busy}
              resultado={resultadoConsulta}
              pdf={pdfConsulta}
              alDescargar={save}
            />
          )}
        </div>
        <footer className="main-footer">
          <span>KuatiaPost</span>
          <span>Documentos electrónicos · Paraguay</span>
          <span>Datos de sesión · Sin almacenamiento permanente</span>
        </footer>
      </main>
      {xmlOpen && (
        <GenerarNotaCredito
          setXmlOpen={setXmlOpen}
          xmlFile={xmlFile}
          attempt={attempt}
          setXml={setXml}
          xml={xml}
          xmlOpts={xmlOpts}
          setXmlOpts={setXmlOpts}
          setBody={setBody}
          setType={setType}
          setMode={setMode}
          setErrors={setErrors}
          setNotice={setNotice}
          setView={setView}
        />
      )}
      {view === "workspace" && mode === "emit" && (
        <BurbujaAyuda
          faltantes={faltantesActuales}
          campo={campoEnfocado}
          alPreguntar={(pregunta: string) => {
            setQuestion(pregunta);
            setView("assistant");
            void askLlama(pregunta);
          }}
        />
      )}
    </div>
  );
}
