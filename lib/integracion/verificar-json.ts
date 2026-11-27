import { revisarDescripciones, validarDocumento, validarEstructuraDocumento } from "../documentos/campos-documentos";
import { tiposDocumento } from "../documentos/plantillas-documentos";
import { parseObject, revisarTextoJSON } from "./solicitudes-integracion";

export function verificarJson(texto: string, tipoSeleccionado?: string) {
  try {
    const documento = parseObject(texto);
    const { errores, numeros } = revisarTextoJSON(texto);
    const codigo = documento.iTiDE;
    const tieneCodigo = codigo != null && (typeof codigo !== "string" || !!codigo.trim());
    const declarado = typeof codigo === "string" || typeof codigo === "number"
      ? tiposDocumento.find(tipo => tipo.id === String(codigo))
      : undefined;
    const tipo = declarado ?? (!tieneCodigo ? tiposDocumento.find(tipo => tipo.id === tipoSeleccionado) : undefined);
    if (!tipo && tieneCodigo)
      errores.push("(iTiDE) Informá un código de documento válido: 1, 4, 5, 6 o 7.");

    const problemas = tipo
      ? validarDocumento(documento, tipo.id, numeros, false)
      : validarEstructuraDocumento(documento);
    const sugerencias = tipo ? revisarDescripciones(documento, tipo.id).sugerencias
      .filter(({ reemplaza }) => reemplaza)
      .map(({ grupo, indice, campo, valor }) =>
        `(${grupo ? `${grupo}[${indice}].` : ""}${campo}) Usá «${valor}».`)
      : [];
    return { tipo, errores: [...new Set([...errores, ...problemas])], sugerencias };
  } catch (error) {
    return { tipo: undefined, errores: [error instanceof Error ? error.message : "Revisá la sintaxis del JSON."], sugerencias: [] };
  }
}
