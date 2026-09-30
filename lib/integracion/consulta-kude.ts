/** Contrato de consulta del middleware: códigos documentales y numeración. */
export const tiposConsulta = [
  ["FE", "Factura"],
  ["NCR", "Nota de crédito"],
  ["NDE", "Nota de débito"],
  ["REM", "Nota de remisión"],
  ["AUT", "Autofactura"],
] as const;

export type DatosConsulta = {
  dEst: string;
  dPunExp: string;
  dNumDoc: string;
  tipoDoc: string;
};

/** Construye únicamente los parámetros necesarios para estado o KUDE. */
export function crearConsulta(
  datos: DatosConsulta,
  operacion: "estado" | "kude",
) {
  return {
    tipOpe: operacion === "kude" ? "4" : "2",
    dEst: datos.dEst,
    dPunExp: datos.dPunExp,
    dNumDoc: datos.dNumDoc,
    ...(operacion === "estado" ? { dSerieNum: "" } : {}),
    tipoDoc: datos.tipoDoc,

  };
}

/** Comprueba la numeración sin convertir códigos a números ni perder ceros. */
export function revisarConsulta(datos: DatosConsulta) {
  const errores: string[] = [];
  for (const [campo, largo, nombre] of [
    ["dEst", 3, "Establecimiento"],
    ["dPunExp", 3, "Punto de expedición"],
    ["dNumDoc", 7, "Número del documento"],
  ] as const)
    if (!new RegExp(`^\\d{${largo}}$`).test(datos[campo]))
      errores.push(`${nombre}: completá ${largo} dígitos.`);
  if (!tiposConsulta.some(([codigo]) => codigo === datos.tipoDoc))
    errores.push("Seleccioná el tipo de documento.");
  return errores;
}

/** Lee las variantes descritas por la API sin confundir status=success con aprobación. */
export function estadoDocumento(respuesta: any): string {
  const mensaje = respuesta?.message;
  const estado =
    respuesta?.Estado ??
    (mensaje && typeof mensaje === "object" ? mensaje.Estado : undefined);
  return typeof estado === "string" ? estado : "";
}

/** Decodifica el PDF recibido; nunca inserta HTML o URLs arbitrarias en el visor. */
export function obtenerPdfKude(respuesta: any): Blob {
  const mensaje = respuesta?.message;
  const valor =
    respuesta?.kude ??
    (mensaje && typeof mensaje === "object" ? mensaje.kude : undefined);
  if (typeof valor !== "string" || !valor.trim())
    throw Error(
      typeof mensaje === "string"
        ? mensaje
        : "La respuesta no contiene un KUDE en PDF.",
    );
  const base64 = valor
    .replace(/^data:application\/pdf;base64,/i, "")
    .replace(/\s/g, "");
  if (base64.length > 20_000_000)
    throw Error("El KUDE supera el tamaño permitido.");
  let contenido: string;
  try {
    contenido = atob(base64);
  } catch {
    throw Error("El KUDE recibido no tiene un base64 válido.");
  }
  // Un PDF admite su cabecera dentro de los primeros 1024 bytes.
  if (!contenido.slice(0, 1024).includes("%PDF-"))
    throw Error("El archivo recibido no es un PDF válido.");
  return new Blob([Uint8Array.from(contenido, (c) => c.charCodeAt(0))], {
    type: "application/pdf",
  });
}
