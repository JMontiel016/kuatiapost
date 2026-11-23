"use client";
import { useEffect, useState } from "react";
import BuscadorCatalogo from "./BuscadorCatalogo";

export type Ubicacion = {
  departamento: string; departamentoDesc: string;
  distrito: string; distritoDesc: string;
  ciudad: string; ciudadDesc: string;
};
type Geo = { codigo:number; nombre:string; departamentoId?:number; distritoId?:number; distritoNombre?:string };
const CACHE = new Map<string,Promise<Geo[]>>();
function cargar(nivel: string, id?: number):Promise<Geo[]> {
  const clave=`${nivel}:${id ?? ""}`;
  if (!CACHE.has(clave)) CACHE.set(clave, fetch(`/api/catalogo-geografia?nivel=${encodeURIComponent(nivel)}${id ? `&id=${id}` : ""}`)
    .then(async response => {
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.datos)) throw Error(body.error || "No se pudo consultar el catálogo.");
      return body.datos as Geo[];
    }).catch(error => {CACHE.delete(clave);throw error;}));
  return CACHE.get(clave)!;
}
const codigoIgual=(a:string,b:number)=> /^\d+$/.test(a.trim()) && Number(a)===b;
const descripcion=(s:string,max:number)=>s.slice(0,max);

function Buscador({titulo,lista,codigo,deshabilitado,cargando,error,seleccionar,opcional=false}: {
  titulo:string;lista:Geo[];codigo:string;deshabilitado?:boolean;cargando?:boolean;error?:string;
  seleccionar:(item:Geo|null)=>void;opcional?:boolean;
}) {
  return <BuscadorCatalogo
    titulo={titulo} codigo={codigo} deshabilitado={deshabilitado}
    cargando={cargando} error={error} permitirQuitar
    placeholder={deshabilitado ? "Elegí el departamento primero" : `Seleccionar ${titulo.toLowerCase()}`}
    opciones={lista.map(x=>({codigo:String(x.codigo),nombre:x.nombre,nota:titulo === "Ciudad" ? x.distritoNombre : undefined}))}
    seleccionar={codigo=>seleccionar(lista.find(x=>String(x.codigo)===codigo)||null)} />;
}

/** Autocompletado jerárquico de los campos SIFEN, para todos los tipos documentales.
 * Departamento filtra los distritos; distrito filtra las ciudades; si se busca
 * una ciudad sin distrito, el distrito de esa ciudad se completa automáticamente.
 */
export default function SelectorGeografia({titulo,valor,alCambiar}: {
  titulo:string;valor:Ubicacion;alCambiar:(cambios:Partial<Ubicacion>)=>void;
}) {
  const [departamentos,setDepartamentos]=useState<Geo[]>([]);
  const [distritos,setDistritos]=useState<Geo[]>([]);
  const [ciudades,setCiudades]=useState<Geo[]>([]);
  const [loading,setLoading]=useState({departamento:true,distrito:false,ciudad:false});
  const [errores,setErrores]=useState({departamento:"",distrito:"",ciudad:""});
  const dep=departamentos.find(x=>codigoIgual(valor.departamento,x.codigo));
  const distrito=distritos.find(x=>codigoIgual(valor.distrito,x.codigo));
  useEffect(()=>{let vivo=true;setLoading(l=>({...l,departamento:true}));
    void cargar("departamentos").then(xs=>{if(vivo)setDepartamentos(xs);}).catch((e:Error)=>{if(vivo)setErrores(x=>({...x,departamento:e.message}));})
      .finally(()=>{if(vivo)setLoading(l=>({...l,departamento:false}));});
    return()=>{vivo=false;};
  },[]);
  useEffect(()=>{let vivo=true;setDistritos([]);setCiudades([]);setErrores(e=>({...e,distrito:"",ciudad:""}));
    if(!dep){setLoading(l=>({...l,distrito:false,ciudad:false}));return;}
    setLoading(l=>({...l,distrito:true}));
    void cargar("distritos",dep.codigo).then(xs=>{if(vivo)setDistritos(xs);}).catch((e:Error)=>{if(vivo)setErrores(x=>({...x,distrito:e.message}));})
      .finally(()=>{if(vivo)setLoading(l=>({...l,distrito:false}));});
    return()=>{vivo=false;};
  },[dep?.codigo]);
  useEffect(()=>{let vivo=true;setCiudades([]);setErrores(e=>({...e,ciudad:""}));
    if(!dep || (valor.distrito&&!distrito)){setLoading(l=>({...l,ciudad:false}));return;}
    setLoading(l=>({...l,ciudad:true}));
    const nivel=distrito?"ciudades":"ciudades-departamento";
    void cargar(nivel,distrito?.codigo||dep.codigo).then(xs=>{if(vivo)setCiudades(xs);}).catch((e:Error)=>{if(vivo)setErrores(x=>({...x,ciudad:e.message}));})
      .finally(()=>{if(vivo)setLoading(l=>({...l,ciudad:false}));});
    return()=>{vivo=false;};
  },[dep?.codigo,distrito?.codigo,valor.distrito]);
  return <div className="geo-ubicacion" role="group" aria-label={titulo}>
    <div className="geo-campos">
      <Buscador titulo="Departamento" codigo={valor.departamento} lista={departamentos} cargando={loading.departamento} error={errores.departamento}
        seleccionar={item=>alCambiar({departamento:item?String(item.codigo):"",departamentoDesc:item?descripcion(item.nombre,16):"",distrito:"",distritoDesc:"",ciudad:"",ciudadDesc:""})}/>
      <Buscador titulo="Distrito" codigo={valor.distrito} lista={distritos} cargando={loading.distrito} error={errores.distrito} deshabilitado={!dep}
        opcional seleccionar={item=>alCambiar({distrito:item?String(item.codigo):"",distritoDesc:item?descripcion(item.nombre,30):"",ciudad:"",ciudadDesc:""})}/>
      <Buscador titulo="Ciudad" codigo={valor.ciudad} lista={ciudades} cargando={loading.ciudad} error={errores.ciudad} deshabilitado={!dep||loading.distrito||!!(valor.distrito&&!distrito)}
        seleccionar={item=>{
          if(!item){alCambiar({ciudad:"",ciudadDesc:""});return;}
          const distritoDeCiudad=distritos.find(x=>x.codigo===item.distritoId);
          alCambiar({ciudad:String(item.codigo),ciudadDesc:descripcion(item.nombre,30),
            ...(distritoDeCiudad ? {distrito:String(distritoDeCiudad.codigo),distritoDesc:descripcion(distritoDeCiudad.nombre,30)} : {})});
        }}/>
    </div>
  </div>;
}
