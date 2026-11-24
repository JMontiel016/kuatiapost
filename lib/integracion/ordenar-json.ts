import { applyEdits, format } from "jsonc-parser";
import { quitarComentariosJSON, revisarTextoJSON } from "./solicitudes-integracion";
import { errorFormato, formatoCampo } from "../documentos/formatos-campos";
import catalogo from "../../documentacion/CATALOGO_NOMBRES_MANUAL.json";
import { informacionCampo, validarDocumento, validarEstructuraDocumento } from "../documentos/campos-documentos";

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
export function prepararJSONPegado(texto: string, tipoSeleccionado?: string) {
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
  const revisionTexto = revisarTextoJSON(registro ? principal : texto);
  const errores = [...revisionTexto.errores];
  const avisos: string[] = [];
  const tipoDeclarado = String(valor?.iTiDE ?? "").trim();
  const tipo = tipoDeclarado || tipoSeleccionado || "";
  const aplicanReglas = ["1", "4", "5", "6", "7"].includes(tipo);
  const camposDeIntegracion = new Set(["Detalles", "Pagos", "FormaPago", "Subtotales", "DocumentosAsociados", "Cuotas", "Transporte", "Salida", "Entrega", "tipOpe", "tipoDoc", "ruc", "password"]);
  const resumen = { campos: 0, filas: 0, fueraDeCatalogo: 0 };
  function revisar(v: unknown, camino: (string | number)[] = [], ruta = "") {
    if (Array.isArray(v)) {
      resumen.filas += v.length;
      v.forEach((fila, i) => revisar(fila, [...camino, i], `${ruta}[${i}]`));
      return;
    }
    if (!v || typeof v !== "object") return;
    for (const [clave, dato] of Object.entries(v)) {
      const ubicacion = ruta ? `${ruta}.${clave}` : clave;
      const pasos = [...camino, clave];
      const formato = formatoCampo(clave);
      resumen.campos++;
      if (!formato && !Object.hasOwn(catalogo, clave) && !camposDeIntegracion.has(clave) &&
        informacionCampo(clave, valor, tipo).estado === "integracion") {
        resumen.fueraDeCatalogo++;
        avisos.push(`${ubicacion}: campo no reconocido en el catálogo disponible; confirmá si tu API lo admite. Se conserva.`);
      }
      if (clave === "FormaPago") avisos.push(`${ubicacion}: alias reconocido durante la revisión. Se conserva el nombre que usa tu integración.`);
      // Las rutas de la plantilla se verifican en validarDocumento.
      const rutaDePlantilla = pasos.length === 1 || (pasos.length === 3 && typeof pasos[1] === "number");
      if (formato && (!aplicanReglas || !rutaDePlantilla)) {
        const literal = typeof dato === "number" && revisionTexto.numeros.get(JSON.stringify(pasos));
        const error = errorFormato(clave, literal && !/[eE]/.test(literal) ? literal : dato);
        if (error) errores.push(`(${clave}) [${ubicacion}]: ${error}`);
      }
      revisar(dato, pasos, ubicacion);
    }
  }
  revisar(valor);
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    if (aplicanReglas)
      errores.push(...validarDocumento(valor, tipo, revisionTexto.numeros));
    else {
      errores.push(...validarEstructuraDocumento(valor));
      const mensaje = "Para aplicar las reglas de un documento de emisión, indicá iTiDE: 1, 4, 5, 6 o 7.";
      if (String(valor.tipOpe) === "1") errores.push(mensaje);
      else avisos.push(mensaje);
    }
    if (tipoDeclarado && tipoSeleccionado && tipoDeclarado !== tipoSeleccionado)
      avisos.push(`El JSON declara iTiDE=${tipoDeclarado}. El editor está configurado para iTiDE=${tipoSeleccionado}.`);
    if (valor.gCamItem && !valor.Detalles)
      avisos.push("(gCamItem) La plantilla de envío usa Detalles para los productos. Confirmá la clave que espera tu integración.");
  } else {
    errores.push("La solicitud debe ser un objeto JSON.");
  }
  if (registro) {
    avisos.unshift("Se detectó un registro adjunto y se analizó por separado.");
    const inicio = registro.indexOf("{");
    if (inicio >= 0) {
      try {
        const respuesta = JSON.parse(registro.slice(inicio, finBloque(registro, inicio)));
        const error = respuesta.original?.message ?? respuesta.message;
        if (typeof error === "string") avisos.push(`Respuesta de la API: ${error}`);
        else if (error && typeof error === "object") Object.entries(error).forEach(([campo, detalle]) => avisos.push(`Respuesta de la API · ${campo}: ${typeof detalle === "string" ? detalle : JSON.stringify(detalle)}`));
      } catch { avisos.push("El registro adjunto contiene una respuesta que no se pudo interpretar. Podés verla debajo."); }
    }
  }
  return {
    json: ordenarJSON(principal),
    tipo,
    aplicanReglas,
    errores: [...new Set(errores)],
    avisos: [...new Set(avisos)],
    mensajes: [...new Set([...errores, ...avisos])],
    resumen,
    registro,
  };
}
