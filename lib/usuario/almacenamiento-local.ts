/** Copia individual por origen y perfil del navegador, sin cuenta ni servidor.
 * No garantiza privacidad entre personas que comparten el mismo perfil.
 */
const CLAVE = "kuatiapost.espacio.v1";
const MAXIMO = 1_200_000;
export type EspacioPersistente = {
  view?: string; type?: string; mode?: string; editorTab?: string; body?: string;
  method?: string; url?: string; authUrl?: string; consultaUrl?: string; kudeUrl?: string;
  compartirKude?: boolean; ruc?: string; datosConsulta?: Record<string, string>;
  jsonConsulta?: string; jsonKude?: string; xml?: string; xmlOpts?: Record<string, unknown>;
  oscuro?: boolean; borradores?: Record<string,string>;
};
export function leerEspacio(): EspacioPersistente | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const dato = JSON.parse(texto);
    return dato && typeof dato === "object" && !Array.isArray(dato) ? dato as EspacioPersistente : null;
  } catch { return null; }
}
/** Guarda exclusivamente campos no secretos. Nunca token, password ni authJson. */
export function guardarEspacio(espacio: EspacioPersistente): boolean {
  try {
    const texto = JSON.stringify(espacio);
    if (texto.length > MAXIMO) return false;
    localStorage.setItem(CLAVE, texto);
    return true;
  } catch { return false; }
}
