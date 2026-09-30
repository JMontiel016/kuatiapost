"use client";

import { useMemo } from "react";
import { X, Upload, Braces } from "lucide-react";
import Field from "../formularios/CampoTexto";
import { convertXml } from "../../lib/documentos/convertir-xml-nota-credito";
import {
  pretty,
  parseObject,
} from "../../lib/integracion/solicitudes-integracion";
import { vaciarCamposOpcionales } from "../../lib/documentos/campos-documentos";

/**
 * Conversión de una factura XML a nota de crédito.
 * Los datos de numeración pertenecen a la nueva NC, no a la factura original.
 * La selección por código admite cantidades parciales y conserva decimales.
 */
export default function GenerarNotaCredito({
  setXmlOpen,
  xmlFile,
  attempt,
  setXml,
  xml,
  xmlOpts,
  setXmlOpts,
  setBody,
  setType,
  setMode,
  setErrors,
  setNotice,
  setView,
}: any) {
  // La vista previa se recalcula con cada letra sin sobrescribir el borrador de emisión.
  const previa = useMemo(() => {
    if (!xml.trim()) return { json: "", error: "" };
    try {
      const resultado = convertXml({ ...xmlOpts, xml, establishment: "", point: "", number: "" });
      const datos = parseObject(resultado.json);
      datos.dEst = xmlOpts.establishment;
      datos.dPunExp = xmlOpts.point;
      datos.dNumDoc = xmlOpts.number;
      return { json: pretty(datos), error: "" };
    } catch (e: any) { return { json: "", error: e.message }; }
  }, [xml, xmlOpts]);
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="xml-title"
        className="modal"
      >
        <div className="panel-top">
          <h2 id="xml-title">Nota de crédito desde XML</h2>
          <button
            aria-label="Cerrar conversor"
            onClick={() => setXmlOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Importá una factura electrónica. Seleccioná los ítems o convertí la
          factura completa.
        </p>
        <button className="outline" onClick={() => xmlFile.current?.click()}>
          <Upload size={16} />
          Cargar XML de factura
        </button>
        <input
          hidden
          ref={xmlFile}
          type="file"
          accept=".xml,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              attempt(async () => {
                if (f.size > 4_000_000) throw Error("XML máximo: 4 MB.");
                setXml(await f.text());
              });
            e.target.value = "";
          }}
        />
        <textarea
          className="xml-input"
          aria-label="XML de la factura"
          placeholder="O pegá acá el XML completo…"
          value={xml}
          onChange={(e) => setXml(e.target.value)}
        />
        <div className="three-fields">
          {[
            ["establishment", "Establecimiento (3 dígitos)"],
            ["point", "Punto de expedición (3 dígitos)"],
            ["number", "Número NC (7 dígitos)"],
            ["date", "Fecha de emisión"],
            ["reason", "Motivo NC (1–8)"],
          ].map(([k, label]) => (
            <Field
              key={k}
              label={label}
              type={k === "date" ? "date" : "text"}
              maxLength={k === "establishment" || k === "point" ? 3 : k === "number" ? 7 : undefined}
              soloDigitos={["establishment", "point", "number"].includes(k)}
              value={xmlOpts[k]}
              onChange={(v: string) => setXmlOpts({ ...xmlOpts, [k]: v })}
            />
          ))}
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={xmlOpts.single}
            onChange={(e) =>
              setXmlOpts({ ...xmlOpts, single: e.target.checked })
            }
          />
          Seleccionar ítems para una NC parcial
        </label>
        {xmlOpts.single && (
          <div className="three-fields">
            <Field
              label="Códigos de producto, separados por ; (vacío: todos)"
              value={xmlOpts.code}
              onChange={(v: string) => setXmlOpts({ ...xmlOpts, code: v })}
            />
            <Field
              label="Cantidades por línea, separadas por ; (opcional)"
              value={xmlOpts.quantity}
              onChange={(v: string) => setXmlOpts({ ...xmlOpts, quantity: v })}
            />
            <Field
              label="Monto parcial total o por código (opcional)"
              value={xmlOpts.amount}
              onChange={(v: string) => setXmlOpts({ ...xmlOpts, amount: v })}
            />
          </div>
        )}
        {previa.json && <details open><summary>JSON de la nota de crédito · vista previa en tiempo real</summary><pre className="response-code">{previa.json}</pre></details>}
        {previa.error && <p role="status">{previa.error}</p>}
        <p className="tiny">
          El conversor conserva decimales y rechaza ajustes que su plantilla
          reducida no soporta. Revisá descuentos, anticipos y cambios de moneda.
        </p>
        <button
          className="primary"
          onClick={() =>
            attempt(() => {
              if (xmlOpts.single && !xmlOpts.code.trim() && xmlOpts.quantity.trim())
                throw Error(
                  "Indicá los códigos de los ítems para una NC parcial.",
                );
              const result = convertXml({ ...xmlOpts, xml });
              setBody(
                pretty(vaciarCamposOpcionales(parseObject(result.json), "5")),
              );
              setType("5");
              setMode("emit");
              setErrors([]);
              setXmlOpen(false);
              setNotice(result.summary);
              setView("workspace");
            })
          }
        >
          <Braces size={16} />
          Generar JSON editable
        </button>
      </section>
    </div>
  );
}
