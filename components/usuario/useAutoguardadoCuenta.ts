"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Estado = "guardado" | "guardando" | "error";

/** Guardado por navegador, serializado para no pisar el último cambio con peticiones anteriores. */
export function useAutoguardadoCuenta(snapshot: Record<string, unknown>) {
  const [estado, setEstado] = useState<Estado>("guardado");
  const [mensaje, setMensaje] = useState("");
  const actual = useRef("");
  const confirmado = useRef("");
  const cola = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serializado = JSON.stringify(snapshot);
  actual.current = serializado;

  const guardarAhora = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const contenido = actual.current;
    if (contenido === confirmado.current) return cola.current;
    const tarea = async () => {
      if (contenido === confirmado.current) return;
      setEstado("guardando");
      const res = await fetch("/api/estado", {
        method: "PUT", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: contenido,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw Error(error.error || "No se pudo guardar tu trabajo.");
      }
      confirmado.current = contenido;
      setMensaje("");
      setEstado("guardado");
    };
    // Si falló un guardado, no bloquea permanentemente los siguientes.
    cola.current = cola.current.catch(() => {}).then(tarea).catch((e: unknown) => {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar.");
      throw e;
    });
    return cola.current;
  }, []);

  useEffect(() => {
    if (serializado === confirmado.current) return;
    setEstado("guardando");
    timer.current = setTimeout(() => { void guardarAhora().catch(() => {}); }, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [serializado, guardarAhora]);

  useEffect(() => {
    // Último cambio al cambiar de pestaña o cerrar; almacenado en el servidor por perfil de navegador.
    const enviarFinal = () => {
      if (actual.current === confirmado.current) return;
      void fetch("/api/estado", {
        method: "PUT", credentials: "same-origin", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: actual.current,
      }).catch(() => {});
    };
    const oculto = () => { if (document.visibilityState === "hidden") enviarFinal(); };
    window.addEventListener("pagehide", enviarFinal);
    document.addEventListener("visibilitychange", oculto);
    return () => { window.removeEventListener("pagehide", enviarFinal); document.removeEventListener("visibilitychange", oculto); };
  }, []);
  return { estado, mensaje, guardarAhora };
}
