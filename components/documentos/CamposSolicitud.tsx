"use client";
import { informacionCampo } from "../../lib/documentos/campos-documentos";

/** Refleja el JSON personalizado completo, sin renombrar claves ni agregar una
 * plantilla ajena. Cada cambio conserva arrays, objetos y tipos primitivos. */
export default function CamposSolicitud({ datos, alCambiar }: { datos: any; alCambiar: (datos: any) => void }) {
  const tipo = String(datos.iTiDE || "");
  function actualizar(ruta: (string | number)[], valor: any) {
    const copia = structuredClone(datos);
    let padre = copia;
    for (const clave of ruta.slice(0, -1)) padre = padre[clave];
    padre[ruta[ruta.length - 1]] = valor;
    alCambiar(copia);
  }
  function mostrar(valor: any, ruta: (string | number)[], codigo: string, fila: any, grupo: string): React.ReactNode {
    const id = ruta.join(".");
    if (Array.isArray(valor)) return <section className="grupo-documento" key={id}><h4>{codigo} · {valor.length} ítems</h4>{valor.map((item,i)=><div className="fila-documento" key={`${id}.${i}`}><h4>Ítem {i+1}</h4>{mostrar(item,[...ruta,i],codigo,item,codigo)}<button className="text-button danger" onClick={()=>actualizar(ruta,valor.filter((_,n)=>n!==i))}>Eliminar ítem</button></div>)}<button className="outline" onClick={()=>actualizar(ruta,[...valor,valor.length ? vaciar(valor[0]) : {}])}>Añadir ítem</button></section>;
    if (valor !== null && typeof valor === "object") return <div className="rejilla-campos" key={id}>{Object.entries(valor).map(([k,v])=>mostrar(v,[...ruta,k],k,valor,grupo))}</div>;
    const info = informacionCampo(codigo,datos,tipo,fila,grupo === "gCamItem" ? "Detalles" : grupo);
    const opciones = info.opciones;
    const cambio = (texto: string) => actualizar(ruta,typeof valor === "number" && texto !== "" && Number.isFinite(Number(texto)) ? Number(texto) : texto);
    return <label className="campo-documento" key={id}><span>({codigo}) {info.nombre === "Campo de tu integración" ? codigo : info.nombre}{info.estado === "obligatorio" && <span className="asterisco"> *</span>}</span>{typeof valor === "boolean" ? <select value={String(valor)} onChange={e=>actualizar(ruta,e.target.value==='true')}><option value="true">Verdadero</option><option value="false">Falso</option></select> : opciones ? <select value={String(valor ?? "")} onChange={e=>cambio(e.target.value)}><option value="">Seleccioná una opción</option>{!opciones.some(([k])=>k===String(valor)) && valor !== null && String(valor)!=="" && <option value={String(valor)}>{String(valor)} · valor del JSON</option>}{opciones.map(([k,n])=><option key={k} value={k}>{k} · {n}</option>)}</select> : <input value={String(valor ?? "")} onChange={e=>cambio(e.target.value)} />}<small>{id}{valor===null ? " · null: escribir reemplaza este valor" : ""}</small></label>;
  }
  // Las nuevas filas conservan sus claves y dejan sus valores vacíos.
  function vaciar(valor: any): any { return Array.isArray(valor) ? [] : valor && typeof valor === "object" ? Object.fromEntries(Object.entries(valor).map(([k,v])=>[k,vaciar(v)])) : ""; }
  return <div className="campos-solicitud">{Object.entries(datos).map(([k,v])=>mostrar(v,[k],k,datos,""))}</div>;
}
