"use client";
import { Save, Plus, Trash2, PlugZap } from "lucide-react";
export type ConexionGuardada = {
  id: string; name: string; url:string; consultaUrl:string;
  kudeUrl:string; authUrl:string; compartirKude:boolean;
};
/** Solo conserva el perfil y las URLs: nunca token ni contraseña del servicio. */
export default function ConexionesGuardadas({
  conexiones, nombre, setNombre, activa, alGuardar, alUsar, alNueva, alEliminar,
}: {
  conexiones: ConexionGuardada[]; nombre:string; setNombre:(s:string)=>void;
  activa:string; alGuardar:()=>void; alUsar:(c:ConexionGuardada)=>void;
  alNueva:()=>void; alEliminar:(id:string)=>void;
}) {
  return <section className="panel settings-panel" style={{marginBottom:18}}>
    <h3><PlugZap size={19}/> Conexiones guardadas</h3>
    <p>Guardá varias APIs con nombres diferentes y elegí cuál usar. Cada cuenta ve únicamente sus propias conexiones.</p>
    <div className="two-fields">
      <label className="field"><span>Nombre de la conexión</span><input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej.: Producción · Futura100" maxLength={100}/></label>
      <div style={{display:"flex",gap:8,alignItems:"end",paddingBottom:4}}>
        <button className="primary" type="button" onClick={alGuardar}><Save size={16}/> Guardar conexión</button>
        <button className="outline" type="button" onClick={alNueva}><Plus size={16}/> Nueva</button>
      </div>
    </div>
    <div style={{display:"grid",gap:8,marginTop:16}}>
      {conexiones.length===0 ? <p className="tiny">Todavía no tenés conexiones guardadas.</p> : conexiones.map(c=><div key={c.id} style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--line, #3a4658)",padding:"8px 0"}}>
        <div style={{minWidth:0,overflowWrap:"anywhere"}}><strong>{c.name}</strong>{c.id===activa && <small style={{marginLeft:8}}>Activa</small>}<div className="tiny">{c.url || c.consultaUrl || c.authUrl || "Sin URL"}</div></div>
        <div style={{display:"flex",gap:5}}><button className="outline" type="button" onClick={()=>alUsar(c)}>Usar</button>
          <button className="outline" type="button" aria-label={`Eliminar ${c.name}`} onClick={()=>alEliminar(c.id)}><Trash2 size={15}/></button></div>
      </div>)}
    </div>
    <p className="tiny">Por seguridad, cada vez que abras una sesión o cambies de conexión deberás generar o ingresar nuevamente el token. La contraseña del servicio nunca se guarda.</p>
  </section>;
}
