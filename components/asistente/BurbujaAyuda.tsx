"use client";

import { useState } from "react";
import { MessageSquare, Send, ChevronDown } from "lucide-react";
import type { CampoEnfocado } from "../documentos/CamposDocumento";

type Propiedades = {
  faltantes: { codigo: string; nombre: string; motivo: string; ejemplo: string }[];
  campo: CampoEnfocado | null;
  alPreguntar: (pregunta: string) => void;
};

/**
 * Ayuda visible durante la edición, sin enviar datos a una IA automáticamente.
 *
 * La guía inmediata procede de reglas locales comprobables.
 * El botón del asistente envía una consulta real al asistente del servidor.
 * Esta distinción evita presentar mensajes fijos como respuestas generadas.
 */
export default function BurbujaAyuda({
  faltantes,
  campo,
  alPreguntar,
}: Propiedades) {
  const [abierta, cambiarAbierta] = useState(true);
  // Se muestra un solo pendiente. Al completarlo, las reglas del formulario
  // lo retiran de faltantes y el siguiente aparece sin consultar al servidor.
  const pendiente = faltantes[0];
  const actual = campo || pendiente;
  const pregunta = actual
    ? `Explicá (${actual.codigo}) ${actual.nombre}: cuándo es obligatorio y cómo completarlo. ${actual.motivo}`
    : "Explicá cómo revisar el registro antes de enviarlo.";

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
          <span className="cantidad-faltantes" aria-label="Abrir ayuda">Abrir ayuda</span>
        )}
      </button>
      {abierta && (
        <div className="burbuja-contenido">
          {/* La ayuda inmediata muestra solo un campo y su ejemplo de formato.
              Las referencias quedan en los datos internos del asistente. */}
          {actual ? (
            <>
              <strong>({actual.codigo}) {actual.nombre}</strong>
              <div className="ejemplo-burbuja">Ejemplo: {actual.ejemplo}</div>
            </>
          ) : <p>Sin campos pendientes detectados.</p>}
          <button className="primary" onClick={() => alPreguntar(pregunta)}>
            <Send size={15} />
            Consultar al asistente
          </button>
        </div>
      )}
    </aside>
  );
}
