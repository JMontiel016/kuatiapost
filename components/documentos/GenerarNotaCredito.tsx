"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Upload, Braces, Copy, Download, ShieldCheck, ChevronDown } from "lucide-react";
import Field from "../formularios/CampoTexto";
import { convertXml, recalcularNota } from "../../lib/documentos/convertir-xml-nota-credito";
import {
  pretty,
  parseObject,
} from "../../lib/integracion/solicitudes-integracion";
import { validarDocumento, informacionCampo } from "../../lib/documentos/campos-documentos";

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
  const [jsonEditable, cambiarJSON] = useState("");
  const [revision, cambiarRevision] = useState<string[] | null>(null);
  // Cada cambio del origen o los controles regenera el borrador de la nota.
  useEffect(() => { cambiarJSON(previa.json); cambiarRevision(null); }, [previa.json, previa.error]);
  const disponible = !!jsonEditable && !previa.error;
  function exportar(extension: string) {
    parseObject(jsonEditable);
    const url = URL.createObjectURL(new Blob([jsonEditable], { type: extension === "json" ? "application/json" : "text/plain" }));
    const enlace = document.createElement("a"); enlace.href=url;
    enlace.download=`KuatiaPost-Nota-de-Credito.${extension}`; enlace.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="xml-title"
        className="modal modal-nota-credito"
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
          {/* Comparte el catálogo iMotEmi con el formulario de emisión. */}
          <label className="field motivo-nc">
            <span><small className="motivo-codigo">iMotEmi</small> Motivo de emisión</span>
            <span className="selector-motivo">
            <select value={xmlOpts.reason} onChange={e=>setXmlOpts({...xmlOpts,reason:e.target.value})}>
              <option value="">Seleccioná un motivo</option>
              {informacionCampo("iMotEmi", {}, "5").opciones?.map(([codigo,nombre])=><option key={codigo} value={codigo}>{codigo} · {nombre}</option>)}
            </select>
            <ChevronDown size={18} aria-hidden="true"/>
            </span>
          </label>
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
        {xmlOpts.single && <p className="tiny">Por cantidad se conserva el precio original. Por monto se conserva la cantidad seleccionada y se recalcula el precio unitario. Separá valores por ; y usá punto decimal.</p>}
        <section className="nc-json-panel">
          <h3>JSON de la nota de crédito</h3>
          <p className="tiny">Los controles recalculan esta nota. Podés editar el resultado. Si cambiás cantidades o precios, pulsá Recalcular importes. Cambiar un control del origen vuelve a generar la nota.</p>
          <textarea className="auth-json-editable" aria-label="JSON editable de la nota de crédito" value={jsonEditable} onChange={e=>{cambiarJSON(e.target.value);cambiarRevision(null);}} placeholder="Cargá el XML para generar la nota de crédito." />
          <div className="nc-json-acciones">
            <button className="outline" disabled={!disponible} onClick={()=>attempt(async()=>{await navigator.clipboard.writeText(jsonEditable);setNotice("JSON de la nota copiado.");})}><Copy size={16}/>Copiar</button>
            <button className="outline" disabled={!disponible} onClick={()=>attempt(()=>exportar("json"))}><Download size={16}/>JSON</button>
            <button className="outline" disabled={!disponible} onClick={()=>attempt(()=>exportar("txt"))}><Download size={16}/>TXT</button>
            <button className="outline" disabled={!disponible} onClick={()=>attempt(()=>{cambiarJSON(pretty(recalcularNota(parseObject(jsonEditable))));cambiarRevision(null);})}><Braces size={16}/>Recalcular importes</button>
            <button className="outline" disabled={!disponible} onClick={()=>{try{cambiarRevision(validarDocumento(parseObject(jsonEditable),"5"));}catch(e:any){cambiarRevision([e.message]);}}}><ShieldCheck size={16}/>Revisar JSON</button>
          </div>
          {revision && <div role="status" className={`validation ${revision.length ? "revision-warning" : "revision-success"}`}>{revision.length ? revision.map((error,i)=><p key={i}>{error}</p>) : <p>Revisión completada sin problemas detectados.</p>}</div>}
        </section>
        {previa.error && <p role="status">{previa.error}</p>}
        <p className="tiny">
          El conversor conserva decimales y rechaza ajustes que su plantilla
          reducida no soporta. Revisá descuentos, anticipos y cambios de moneda.
        </p>
        <button
          className="primary"
          disabled={!disponible}
          onClick={() =>
            attempt(() => {
              if (previa.error) throw Error(previa.error);
              const nota = parseObject(jsonEditable);
              if (String(nota.iTiDE) !== "5") throw Error("El JSON debe corresponder a una nota de crédito (iTiDE=5).");
              // Usar el borrador que se ve, incluyendo las modificaciones manuales.
              setBody(pretty(nota));
              setType("5");
              setMode("emit");
              setErrors([]);
              setXmlOpen(false);
              setNotice("Nota de crédito cargada. Revisá los datos antes de enviar.");
              setView("workspace");
            })
          }
        >
          <Braces size={16} />
          Usar nota de crédito en Envío de datos
        </button>
      </section>
    </div>
  );
}
