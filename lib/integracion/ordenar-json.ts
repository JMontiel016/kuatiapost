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
