"use client";

import { useState } from "react";
import { MessageSquare, Send, ChevronDown } from "lucide-react";
import type { CampoEnfocado } from "../documentos/CamposDocumento";

type Propiedades = {
  faltantes: { codigo: string; nombre: string; motivo: string }[];
  campo: CampoEnfocado | null;
  alPreguntar: (pregunta: string) => void;
};

/**
 * Ayuda visible durante la edición, sin enviar datos a una IA automáticamente.
 *
 * La guía inmediata procede de reglas locales comprobables.
 * El botón Llama envía una consulta real al asistente del servidor.
 * Esta distinción evita presentar mensajes fijos como respuestas generadas.
 */
export default function BurbujaAyuda({
  faltantes,
  campo,
  alPreguntar,
}: Propiedades) {
  const [abierta, cambiarAbierta] = useState(true);
  const pregunta = campo
    ? `Explicá (${campo.codigo}) ${campo.nombre}: cuándo es obligatorio y cómo completarlo. ${campo.motivo}`
    : `Explicá cómo completar estos campos obligatorios de la plantilla: ${faltantes
        .slice(0, 8)
        .map((f) => `(${f.codigo}) ${f.nombre}`)
        .join("; ")}.`;

  return (
    <aside
      className={`burbuja-ayuda ${abierta ? "abierta" : ""}`}
      aria-label="Ayuda del asistente"
    >
      <button
        className="burbuja-cabecera"
        onClick={() => cambiarAbierta(!abierta)}
        aria-expanded={abierta}
      >
        <MessageSquare size={19} />
        <span>Asistente</span>
        {abierta ? (
          <ChevronDown size={17} />
        ) : (
          <span className="cantidad-faltantes" aria-label="Abrir ayuda">Abrir · {faltantes.length}</span>
        )}
      </button>
      {abierta && (
        <div className="burbuja-contenido">
          <span className="tiny">Guía de campos · Consultá para ampliar</span>
          {campo ? (
            <>
              <strong>
                ({campo.codigo}) {campo.nombre}
              </strong>
              <p>{campo.motivo}</p>
              <div className="ejemplo-burbuja">Ejemplo: {campo.ejemplo}</div>
              <small>{campo.referencia}</small>
            </>
          ) : (
            <>
              <strong>
                {faltantes.length
                  ? `${faltantes.length} campos obligatorios por completar`
                  : "Sin campos faltantes detectados en la plantilla"}
              </strong>
              <p>
                Seleccioná un campo para ver qué significa y por qué se pide.
              </p>
            </>
          )}
          {faltantes.length > 0 && (
            <ul>
              {faltantes.slice(0, 3).map((f, i) => (
                <li key={`${f.codigo}-${i}`}>
                  ({f.codigo}) {f.nombre}
                </li>
              ))}
              {faltantes.length > 3 && (
                <li>Y {faltantes.length - 3} campos más.</li>
              )}
            </ul>
          )}
          <button className="primary" onClick={() => alPreguntar(pregunta)}>
            <Send size={15} />
            Consultar al asistente
          </button>
        </div>
      )}
    </aside>
  );
}
