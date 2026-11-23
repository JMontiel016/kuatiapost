import { paises } from "./catalogo-paises";
import catalogo from "./catalogo-geografico-ine-2025.json";

/** Reglas de correspondencia comprobables sin Internet: selecciona códigos de
 * departamento/distrito/ciudad presentes en el XLSX suministrado por el usuario.
 * No equivale a comprobar firma del XML ni aceptación de DNIT.
 */
const departamentos = new Map(catalogo.departamentos.map(([codigo,nombre]) => [Number(codigo),String(nombre)]));
const distritos = new Map(catalogo.distritos.map(([codigo,dep,nombre]) => [Number(codigo),{departamento:Number(dep),nombre:String(nombre)}]));
const ciudades = new Map(catalogo.ciudades.map(([codigo,dis,nombre]) => [Number(codigo),{distrito:Number(dis),nombre:String(nombre)}]));
const normal=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/[._-]/g," ").replace(/\s+/g," ");
const numero=(s:string)=>/^\d+$/.test(s)?Number(s):NaN;
const mismo=(a:string|undefined,b:string,max:number)=>!a||normal(a)===normal(b.slice(0,max));
export type CodigoLugar = {departamento?:string; distrito?:string; ciudad?:string; departamentoDesc?:string; distritoDesc?:string; ciudadDesc?:string};
export async function verificarUbicacion(lugar:CodigoLugar,etiqueta:string):Promise<void> {
  const dep=String(lugar.departamento||"").trim(), dis=String(lugar.distrito||"").trim(), ciu=String(lugar.ciudad||"").trim();
  const descs=[lugar.departamentoDesc,lugar.distritoDesc,lugar.ciudadDesc].some(x=>!!x?.trim());
  if(!dep&&!dis&&!ciu&&!descs)return;
  if(!dep || !ciu)throw Error(`${etiqueta}: completá departamento y ciudad; el distrito es opcional.`);
  if(!/^\d{1,2}$/.test(dep)|| (dis&&!/^\d{1,4}$/.test(dis))||!/^\d{1,5}$/.test(ciu))
    throw Error(`${etiqueta}: código geográfico inválido.`);
  const departamento=departamentos.get(numero(dep));
  if(!departamento)throw Error(`${etiqueta}: departamento ${dep} no está en el catálogo.`);
  const ciudad=ciudades.get(numero(ciu));
  if(!ciudad)throw Error(`${etiqueta}: ciudad ${ciu} no está en el catálogo.`);
  const distritoDeCiudad=distritos.get(ciudad.distrito);
  if(!distritoDeCiudad||distritoDeCiudad.departamento!==numero(dep))
    throw Error(`${etiqueta}: la ciudad ${ciu} no corresponde al departamento ${departamento}.`);
  let distrito: {departamento:number;nombre:string}|undefined;
  if(dis){
    distrito=distritos.get(numero(dis));
    if(!distrito||distrito.departamento!==numero(dep))throw Error(`${etiqueta}: distrito ${dis} no corresponde al departamento ${departamento}.`);
    if(numero(dis)!==ciudad.distrito)throw Error(`${etiqueta}: ciudad ${ciu} no corresponde al distrito ${distrito.nombre}.`);
  }
  if(!mismo(lugar.departamentoDesc,departamento,16) || !mismo(lugar.distritoDesc,distrito?.nombre||"",30)||!mismo(lugar.ciudadDesc,ciudad.nombre,30))
    throw Error(`${etiqueta}: nombre y código geográficos no coinciden con el catálogo. Volvé a elegirlos.`);
}
export function verificarPais(codigo:string|undefined,etiqueta:string):void {
  if(codigo&&!paises.some(p=>p.codigo===codigo))throw Error(`${etiqueta}: el país ${codigo} no está en el catálogo ISO-3.`);
}
export async function verificarGeografiaDocumento(doc:Record<string,any>):Promise<void> {
  verificarPais(String(doc.cPaisRec||""),"País del cliente / receptor");
  const grupos=[{etiqueta:"Cliente / receptor",filas:[doc],sufijo:"Rec"},
    {etiqueta:"Vendedor",filas:[doc],sufijo:"Ven"},
    {etiqueta:"Lugar de la operación",filas:[doc],sufijo:"Prov"},
    {etiqueta:"Salida",filas:Array.isArray(doc.Salida)?doc.Salida:[],sufijo:"Sal"},
    {etiqueta:"Entrega",filas:Array.isArray(doc.Entrega)?doc.Entrega:[],sufijo:"Ent"}];
  for(const {etiqueta,filas,sufijo} of grupos)for(const [i,f] of filas.entries())if(f&&typeof f==="object") {
    await verificarUbicacion({
      departamento:String(f[`cDep${sufijo}`]||""),distrito:String(f[`cDis${sufijo}`]||""),ciudad:String(f[`cCiu${sufijo}`]||""),
      departamentoDesc:String(f[`dDesDep${sufijo}`]||""),distritoDesc:String(f[`dDesDis${sufijo}`]||""),ciudadDesc:String(f[`dDesCiu${sufijo}`]||"")
    },`${etiqueta}${filas.length>1?` #${i+1}`:""}`);
  }
  if(Array.isArray(doc.Transporte))for(const [i,t] of doc.Transporte.entries())if(t&&typeof t==="object") {
    verificarPais(String(t.cPaisDest||""),`País de destino · transporte ${i+1}`);
    verificarPais(String(t.cNacTrans||""),`Nacionalidad del transportista ${i+1}`);
  }
}
