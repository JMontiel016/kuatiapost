"use client";
import { useState } from "react";

/** Guía propia del programa. Solo usa vistas esquemáticas de las funciones incluidas;
 * nunca incorpora credenciales, respuestas ni datos reales del usuario. */
export const pantallas = [
  { id: "envio", titulo: "Envío de datos", imagen: "envio.svg", pasos: [
    "Elegí Factura, Nota de crédito, Nota de débito, Remisión o Autofactura. Cada plantilla ofrece sus propios campos.",
    "Completá establecimiento y punto de expedición con tres dígitos y la numeración con siete. Los ceros iniciales se conservan.",
    "Los campos con * son obligatorios para la selección actual. Otro abre una descripción para explicar el valor elegido.",
    "Seleccioná contribuyente o no contribuyente. La operación local utiliza Paraguay; servicios al exterior necesita otro país.",
    "En contado agregá pagos. Cheque abre número y banco; tarjeta abre marca y procesamiento. Agregá productos con Añadir producto.",
    "El JSON es editable: las propiedades adicionales se conservan. Revisá los campos antes de enviar; la aceptación procede del servicio configurado.",
  ], zonas: [{x:20,y:17,w:64,h:12,t:"Elegir operación"},{x:18,y:40,w:57,h:40,t:"Completar datos"}] },
  { id:"configuracion", titulo:"Configuración y token", imagen:"configuracion.svg", pasos:[
    "Indicá por separado las URL de token, envío, consulta y KUDE. Si consulta y KUDE usan la misma URL, activá la casilla correspondiente.",
    "Ingresá Usuario y Contraseña. El ojo permite ver la contraseña; el JSON permanece oculto hasta pulsar Ver y editar JSON.",
    "El JSON inicia con ruc y password. Podés modificarlo y añadir propiedades; Usuario y Contraseña se sincronizan cuando la sintaxis es válida.",
    "Generar token realiza la solicitud a tu servicio. El token obtenido se usa en envíos y consultas. Podés verlo, reemplazarlo o eliminarlo.",
    "Las credenciales permanecen en esta pestaña mientras trabajás. Recargar o cerrar inicia una sesión vacía. No existe conservación por 24 horas.",
  ], zonas:[{x:18,y:23,w:36,h:48,t:"Direcciones del servicio"},{x:58,y:24,w:37,h:60,t:"Credenciales y token"}] },
  { id:"consulta", titulo:"Consulta y KUDE", imagen:"consulta.svg", pasos:[
    "Elegí el tipo de operación y completá establecimiento, punto de expedición y numeración. Estos valores se reflejan inmediatamente en el JSON.",
    "Consultá el estado con la URL configurada y el token de esta sesión. Una respuesta HTTP correcta por sí sola no significa aprobación.",
    "Obtener KUDE espera un PDF codificado en base64. Cuando el servicio lo devuelve correctamente, podés visualizarlo y descargarlo.",
    "Podés editar por separado el JSON de consulta y el del KUDE. No se agrega ticket automáticamente.",
  ], zonas:[{x:18,y:25,w:76,h:27,t:"Numeración de la consulta"},{x:18,y:57,w:76,h:32,t:"Solicitud y respuesta"}] },
  { id:"archivos", titulo:"Importación, revisión y exportación", imagen:"archivos.svg", pasos:[
    "Importar archivo admite JSON, TXT con contenido JSON o XML, XML con un único DE y Excel .xlsx. No se admite el antiguo formato .xls.",
    "El XML DE se importa sin firmar ni emitir. Revisá los campos del servicio: el esquema XML y el contrato JSON de tu integración pueden diferir.",
    "Excel debe usar las hojas exportadas por KuatiaPost: Cabecera y grupos como Detalles o Pagos. Se conserva un respaldo JSON. No se ejecutan fórmulas.",
    "Revisar muestra todos los problemas detectados y permite minimizar la lista. Corregí el campo señalado; los errores de conexión son diferentes de los errores de datos.",
    "JSON y TXT conservan la solicitud. Excel exporta un único registro. XML exporta el formato de intercambio KuatiaPost: no es un XML fiscal firmado.",
    "La respuesta del servicio se puede minimizar y desplegar. Los avisos desaparecen después de unos segundos: verde indica una acción correcta, amarillo una revisión pendiente y rojo un fallo.",
  ], zonas:[{x:78,y:18,w:20,h:32,t:"Importar datos"},{x:19,y:72,w:54,h:20,t:"Revisar y exportar"}] },
  { id:"nota", titulo:"Crear NC desde XML", imagen:"nota.svg", pasos:[
    "Seleccioná Crear NC desde XML e importá el XML de la factura de origen. Se conserva el archivo para revisar la conversión.",
    "Completá el establecimiento, punto de expedición y numeración de la nueva nota; no se toman como valores predeterminados los de la factura original.",
    "Para una nota parcial seleccioná los códigos de producto y luego la cantidad o el monto. El sistema recalcula los totales a partir de los valores originales.",
    "Si el monto no puede representarse exactamente con la precisión admitida, se indica el problema para que ajustes el valor; no se inventa otra cantidad.",
    "Revisá el JSON generado y usalo en Envío de datos. Convertir no envía ni aprueba la operación.",
  ], zonas:[{x:18,y:22,w:76,h:27,t:"Factura de origen"},{x:18,y:54,w:76,h:33,t:"Datos de la nota y selección parcial"}] },
  { id:"asistente", titulo:"Asistente", imagen:"asistente.svg", pasos:[
    "Este apartado muestra Próximamente habilitado en KuatiaPost. No consulta proveedores ni consume cuotas.",
    "Las ayudas junto a cada campo explican las reglas implementadas de forma local. Podés abrirlas y cerrarlas sin salir del formulario.",
  ], zonas:[{x:18,y:22,w:76,h:29,t:"Estado del apartado"}] },
  { id:"oscuro", titulo:"Tema oscuro y sesión", imagen:"oscuro.svg", pasos:[
    "El botón de luna, arriba a la derecha, activa el tema oscuro. En ese tema, el botón de sol recupera el tema claro sin modificar los datos.",
    "Cambiar de apartado conserva los borradores. Recargar o cerrar borra datos, token y respuestas de la sesión. Cada pestaña tiene su propia memoria.",
    "Los archivos descargados quedan en tu equipo hasta que los elimines. El servicio externo al que enviás puede conservar solicitudes según su propio funcionamiento.",
    "El Asistente permanece anunciado como Próximamente habilitado en KuatiaPost; no realiza consultas a proveedores.",
  ], zonas:[{x:79,y:1,w:20,h:8,t:"Cambiar tema"},{x:1,y:20,w:14,h:64,t:"Navegación y manual"}] },
];

/** Descarga una guía HTML autónoma con imágenes incrustadas, utilizable sin sesión.
 * El navegador también permite imprimirla o guardarla como PDF. */
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
    <div className="page-heading"><div><h1>Manual de uso</h1><p>Conocé las funciones de KuatiaPost paso a paso.</p></div><button className="primary" onClick={()=>descargarManual().catch(()=>setError("No se pudo descargar la guía. Volvé a intentar."))}>Descargar PDF</button></div>
    {error && <p role="alert">{error}</p>}
    <nav className="manual-pestanas" aria-label="Pantallas del manual">{pantallas.map((p,i)=><button className={activo===i?"primary":"outline"} key={p.id} onClick={()=>{setActivo(i);setZona(0);}}>{i+1}. {p.titulo}</button>)}</nav>
    <h2>{pantalla.titulo}</h2><p>Vista esquemática: pulsá los recuadros numerados para identificar cada zona de la pantalla.</p>
    <figure className="manual-imagen"><img src={`/manual/${pantalla.imagen}`} alt={`Pantalla de KuatiaPost: ${pantalla.titulo}`}/>{pantalla.zonas.map((z,i)=><button key={i} className={`manual-zona ${zona===i?"seleccionada":""}`} style={{left:`${z.x}%`,top:`${z.y}%`,width:`${z.w}%`,height:`${z.h}%`}} onClick={()=>setZona(i)} aria-label={z.t}><span>{i+1} → {z.t}</span></button>)}</figure>
    <p className="manual-zona-descripcion">Zona {zona+1}: {pantalla.zonas[zona].t}</p>
    <ol>{pantalla.pasos.map((t,i)=><li key={i}>{t}</li>)}</ol>

  </section>;
}
