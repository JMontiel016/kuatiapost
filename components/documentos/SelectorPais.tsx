"use client";
import BuscadorCatalogo from "./BuscadorCatalogo";
import { paises } from "../../lib/documentos/catalogo-paises";

/** Buscador consistente por código ISO-3 o nombre del país. */
export default function SelectorPais({titulo,codigo,alCambiar,opcional=false}:{
  titulo:string;codigo:string;alCambiar:(codigo:string,nombre:string)=>void;opcional?:boolean;
}) {
  return <BuscadorCatalogo
    titulo={titulo} codigo={codigo} permitirQuitar
    placeholder={opcional ? "Seleccionar país (opcional)" : "Seleccionar país"}
    opciones={paises.map(p=>({codigo:p.codigo,nombre:p.nombre}))}
    seleccionar={valor=>{const pais=paises.find(p=>p.codigo===valor);alCambiar(pais?.codigo || "", pais?.nombre.slice(0,30) || "");}}
  />;
}
