"use client";

import { useState } from "react";
import { HelpCircle, Plus } from "lucide-react";
import {
  estaVacio,
  informacionCampo,
  vaciarCamposOpcionales,
} from "../../lib/documentos/campos-documentos";

import { crearPlantilla } from "../../lib/documentos/plantillas-documentos";
import {
  formatoCampo,
  descripcionFormato,
  errorFormato,
} from "../../lib/documentos/formatos-campos";

/** Información que la burbuja utiliza cuando una persona enfoca un campo. */
export type CampoEnfocado = {
  codigo: string;
  nombre: string;
  motivo: string;
  referencia: string;
  ejemplo: string;
};

type Propiedades = {
  documento: any;
  tipo: string;
  alCambiar: (documento: any) => void;
  alEnfocar: (campo: CampoEnfocado) => void;
};

const nombresGrupos: Record<string, string> = {
  Detalles: "Productos y servicios",
  Subtotales: "Totales del registro",
  Pagos: "Pagos de la venta",
  DocumentosAsociados: "Referencia de origen",
  Transporte: "Transportista y conductor",
  Salida: "Lugar de salida",
  Entrega: "Lugar de entrega",
};

/**
 * Formulario legible de la plantilla.
 *
 * Los campos obligatorios llevan una marca y muestran un mensaje si faltan.
 * Los opcionales quedan vacíos, bloqueados y ocultos hasta que se pide verlos.
 * Los condicionales se muestran con su regla: elegir un dato controlador activa
 * el campo requerido, por ejemplo iNatRec=1 activa el RUC del receptor.
 */
export default function CamposDocumento({
  documento: recibido,
  tipo,
  alCambiar,
  alEnfocar,
}: Propiedades) {
  // Incluye campos ausentes al importar un JSON sin reemplazar sus valores.
  const base = crearPlantilla(tipo) as any;
  const documento = { ...base, ...recibido };
  for (const [grupo, filas] of Object.entries(recibido)) {
    if (Array.isArray(filas))
      documento[grupo] = filas.map((fila) =>
        typeof fila === "object" && fila !== null
          ? { ...(base[grupo]?.[0] || {}), ...fila }
          : fila,
      );
  }
  const [verOpcionales, cambiarVerOpcionales] = useState(false);
  const [ayuda, cambiarAyuda] = useState<string | null>(null);

  // La limpieza ocurre al editar, antes de devolver la plantilla al padre.
  const guardar = (nuevo: any) =>
    alCambiar(vaciarCamposOpcionales(nuevo, tipo));

  function campo(
    codigo: string,
    valor: any,
    ruta: string,
    fila: any,
    grupo: string,
  ) {
    // IVA cero automático: no se solicita al usuario para exentos o exonerados.
    if (
      grupo === "Detalles" &&
      ["2", "3"].includes(String(fila.iAfecIVA)) &&
      ["dPropIVA", "dTasaIVA", "dBasGravIVA", "dLiqIVAItem"].includes(codigo)
    )
      return null;
    if (
      grupo === "Subtotales" &&
      (documento.Detalles || []).length &&
      documento.Detalles.every((item: any) =>
        ["2", "3"].includes(String(item.iAfecIVA)),
      ) &&
      ["dTotIVA", "dTBasGraIVA"].includes(codigo)
    )
      return null;
    // Una plantilla importada no habilita campos de un tipo documental distinto.
    if (grupo ? !(codigo in (base[grupo]?.[0] || {})) : !(codigo in base)) return null;
    const info = informacionCampo(codigo, documento, tipo, fila, grupo);
    if (info.estado === "opcional" && estaVacio(valor) && !verOpcionales) return null;
    // Los datos que no corresponden se retiran del formulario, aunque hayan sido
    // escritos antes de cambiar la selección. El JSON libre conserva su control.
    const inaplicable = info.estado === "opcional" && info.motivo.startsWith("No corresponde:");
    if (inaplicable) return null;
    if (grupo === "Pagos" && ["dRSProTar","dRUCProTar","dDVProTar","dCodAuOpe","dNomTit","dNumTarj"].includes(codigo) && !["3","4"].includes(String(fila.iTiPago))) return null;
    const bloqueado = false;
    const formato = formatoCampo(codigo);
    const fueraDelCatalogo =
      !estaVacio(valor) &&
      !!info.opciones &&
      !info.opciones.some(([opcion]) => opcion === String(valor));
    const error = fueraDelCatalogo
      ? "Elegí una opción válida del selector."
      : errorFormato(codigo, valor);
    const falta = info.estado === "obligatorio" && estaVacio(valor);
    const enfocar = () => {
      cambiarAyuda(ayuda === ruta ? null : ruta);
      alEnfocar({
        codigo,
        nombre: info.nombre,
        motivo: info.motivo,
        referencia: info.referencia,
        ejemplo: info.ejemplo,
      });
    };

    // Cambia únicamente la ruta seleccionada, preservando las otras filas.
    const actualizar = (texto: string) => {
      const nuevo = structuredClone(documento);
      const partes = ruta.split(".");
      let padre = nuevo;
      for (const parte of partes.slice(0, -1)) padre = padre[parte];
      padre[partes.at(-1)!] = texto;
      // Cambiar un selector limpia exclusivamente sus dependencias incompatibles.
      if (codigo === "iNatRec") {
        for (const k of texto === "1" ? ["iTipIDRec","dDTipIDRec","dNumIDRec"] : ["iTiContRec","dRucRec","dDVRec"]) delete nuevo[k];
      }
      if (codigo === "iIndPres" && texto !== "9") delete nuevo.dDesIndPres;
      if (codigo === "iTipIDRec" && texto !== "9") delete nuevo.dDTipIDRec;
      // La condición de crédito conserva solo el plazo o las cuotas elegidas.
      if (codigo === "iCondOpe" && texto === "1") {
        for (const k of ["iCondCred", "dPlazoCre", "dCuotas", "dMonEnt"]) delete nuevo[k];
      }
      if (codigo === "iCondCred" && texto === "1") delete nuevo.dCuotas;
      if (codigo === "iCondCred" && texto === "2") delete nuevo.dPlazoCre;
      if (codigo === "iDenTarj" && texto !== "99") delete padre.dDesDenTarj;
      if (codigo === "iTiPago") {
        if (texto !== "2") for (const k of ["dNumCheq","dBcoEmi"]) delete padre[k];
        if (texto !== "99") delete padre.dDesTiPag;
        if (!["3","4"].includes(texto)) for (const k of ["iDenTarj","dDesDenTarj","iForProPa","dRSProTar","dRUCProTar","dDVProTar","dCodAuOpe","dNomTit","dNumTarj"]) delete padre[k];
      }

      guardar(nuevo);
    };

    return (
      <div
        className={`campo-documento ${falta ? "campo-faltante" : ""} ${bloqueado ? "campo-opcional" : ""}`}
        key={ruta}
      >
        <div className="campo-titulo">
          <label htmlFor={ruta}>
            <span className="codigo-campo">({codigo})</span> {info.nombre}{" "}
            {info.estado === "obligatorio" && (
              <b className="asterisco" aria-label="obligatorio">
                *
              </b>
            )}
          </label>
          <button
            type="button"
            title={`Ayuda sobre ${info.nombre}`}
            aria-label={`Ayuda sobre ${info.nombre}`}
            onClick={enfocar}
          >
            <HelpCircle size={16} />
          </button>
        </div>
        {ayuda === ruta && <p className="ayuda-campo" role="status">{info.motivo} Ejemplo de formato: {info.ejemplo}.</p>}
        {info.opciones && !bloqueado ? (
          <select
            id={ruta}
            value={String(valor ?? "")}
            onFocus={enfocar}
            onChange={(e) => actualizar(["dEst", "dPunExp"].includes(codigo) ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value)}
            aria-required={info.estado === "obligatorio"}
            aria-invalid={falta || !!error}
            aria-describedby={`${ruta}-ayuda`}
          >
            <option value="">Seleccioná una opción</option>
            {fueraDelCatalogo && (
              <option value={String(valor)} disabled>
                {String(valor)} · Código no permitido para estos datos
              </option>
            )}
            {info.opciones.map(([codigo, nombre]) => (
              <option key={codigo} value={codigo}>
                {codigo} · {nombre}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={ruta}
            value={bloqueado ? "" : String(valor ?? "")}
            disabled={bloqueado}
            inputMode={
              formato?.tipo === "numero"
                ? formato.decimales
                  ? "decimal"
                  : "numeric"
                : "text"
            }
            maxLength={
              formato
                ? formato.maximo +
                  (formato.decimales ? formato.decimales + 1 : 0)
                : undefined
            }
            placeholder={`Ejemplo: ${info.ejemplo}`}
            onFocus={enfocar}
            onChange={(e) => actualizar(["dEst", "dPunExp"].includes(codigo) ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value)}
            aria-required={info.estado === "obligatorio"}
            aria-invalid={falta || !!error}
            aria-describedby={`${ruta}-ayuda`}
          />
        )}
        <small id={`${ruta}-ayuda`} className="ayuda-campo">
          {error || (falta ? "Falta completar. " : "")}
          {descripcionFormato(codigo)}
        </small>
      </div>
    );
  }

  // Un grupo conserva el nombre técnico de su clave y ofrece un título humano.
  function grupo(codigo: string, filas: any[]) {
    return (
      <section className="grupo-documento" key={codigo}>
        <h4>
          {nombresGrupos[codigo] || codigo} <span>({codigo})</span>
        </h4>
        {filas.map((fila, i) => (
          <div className="fila-documento" key={i}>
            <p className="tiny">
              {codigo === "Detalles"
                ? "Producto"
                : nombresGrupos[codigo] || codigo}{" "}
              · {i + 1}
            </p>
            <div className="rejilla-campos">
              {fila && typeof fila === "object" ? (
                Object.entries(fila).map(([campoCodigo, valor]) =>
                  campo(
                    campoCodigo,
                    valor,
                    `${codigo}.${i}.${campoCodigo}`,
                    fila,
                    codigo,
                  ),
                )
              ) : (
                <p>Esta fila se edita desde el JSON.</p>
              )}
            </div>
            <button
              className="text-button danger"
              onClick={() =>
                guardar({
                  ...documento,
                  [codigo]: filas.filter((_, n) => n !== i),
                })
              }
            >
              {codigo === "Detalles"
                ? "Eliminar producto"
                : "Eliminar registro"}
            </button>
          </div>
        ))}
        <button
          className="outline small"
          onClick={() =>
            guardar({
              ...documento,
              [codigo]: [
                ...filas,
                structuredClone(
                  (crearPlantilla(tipo) as any)[codigo]?.[0] ||
                    Object.fromEntries(
                      Object.keys(filas[0] || {}).map((k) => [k, ""]),
                    ),
                ),
              ],
            })
          }
        >
          <Plus size={14} />
          {codigo === "Detalles" ? "Añadir producto" : "Añadir registro"}
        </button>
      </section>
    );
  }

  return (
    <>
      <div className="instruccion-campos">
        <strong>
          <span className="asterisco">*</span> Campo obligatorio
        </strong>
        <p>
          Completá los datos en orden. Los productos exentos y exonerados no
          generan IVA.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={verOpcionales}
            onChange={(e) => cambiarVerOpcionales(e.target.checked)}
          />
          Ver campos opcionales
        </label>
      </div>
      {[
        [
          "Datos generales",
          [
            "tipOpe",
            "iTiDE",
            "dEst",
            "dPunExp",
            "dNumDoc",
            "dFeEmiDE",
            "iTipTra",
            "iTImp",
            "cMoneOpe",
            "dCondTiCam",
            "dTiCam",
            "iIndPres",
          ],
        ],
        [
          "Datos del receptor",
          [
            "iNatRec",
            "iTiOpe",
            "cPaisRec",
            "iTiContRec",
            "dRucRec",
            "dDVRec",
            "iTipIDRec",
            "dNumIDRec",
            "dNomRec",
            "dDirRec",
            "dNumCasRec",
            "cDepRec",
            "cDisRec",
            "cCiuRec",
            "dTelRec",
            "dCelRec",
            "dEmailRec",
          ],
        ],
        [
          "Datos específicos",
          Object.keys(documento).filter(
            (k) =>
              ![
                "tipOpe",
                "iTiDE",
                "dEst",
                "dPunExp",
                "dNumDoc",
                "dFeEmiDE",
                "iTipTra",
                "iTImp",
                "cMoneOpe",
                "dCondTiCam",
                "dTiCam",
                "iIndPres",
                "iNatRec",
                "iTiOpe",
                "cPaisRec",
                "iTiContRec",
                "dRucRec",
                "dDVRec",
                "iTipIDRec",
                "dNumIDRec",
                "dNomRec",
                "dDirRec",
                "dNumCasRec",
                "cDepRec",
                "cDisRec",
                "cCiuRec",
                "dTelRec",
                "dCelRec",
                "dEmailRec",
              ].includes(k) &&
              !Array.isArray(documento[k]) &&
              (typeof documento[k] !== "object" || documento[k] === null),
          ),
        ],
      ].map(([titulo, claves]) => {
        const campos = (claves as string[])
          .filter((k) => k in documento)
          .map((k) => campo(k, documento[k], k, documento, ""))
          .filter(Boolean);
        return campos.length ? (
          <section className="grupo-documento" key={titulo as string}>
            <h4>{titulo}</h4>
            <div className="rejilla-campos">{campos}</div>
          </section>
        ) : null;
      })}
      {Object.entries(documento)
        .filter(([, valor]) => Array.isArray(valor))
        .map(([codigo, valor]) => grupo(codigo, valor as any[]))}
    </>
  );
}
