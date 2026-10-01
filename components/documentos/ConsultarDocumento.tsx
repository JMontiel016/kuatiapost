"use client";

import Field from "../formularios/CampoTexto";
import { useEffect, useState } from "react";
import { Search, FileText, Download, ExternalLink } from "lucide-react";
import {
  tiposConsulta,
  type DatosConsulta,
  estadoDocumento, crearConsulta,
} from "../../lib/integracion/consulta-kude";

type Propiedades = {
  jsonConsulta: string; jsonKude: string;
  alEditarJson: (operacion: "estado" | "kude", texto: string) => void;
  token: string; setToken: (v: string) => void;
  consultaUrl: string; setConsultaUrl: (v: string) => void;
  kudeUrl: string; setKudeUrl: (v: string) => void;
  compartirKude: boolean;
  datos: DatosConsulta;
  alCambiar: (datos: DatosConsulta) => void;
  alConsultar: (operacion: "estado" | "kude") => void;
  ocupado: boolean;
  resultado: any;
  pdf: Blob | null;
  alDescargar: (blob: Blob, nombre: string) => void;
};

/** Consulta documentos existentes y conserva sus datos en el coordinador de sesión. */
export default function ConsultarDocumento({
  jsonConsulta, jsonKude, alEditarJson,
  token, setToken, consultaUrl, setConsultaUrl, kudeUrl, setKudeUrl, compartirKude,
  datos,
  alCambiar,
  alConsultar,
  ocupado,
  resultado,
  pdf,
  alDescargar,
}: Propiedades) {
  const [urlPdf, cambiarUrlPdf] = useState("");

  // El visor utiliza un PDF local temporal y libera memoria al cambiar de pantalla.
  useEffect(() => {
    if (!pdf) {
      cambiarUrlPdf("");
      return;
    }
    const temporal = URL.createObjectURL(pdf);
    cambiarUrlPdf(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [pdf]);

  const estado = estadoDocumento(resultado?.data);
  const numero = `${datos.dEst}-${datos.dPunExp}-${datos.dNumDoc}`;
  const nombre = `KUDE-${datos.tipoDoc}-${numero}.pdf`;

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DATOS EMITIDOS</div>
          <h1>Consulta y KUDE</h1>
          <p>Buscá un registro por su numeración.</p>
        </div>
      </div>
      <section className="panel consulta-panel">
        <div className="consulta-campos">
          <label className="field">
            <span>
              Tipo de operación <b className="asterisco">*</b>
            </span>
            <select
              value={datos.tipoDoc}
              onChange={(e) => alCambiar({ ...datos, tipoDoc: e.target.value })}
            >
              {tiposConsulta.map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["dEst", "Establecimiento", 3],
              ["dPunExp", "Punto de expedición", 3],
              ["dNumDoc", "Número de referencia", 7],
            ] as const
          ).map(([codigo, texto, longitud]) => (
            <label className="field" key={codigo}>
              <span>
                ({codigo}) {texto} <b className="asterisco">*</b>
              </span>
              <input
                inputMode="numeric"
                maxLength={longitud}
                value={datos[codigo]}
                onChange={(e) =>
                  alCambiar({ ...datos, [codigo]: e.target.value.replace(/\D/g, "").slice(0, longitud) })
                }
                aria-required="true"
              />
              <small>{longitud} dígitos, incluyendo ceros iniciales.</small>
            </label>
          ))}
        </div>
        <div className="consulta-acciones">
          <button
            className="outline"
            disabled={ocupado}
            onClick={() => alConsultar("estado")}
          >
            <Search size={17} />
            Consultar estado
          </button>
          <button
            className="primary"
            disabled={ocupado}
            onClick={() => alConsultar("kude")}
          >
            <FileText size={17} />
            {ocupado ? "Consultando…" : "Visualizar KUDE"}
          </button>
        </div>
        <Field label="URL de consulta" value={consultaUrl} onChange={setConsultaUrl}/>
        {!compartirKude && <Field label="URL del KUDE" value={kudeUrl} onChange={setKudeUrl}/>}
        <Field label="Token de acceso compartido" type="password" value={token} onChange={setToken}/>
        <div className="two-fields">{(["estado", "kude"] as const).map((operacion) => <div key={operacion}>
          <strong>{operacion === "estado" ? "JSON de consulta" : "JSON del KUDE · PDF en base64"}</strong>
          <textarea className="auth-json-editable" style={{ minHeight: 250 }} value={operacion === "estado" ? jsonConsulta : jsonKude}
            onChange={(e) => alEditarJson(operacion, e.target.value)} spellCheck={false}
            aria-label={operacion === "estado" ? "JSON editable de consulta" : "JSON editable del KUDE"}/>
          <small>Podés agregar propiedades. Se envía el JSON que escribís.</small>
        </div>)}</div>
      </section>
      {resultado && (
        <section className="panel consulta-resultado">
          <div className="panel-top">
            <strong>Resultado de la consulta</strong>
            <span
              className={`badge ${estado === "Aprobado" ? "success" : "warning"}`}
            >
              {estado || `HTTP ${resultado.http}`}
            </span>
          </div>
          {typeof resultado.data?.message === "string" && (
            <p>{resultado.data.message}</p>
          )}
          {estado && (
            <p>
              Estado de la operación: <strong>{estado}</strong>
            </p>
          )}
          {(resultado.data?.CDC || resultado.data?.message?.CDC) && (
            <p className="cdc">
              CDC: {resultado.data.CDC || resultado.data.message.CDC}
            </p>
          )}
          {!estado && !pdf && (
            <details>
              <summary>Ver respuesta</summary>
              <pre className="response-code">
                {JSON.stringify(resultado.data, null, 2)}
              </pre>
            </details>
          )}
        </section>
      )}
      {pdf && (
        <section className="panel visor-panel">
          <div className="panel-top">
            <strong>KUDE</strong>
            <div className="consulta-acciones">
              <button
                className="outline"
                onClick={() => alDescargar(pdf, nombre)}
              >
                <Download size={16} />
                Descargar PDF
              </button>
              {urlPdf && (
                <a
                  className="outline"
                  href={urlPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  Abrir PDF
                </a>
              )}
            </div>
          </div>
          {urlPdf && (
            <iframe
              title="KUDE consultado"
              src={urlPdf}
              className="visor-kude"
            />
          )}
        </section>
      )}
    </>
  );
}
