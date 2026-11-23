"use client";

import { useEffect, useState } from "react";
import EnvioDocumentos from "../envio-documentos/EnvioDocumentos";

/** Recupera automáticamente el último borrador del navegador antes de montar
 * el editor, sin mostrar formularios de acceso ni pedir contraseña.
 */
export default function AplicacionPrivada() {
  const [inicial, setInicial] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const cuenta = await fetch("/api/cuenta", {
          credentials: "same-origin", cache: "no-store",
        });
        if (!cuenta.ok) throw Error("No se pudo preparar el espacio de este navegador.");
        const respuesta = await fetch("/api/estado", {
          credentials: "same-origin", cache: "no-store",
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw Error(datos.error || "No se pudo recuperar el último trabajo.");
        if (activo) {
          const estado = datos.data && typeof datos.data === "object" && !Array.isArray(datos.data)
            ? datos.data as Record<string, unknown> : {};
          setInicial(estado);
          setError("");
        }
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "No se pudo abrir el espacio.");
      }
    })();
    return () => { activo = false; };
  }, [intento]);

  if (inicial !== null) return <EnvioDocumentos inicial={inicial} />;
  return (
    <main role="status" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <p>Tu trabajo anterior no se borró. Volvé a intentar cuando esté disponible el servidor.</p>
            <button type="button" className="outline" onClick={() => { setError(""); setIntento(v => v + 1); }}>
              Reintentar
            </button>
          </>
        ) : "Cargando KuatiaPost…"}
      </div>
    </main>
  );
}
