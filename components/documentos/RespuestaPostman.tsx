"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, Copy, Clock3, FileJson2 } from "lucide-react";

export type RespuestaOperacion = {
  http: number;
  elapsed?: number;
  data: unknown;
};

type Props = {
  resultado: RespuestaOperacion | null;
  titulo?: string;
};

/** Respuesta de la API: aparece únicamente después de ejecutar la solicitud. */
export default function RespuestaPostman({ resultado, titulo = "Respuesta del servicio" }: Props) {
  const [copiado, setCopiado] = useState(false);
  if (!resultado) return null;

  const data = resultado.data;
  const status = data && typeof data === "object" && "status" in data
    ? String((data as Record<string, unknown>).status)
    : "";
  const correcto = resultado.http >= 200 && resultado.http < 300 && status !== "error";
  const http = resultado.http > 0 ? `HTTP ${resultado.http}` : "Sin respuesta HTTP";
  const original = typeof data === "string" ? data : JSON.stringify(data ?? null, null, 2);
  const size = new TextEncoder().encode(original).length;
  const formato = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
  const mensaje = data && typeof data === "object" && "message" in data
    ? (data as Record<string, unknown>).message : null;
  const errores: string[] = [];
  if (!correcto && mensaje) {
    const recorrer = (valor: unknown, campo = ""): void => {
      if (errores.length >= 30) return;
      if (typeof valor === "string" && valor.trim()) errores.push(campo ? `${campo}: ${valor}` : valor);
      else if (Array.isArray(valor)) valor.forEach(v => recorrer(v, campo));
      else if (valor && typeof valor === "object")
        Object.entries(valor).forEach(([k, v]) => recorrer(v, k));
    };
    recorrer(mensaje);
  }

  // No se monta un bloque enorme de base64 en el DOM: el botón copiar conserva el JSON real.
  let textoVisible = original;
  let omitido = false;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const objeto = data as Record<string, unknown>;
    const vista: Record<string, unknown> = { ...objeto };
    for (const clave of ["kude", "xml"]) {
      const valor = vista[clave];
      if (typeof valor === "string" && valor.length > 1500) {
        vista[clave] = `[base64 de ${valor.length} caracteres; usá Copiar JSON completo o el visor de KUDE]`;
        omitido = true;
      }
    }
    if (omitido) textoVisible = JSON.stringify(vista, null, 2);
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(original);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch { setCopiado(false); }
  };
  return (
    <section className="panel postman-response" aria-live="polite">
      <div className="postman-response-header">
        <div>
          <div className="eyebrow">RESULTADO DE LA OPERACIÓN</div>
          <h3>{titulo}</h3>
        </div>
        <div className="postman-response-stats">
          <span className={correcto ? "postman-status ok" : "postman-status error"}>
            {correcto ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
            {http}{status ? ` · ${status}` : ""}
          </span>
          {typeof resultado.elapsed === "number" && <span><Clock3 size={14} /> {resultado.elapsed} ms</span>}
          <span>{formato}</span>
        </div>
      </div>
      {errores.length > 0 && (
        <div className="postman-response-errors" role="alert">
          <strong>El servicio informó un error:</strong>
          <ul>{errores.map((error, i) => <li key={i}>{error}</li>)}</ul>
        </div>
      )}
      <div className="postman-response-body-header">
        <span><FileJson2 size={16} /> Body · {typeof data === "string" ? "Texto" : "JSON"}</span>
        <button type="button" className="outline" onClick={() => void copiar()}>
          <Copy size={15} /> {copiado ? "Copiado" : "Copiar respuesta completa"}
        </button>
      </div>
      <pre className="postman-response-json">{textoVisible}</pre>
      {omitido && <p className="postman-response-hint">La vista previa acorta el base64 del archivo. Copiar respuesta completa conserva el valor original.</p>}
    </section>
  );
}
