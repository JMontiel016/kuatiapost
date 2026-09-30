"use client";

import { Download, Files, Plus } from "lucide-react";
import { exportHistory } from "../../lib/documentos/excel-documentos";
import { pretty } from "../../lib/integracion/solicitudes-integracion";
import { tiposDocumento as documentTypes } from "../../lib/documentos/plantillas-documentos";

/** Historial de documentos y solicitudes de la sesión: presenta datos y utiliza las acciones del coordinador. */
export default function HistorialDocumentos({
  records,
  attempt,
  save,
  setView,
  setBody,
  setResponse,
  setUrl,
  setMode,
  setType,
  setKudeUrl,
  downloadExcel,
}: any) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACTIVIDAD DE ESTA SESIÓN</div>
          <h1>Documentos y solicitudes</h1>
          <p>Revisá los envíos, sus respuestas y exportá los datos a Excel.</p>
        </div>
        <button
          className="outline"
          disabled={!records.length}
          onClick={() =>
            attempt(async () =>
              save(await exportHistory(records), "Documentos.xlsx"),
            )
          }
        >
          <Download size={16} />
          Exportar todos
        </button>
        <button className="primary" onClick={() => setView("workspace")}>
          <Plus size={16} />
          Nuevo documento
        </button>
      </div>
      <section className="panel history">
        {records.length ? (
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Operación</th>
                <th>Fecha</th>
                <th>Respuesta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.type}</strong>
                    <small>{r.request.dNumDoc || "Sin número"}</small>
                  </td>
                  <td>
                    {r.operation === "emit"
                      ? "Emisión"
                      : r.operation === "query"
                        ? "Consulta"
                        : r.operation === "token"
                          ? "Token"
                          : "Personalizada"}
                  </td>
                  <td>{r.date}</td>
                  <td>
                    <span
                      className={
                        r.response.http < 300
                          ? "badge success"
                          : "badge warning"
                      }
                    >
                      HTTP {r.response.http}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setBody(pretty(r.request));
                        setResponse(r.response);
                        setUrl(r.url);
                        setMode(r.operation);
                        if (
                          documentTypes.some(
                            (d) => d.id === String(r.request.iTiDE),
                          )
                        )
                          setType(String(r.request.iTiDE));
                        setKudeUrl("");
                        setView("workspace");
                      }}
                    >
                      Abrir
                    </button>
                    <button
                      className="text-button"
                      onClick={() => downloadExcel(r.request, r.response)}
                    >
                      Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-history">
            <Files size={40} />
            <h3>Todavía no hay solicitudes</h3>
            <p>Los envíos y consultas de esta sesión aparecerán acá.</p>
            <button className="outline" onClick={() => setView("workspace")}>
              Ir al envío de documentos
            </button>
          </div>
        )}
      </section>
    </>
  );
}
