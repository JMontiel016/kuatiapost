import catalogo from "../../documentacion/CATALOGO_NOMBRES_MANUAL.json";
import { informacionCampo, validarDocumento } from "../documentos/campos-documentos";

/** Solo modifica espacios fuera de las cadenas. Conserva literalmente números,
 * textos, claves e ítems, incluso enteros mayores que la precisión de JavaScript. */
export function ordenarJSON(texto: string): string {
  JSON.parse(texto); // Comprobar sintaxis sin usar sus valores para reconstruirla.
  const tokens = texto.match(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/g) || [];
  let nivel = 0, salida = "";
  const salto = () => "\n" + "  ".repeat(nivel);
  tokens.forEach((token,i) => {
    if (token === "{" || token === "[") {
      salida += token;
      nivel++;
      if (tokens[i+1] !== "}" && tokens[i+1] !== "]") salida += salto();
    } else if (token === "}" || token === "]") {
      nivel--;
      if (tokens[i-1] !== "{" && tokens[i-1] !== "[") salida += salto();
      salida += token;
    } else if (token === ",") salida += "," + salto();
    else if (token === ":") salida += ": ";
    else salida += token;
  });
  return salida;
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
export function prepararJSONPegado(texto: string): { json: string; mensajes: string[]; registro: string } {
  const limpio = texto.trim();
  let principal = limpio, registro = "";
  try { JSON.parse(limpio); }
  catch {
    if (!/^[{[]/.test(limpio)) throw new Error("Pegá primero el JSON de la solicitud; el registro de error puede ir después.");
    const fin = finBloque(limpio, 0);
    principal = limpio.slice(0, fin);
    JSON.parse(principal);
    registro = limpio.slice(fin).trim();
    if (!/^\[\s*\d{4}-\d{2}-\d{2}[^\]]*\]\s+[^\n]*?(?:DEBUG|ERROR|INFO|WARNING|WARN):/.test(registro))
      throw new Error("Hay texto adicional que no se reconoce como registro. Separalo antes de ordenar.");
  }
  const valor = JSON.parse(principal);
  const mensajes: string[] = [];
  // Los campos personalizados se conservan: no reconocido no significa inválido.
  const grupos = new Set(["Detalles", "Pagos", "Subtotales", "DocumentosAsociados", "Cuotas", "tipOpe", "tipoDoc", "ruc", "password"]);
  function revisar(v: any, ruta = "") {
    if (Array.isArray(v)) return v.forEach((fila, i) => revisar(fila, `${ruta}[${i + 1}]`));
    if (!v || typeof v !== "object") return;
    Object.entries(v).forEach(([clave, dato]) => {
      const ubicacion = ruta ? `${ruta}.${clave}` : clave;
      if (!Object.hasOwn(catalogo, clave) && !grupos.has(clave) && informacionCampo(clave, valor, String(valor?.iTiDE || "")).estado === "integracion")
        mensajes.push(`${ubicacion}: campo no reconocido en el catálogo disponible; confirmá si tu API lo admite. Se conserva.`);
      if (clave === "FormaPago") mensajes.push(`${ubicacion}: tu integración puede esperar Pagos. Confirmá su contrato antes de renombrar.`);
      if (typeof dato === "string" && dato.includes("\uFFFD")) mensajes.push(`${ubicacion}: contiene caracteres dañados (�). Revisá el texto de origen.`);
      revisar(dato, ubicacion);
    });
  }
  revisar(valor);
  if (valor && !Array.isArray(valor) && ["1","4","5","6","7"].includes(String(valor.iTiDE))) {
    // La estructura debe ser segura antes de ejecutar las reglas de los campos.
    const mal = ["Detalles","Pagos","Subtotales","DocumentosAsociados"].filter(g => valor[g] != null && (!Array.isArray(valor[g]) || valor[g].some((fila: any) => !fila || typeof fila !== "object" || Array.isArray(fila))));
    if (mal.length) mal.forEach(g => mensajes.push(`${g}: debe contener una lista de objetos.`));
    else mensajes.push(...validarDocumento(valor, String(valor.iTiDE)));
  }
  if (registro) {
    mensajes.unshift("Se separó el registro adjunto: solo el JSON de la solicitud queda en el editor.");
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
