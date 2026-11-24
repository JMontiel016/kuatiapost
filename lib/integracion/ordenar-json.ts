import { applyEdits, format } from "jsonc-parser";
import { quitarComentariosJSON, revisarTextoJSON } from "./solicitudes-integracion";
import catalogo from "../../documentacion/CATALOGO_NOMBRES_MANUAL.json";
import { informacionCampo, validarDocumento } from "../documentos/campos-documentos";

/** Solo modifica espacios fuera de las cadenas. Conserva literalmente números,
 * textos, claves e ítems, incluso enteros mayores que la precisión de JavaScript. */
export function ordenarJSON(texto: string): string {
  JSON.parse(quitarComentariosJSON(texto));
  return applyEdits(texto, format(texto, undefined, {
    tabSize: 4,
    insertSpaces: true,
    eol: texto.includes("\r\n") ? "\r\n" : "\n",
  })).trim();
}

/** Lee bloques completos respetando comillas y escapes. Nunca busca un objeto
 * interior para disimular una solicitud incompleta o con sintaxis incorrecta. */
function finBloque(texto: string, inicio: number): number {
  const pila: string[] = [];
  let cadena = false, escape = false;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (cadena) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') cadena = false;
      continue;
    }
    if (c === '"') cadena = true;
    else if (c === "{" || c === "[") pila.push(c);
    else if (c === "}" || c === "]") {
      if (pila.pop() !== (c === "}" ? "{" : "[")) throw new Error("Corregí los corchetes o las llaves del JSON.");
      if (!pila.length) return i + 1;
    }
  }
  throw new Error("El JSON está incompleto: faltan comillas, llaves o corchetes de cierre.");
}

/** Conserva el bloque original para que formatear no redondee importes.
 * Los registros adjuntos solo se separan si comienzan con una fecha de log. */
export function prepararJSONPegado(texto: string, tipoSeleccionado?: string): { json: string; mensajes: string[]; registro: string } {
  const limpio = texto.trim();
  let principal = limpio, registro = "";
  try { JSON.parse(quitarComentariosJSON(limpio)); }
  catch {
    if (!/^[{[]/.test(limpio)) throw new Error("Pegá primero el JSON de la solicitud; el registro de error puede ir después.");
    const fin = finBloque(quitarComentariosJSON(limpio), 0);
    principal = limpio.slice(0, fin);
    JSON.parse(quitarComentariosJSON(principal));
    registro = limpio.slice(fin).trim();
    if (!/^\[\s*\d{4}-\d{2}-\d{2}[^\]]*\]\s+[^\n]*?(?:DEBUG|ERROR|INFO|WARNING|WARN):/.test(registro))
      throw new Error("Hay texto adicional que no se reconoce como registro. Separalo antes de ordenar.");
  }
  const valor = JSON.parse(quitarComentariosJSON(principal));
  const revisionTexto = revisarTextoJSON(principal);
  const mensajes = [...revisionTexto.errores];
  const tipo = tipoSeleccionado || String(valor?.iTiDE || "");
  // Los campos personalizados se conservan: no reconocido no significa inválido.
  const grupos = new Set(["Detalles", "Pagos", "FormaPago", "Subtotales", "DocumentosAsociados", "Cuotas", "tipOpe", "tipoDoc", "ruc", "password"]);
  function revisar(v: any, ruta = "") {
    if (Array.isArray(v)) return v.forEach((fila, i) => revisar(fila, `${ruta}[${i + 1}]`));
    if (!v || typeof v !== "object") return;
    Object.entries(v).forEach(([clave, dato]) => {
      const ubicacion = ruta ? `${ruta}.${clave}` : clave;
      if (!Object.hasOwn(catalogo, clave) && !grupos.has(clave) && informacionCampo(clave, valor, tipo).estado === "integracion")
        mensajes.push(`${ubicacion}: campo no reconocido en el catálogo disponible; confirmá si tu API lo admite. Se conserva.`);
      if (clave === "FormaPago") mensajes.push(`${ubicacion}: tu integración puede esperar Pagos. Confirmá su contrato antes de renombrar.`);
      revisar(dato, ubicacion);
    });
  }
  revisar(valor);
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    if (["1", "4", "5", "6", "7"].includes(tipo))
      mensajes.push(...validarDocumento(valor, tipo, revisionTexto.numeros));
    else
      mensajes.push("Para aplicar las reglas de un documento de emisión, indicá iTiDE: 1, 4, 5, 6 o 7.");
  } else {
    mensajes.push("La solicitud debe ser un objeto JSON.");
  }
  if (registro) {
    mensajes.unshift("Se detectó un registro adjunto y se analizó por separado.");
    const inicio = registro.indexOf("{");
    if (inicio >= 0) {
      try {
        const respuesta = JSON.parse(registro.slice(inicio, finBloque(registro, inicio)));
        const error = respuesta.original?.message ?? respuesta.message;
        if (typeof error === "string") mensajes.push(`Respuesta de la API: ${error}`);
        else if (error && typeof error === "object") Object.entries(error).forEach(([campo, detalle]) => mensajes.push(`Respuesta de la API · ${campo}: ${typeof detalle === "string" ? detalle : JSON.stringify(detalle)}`));
      } catch { mensajes.push("El registro adjunto contiene una respuesta que no se pudo interpretar. Podés verla debajo."); }
    }
  }
  return { json: ordenarJSON(principal), mensajes: [...new Set(mensajes)], registro };
}
