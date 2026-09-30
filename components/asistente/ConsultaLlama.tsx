"use client";

import { useEffect, useState } from "react";
import { BookOpen, MessageSquare, Send } from "lucide-react";

/** Consulta y explicación del asistente Llama: presenta datos y utiliza las acciones del coordinador. */
export default function ConsultaLlama({
  error,
  question,
  setQuestion,
  answer,
  sources,
  includeDoc,
  setIncludeDoc,
  aiBusy,
  askLlama,
}: any) {
  const [conexion, setConexion] = useState<any>(null);
  const [comprobando, setComprobando] = useState(false);

  // Esta prueba consulta disponibilidad; no envía preguntas al modelo.
  async function comprobar() {
    setComprobando(true);
    try {
      const respuesta = await fetch("/api/asistente", { cache: "no-store", signal: AbortSignal.timeout(12000) });
      setConexion(await respuesta.json());
    } catch { setConexion({ connected: false, message: "No se pudo comprobar la conexión. Revisá que KuatiaPost esté iniciado." }); }
    finally { setComprobando(false); }
  }
  useEffect(() => { void comprobar(); }, []);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EXPLICACIONES CON REFERENCIAS</div>
          <h1>Asistente</h1>
          <p>Consultá cómo completar los documentos o resolver un error.</p>
        </div>
        <span className="tag">Asistente integrado</span>
      </div>
      <section className="panel estado-asistente" role="status">
        <div><strong>{comprobando ? "Comprobando conexión…" : conexion?.connected ? "Asistente disponible" : "Revisar conexión del asistente"}</strong>
        <p>{conexion?.message || "Comprobando el servicio y el modelo configurado."}</p></div>
        <button className="outline" disabled={comprobando} onClick={comprobar}>Comprobar conexión</button>
      </section>
      <div className="assistant-grid">
        <section className="panel chat-panel">
          <div className="chat-welcome">
            <span className="assistant-symbol">
              <MessageSquare size={26} />
            </span>
            <h2>¿Qué necesitás revisar?</h2>
            <p>
              Incluí el código de error o el nombre del campo para encontrar
              referencias precisas.
            </p>

          </div>
          {error && <div className="aviso-asistente" role="alert"><strong>No se pudo completar la consulta</strong><p>{error}</p></div>}
          {aiBusy && <p role="status">El asistente está preparando la explicación. En equipos sin GPU puede tardar unos minutos.</p>}
          {answer && (
            <div className="answer">
              <span className="section-label">EXPLICACIÓN DEL ASISTENTE</span>
              <div>{answer}</div>
            </div>
          )}
          <div className="question-box">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Escribí tu consulta o pegá el mensaje de error…"
              aria-label="Consulta al asistente"
            />
            <div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={includeDoc}
                  onChange={(e) => setIncludeDoc(e.target.checked)}
                />
                Incluir el JSON actual en la consulta
              </label>
              <button className="primary" disabled={aiBusy || !question.trim()} onClick={askLlama}>
                <Send size={16} />
                {aiBusy ? "Consultando…" : "Consultar"}
              </button>
            </div>
          </div>
          <p className="tiny">
            La IA explica las fuentes; la validación y aprobación final
            corresponden al servicio de documentos.
          </p>
        </section>
        <section className="panel sources-panel">
          <h3>
            <BookOpen size={18} />
            Referencias utilizadas
          </h3>
          {sources.length ? (
            sources.map((s: any, i: number) => (
              <div className="source-row" key={i}>
                <span>[{s.id}]</span>
                <strong>Referencia interna</strong>
                <small>Página {s.page}</small>
              </div>
            ))
          ) : (
            <div className="empty-small">
              <BookOpen size={30} />
              <p>Las fuentes aparecerán después de tu consulta.</p>
            </div>
          )}
          <div className="source-count">
            Referencias internas disponibles
            <br />
            El asistente explica la información consultada
          </div>
        </section>
      </div>
    </>
  );
}
