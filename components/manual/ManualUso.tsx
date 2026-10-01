"use client";
import { useState } from "react";

/** Guía propia del programa. Incluye capturas de las funciones proporcionadas por el usuario;
 * nunca incorpora credenciales, respuestas ni datos reales del usuario. */
// Una misma fuente alimenta la guía web y la versión PDF para evitar diferencias.
import contenido from "./contenido-manual.json";
export const pantallas = contenido;

/** Descarga el PDF revisado sin exponer los datos de la sesión. */
async function descargarManual() {
  const respuesta = await fetch("/manual/KuatiaPost-Manual-de-Uso.pdf");
  if (!respuesta.ok) throw Error("No se pudo cargar el PDF del manual.");
  const url = URL.createObjectURL(await respuesta.blob());
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "KuatiaPost-Manual-de-Uso.pdf";
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ManualUso() {
  const [activo,setActivo]=useState(0), [zona,setZona]=useState(0), [error,setError]=useState("");
  const pantalla=pantallas[activo];
  return <section className="panel manual-uso">
    <header className="manual-cabecera">
      <div><span className="manual-etiqueta">GUÍA DE KUATIAPOST</span><h1>Manual de uso</h1><p>Elegí una sección para ver sus pasos, resultados y avisos.</p></div>
      <button className="primary" onClick={()=>descargarManual().catch(()=>setError("No se pudo descargar el PDF. Volvé a intentar."))}>Descargar PDF</button>
    </header>
    {error && <p role="alert">{error}</p>}
    <div className="manual-distribucion">
      <nav className="manual-indice" aria-label="Contenido del manual">{pantallas.map((p,i)=><button aria-current={activo===i ? "step" : undefined} className={activo===i ? "actual" : ""} key={p.id} onClick={()=>{setActivo(i);setZona(0);}}><span>{i+1}</span><strong>{p.titulo}</strong></button>)}</nav>
      <article className="manual-tarea">
        <div className="manual-titulo"><span>SECCIÓN {activo+1} DE {pantallas.length}</span><h2>{pantalla.titulo}</h2><p>Seleccioná un número sobre la captura para ver su función.</p></div>
        <figure className="manual-vista"><img src={`/manual/${pantalla.imagen}`} alt={`Captura de ${pantalla.titulo} en KuatiaPost`}/>{pantalla.zonas.map((z,i)=><button key={i} className={`manual-marca ${zona===i ? "seleccionada" : ""}`} style={{left:`${z.x}%`,top:`${z.y}%`,width:`${z.w}%`,height:`${z.h}%`}} onClick={()=>setZona(i)} aria-label={`Zona ${i+1}: ${z.t}`} aria-pressed={zona===i}><span>{i+1}</span></button>)}</figure>
        <div className="manual-leyenda" aria-live="polite"><span>{zona+1}</span><strong>{pantalla.zonas[zona].t}</strong></div>
        <a className="outline manual-ampliar" href={`/manual/${pantalla.imagen}`} target="_blank" rel="noopener noreferrer">Ampliar captura</a>
        {pantalla.imagenesAdicionales.map(vista => <figure className="manual-captura-extra" key={vista.imagen}><figcaption>{vista.titulo}</figcaption><a href={`/manual/${vista.imagen}`} target="_blank" rel="noopener noreferrer"><img src={`/manual/${vista.imagen}`} alt={vista.titulo}/></a><p>Seleccioná la imagen para ampliarla.</p></figure>)}
        <p className="manual-objetivo">{pantalla.objetivo}</p><h3>Cómo usar esta función</h3>
        <ol className="manual-instrucciones">{pantalla.pasos.map((t,i)=><li key={i}><span>{i+1}</span><p>{t}</p></li>)}</ol>
        <section className="manual-catalogo"><h3>Para qué sirve cada botón y control</h3>
          {pantalla.controles.map(control => <article className="manual-control" key={control.nombre}><h4>{control.nombre}</h4><dl><dt>Para qué sirve</dt><dd>{control.funcion}</dd><dt>Cuándo y cómo usarlo</dt><dd>{control.uso}</dd><dt>Qué resultado produce</dt><dd>{control.resultado}</dd><dt>Qué tener en cuenta</dt><dd>{control.detalle}</dd></dl></article>)}
        </section>
        <section className="manual-detalle"><h3>Qué resultado esperar</h3><p>{pantalla.resultado}</p></section>
        <section className="manual-detalle"><h3>Qué revisar si hay un problema</h3><ul>{pantalla.avisos.map((aviso,i)=><li key={i}>{aviso}</li>)}</ul></section>
      </article>
    </div>
  </section>;
}
