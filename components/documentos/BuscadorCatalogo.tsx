"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/** Buscador desplegable reutilizable para códigos geográficos y países.
 * La lista se monta sobre document.body para que un modal con scroll NO la corte
 * ni mezcle los resultados con los campos del formulario.
 */
export type OpcionCatalogo = { codigo: string; nombre: string; nota?: string };
type Props = {
  titulo: string;
  codigo: string;
  opciones: OpcionCatalogo[];
  seleccionar: (codigo: string) => void;
  deshabilitado?: boolean;
  cargando?: boolean;
  error?: string;
  placeholder?: string;
  permitirQuitar?: boolean;
};
type UbicacionLista = { left: number; top: number; width: number; maxHeight: number };
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PY");

export default function BuscadorCatalogo({
  titulo, codigo, opciones, seleccionar, deshabilitado = false,
  cargando = false, error = "", placeholder, permitirQuitar = true,
}: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const [posicion, setPosicion] = useState<UbicacionLista | null>(null);
  const seleccionado = opciones.find(x => x.codigo === codigo);
  const resultados = useMemo(() => {
    const filtro = normalizar(texto.trim());
    return filtro ? opciones.filter(x => normalizar(`${x.nombre} ${x.codigo} ${x.nota || ""}`).includes(filtro)) : opciones;
  }, [opciones, texto]);
  // El límite es visual; buscar siempre consulta el catálogo completo ya filtrado por departamento.
  const visibles = resultados.slice(0, 100);

  const colocarLista = useCallback(() => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    const ancho = Math.min(Math.max(bounds.width, 290), window.innerWidth - 24);
    const izquierda = Math.max(12, Math.min(bounds.left, window.innerWidth - ancho - 12));
    const abajo = window.innerHeight - bounds.bottom;
    const arriba = bounds.top;
    const mostrarArriba = abajo < 245 && arriba > abajo;
    const alto = Math.max(135, Math.min(350, (mostrarArriba ? arriba : abajo) - 16));
    setPosicion({
      left: izquierda,
      top: mostrarArriba ? Math.max(10, bounds.top - alto - 6) : bounds.bottom + 5,
      width: ancho,
      maxHeight: alto,
    });
  }, []);

  useEffect(() => {
    if (!abierto) return;
    colocarLista();
    const recolocar = () => colocarLista();
    window.addEventListener("resize", recolocar);
    // Capture: también se mueve al desplazarse cualquier modal/tabla.
    window.addEventListener("scroll", recolocar, true);
    const fuera = (e: PointerEvent) => {
      if (!trigger.current?.contains(e.target as Node) && !lista.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    const enfocar = window.requestAnimationFrame(() => buscador.current?.focus());
    return () => {
      window.cancelAnimationFrame(enfocar);
      window.removeEventListener("resize", recolocar);
      window.removeEventListener("scroll", recolocar, true);
      document.removeEventListener("pointerdown", fuera);
    };
  }, [abierto, colocarLista]);

  const elegir = (valor: string) => {
    seleccionar(valor);
    setAbierto(false);
    setTexto("");
    setIndice(0);
    trigger.current?.focus();
  };
  const abrir = () => {
    if (deshabilitado || cargando || error) return;
    setTexto(""); setIndice(0);
    setAbierto(v => !v);
  };
  const disabled = deshabilitado || cargando || !!error;

  return <div className="kp-selector-campo geo-campo">
    <label className="kp-selector-label" id={`${id}-label`}>{titulo}</label>
    <div className="kp-selector-control">
      <button type="button" ref={trigger} aria-labelledby={`${id}-label`} aria-haspopup="listbox" aria-controls={abierto ? `${id}-lista` : undefined}
        aria-expanded={abierto} disabled={disabled} className="kp-selector-trigger" onClick={abrir}
        title={seleccionado ? `${seleccionado.nombre} · Código ${seleccionado.codigo}` : undefined}>
        <span className={seleccionado ? "kp-selector-text" : "kp-selector-hint"}>{cargando ? "Cargando…" : seleccionado?.nombre || (codigo ? `Código ${codigo} no encontrado` : placeholder || `Seleccionar ${titulo.toLowerCase()}`)}</span>
        {seleccionado && <span className="kp-selector-code">{seleccionado.codigo}</span>}
        <ChevronDown size={15} aria-hidden="true" className={abierto ? "kp-selector-chevron-open" : ""}/>
      </button>
      {codigo && permitirQuitar && !disabled && <button className="kp-selector-clear" type="button" title={`Quitar ${titulo.toLowerCase()}`} aria-label={`Quitar selección de ${titulo.toLowerCase()}`} onClick={() => elegir("")}><X size={14}/></button>}
    </div>
    {!!error && <span role="alert" className="kp-selector-error">{error}</span>}
    {!error && !!codigo && !seleccionado && !cargando && !deshabilitado && <span role="alert" className="kp-selector-error">Código fuera del catálogo: volvé a elegir.</span>}
    {abierto && posicion && createPortal(<div className="kp-selector-popover" ref={lista}
      style={{ position: "fixed", left: posicion.left, top: posicion.top, width: posicion.width, maxHeight: posicion.maxHeight, zIndex: 2147483000 }}
      role="dialog" aria-label={`Seleccionar ${titulo.toLowerCase()}`}>
      <div className="kp-selector-search"><Search size={16} aria-hidden="true"/><input type="search" ref={buscador}
        value={texto} aria-label={`Buscar ${titulo.toLowerCase()} por nombre o código`} placeholder="Buscar por nombre o código…"
        onChange={e => { setTexto(e.target.value); setIndice(0); }}
        onKeyDown={e => {
          // No permitir que Escape cierre la NR completa (algunos modales lo escuchan en window).
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setAbierto(false); trigger.current?.focus(); }
          if (e.key === "ArrowDown") { e.preventDefault(); setIndice(i => Math.min(i + 1, visibles.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setIndice(i => Math.max(0, i - 1)); }
          if (e.key === "Enter") { e.preventDefault(); if (visibles.length) elegir(visibles[Math.max(0, indice)]?.codigo || visibles[0].codigo); }
        }}/></div>
      <div className="kp-selector-list" role="listbox" id={`${id}-lista`} aria-label={`Resultados de ${titulo.toLowerCase()}`}>
        {permitirQuitar && codigo && <button type="button" role="option" aria-selected={false} className="kp-selector-option kp-selector-option-clear" onClick={() => elegir("")}><X size={15}/> Quitar selección</button>}
        {visibles.map((opcion, i) => <button type="button" role="option" aria-selected={opcion.codigo === codigo} key={`${opcion.codigo}-${i}`}
          className={`kp-selector-option ${i === indice ? "kp-selector-option-active" : ""}`} onMouseEnter={() => setIndice(i)} onClick={() => elegir(opcion.codigo)}>
          <span className="kp-selector-option-info"><strong>{opcion.nombre}</strong>{opcion.nota && <small>{opcion.nota}</small>}</span>
          <span className="kp-selector-option-meta"><span>Cód. {opcion.codigo}</span>{opcion.codigo === codigo && <Check size={15}/>}</span>
        </button>)}
        {!visibles.length && <div className="kp-selector-empty">No encontramos coincidencias. Probá con otro nombre o código.</div>}
        {resultados.length > visibles.length && <div className="kp-selector-empty">Hay {resultados.length - visibles.length} opciones más. Escribí para filtrar.</div>}
      </div>
    </div>, document.body)}
  </div>;
}
