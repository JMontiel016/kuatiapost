// Excel se procesa en el navegador; los códigos y decimales se conservan como texto.
import { parseObject, pretty } from "../integracion/solicitudes-integracion";

/** Genera hojas Excel para cabecera, grupos de filas y respuesta del documento. */
export async function exportExcel(doc: any, response?: any) {
  const { default: ExcelJS } = await import("exceljs");
  const w = new ExcelJS.Workbook();
  const header = w.addWorksheet("Cabecera");
  header.addRow(["Campo", "Valor"]);
  for (const [k, v] of Object.entries(doc))
    if (!Array.isArray(v) && typeof v !== "object")
      header.addRow([k, String(v ?? "")]);
  for (const [k, v] of Object.entries(doc)) {
    if (!Array.isArray(v)) continue;
    const sh = w.addWorksheet(k.slice(0, 31));
    const keys = [...new Set(v.flatMap((row) => Object.keys(row)))];
    if (keys.length) {
      sh.addRow(keys);
      for (const row of v) sh.addRow(keys.map((key) => String(row[key] ?? "")));
    }
  }
  if (response) {
    const sh = w.addWorksheet("Respuesta");
    sh.addRow(["JSON"]);
    const text = pretty(response);
    for (let i = 0; i < text.length; i += 30000)
      sh.addRow([text.slice(i, i + 30000)]);
  }
  for (const sh of w.worksheets) {
    sh.views = [{ state: "frozen", ySplit: 1 }];
    sh.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sh.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF172B4D" },
    };
    sh.columns.forEach((c) => (c.width = 28));
    sh.eachRow((row) => row.eachCell((cell) => (cell.numFmt = "@")));
  }
  const data = await w.xlsx.writeBuffer();
  return new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Lee el formato de plantilla sin ejecutar fórmulas y conserva códigos como texto. */
export async function importExcel(file: File) {
  if (file.size > 10_000_000)
    throw Error("El Excel debe pesar menos de 10 MB.");
  const { default: ExcelJS } = await import("exceljs");
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(await file.arrayBuffer());
  const header = w.getWorksheet("Cabecera");
  if (!header) throw Error("Usá la plantilla Excel con la hoja Cabecera.");
  const text = (cell: any) => {
    const v = cell.value;
    if (v == null) return "";
    if (typeof v === "object")
      throw Error(
        "No se admiten fórmulas, fechas ni objetos de Excel. Usá texto en las celdas.",
      );
    return String(v);
  };
  const out: any = {};
  header.eachRow((row, n) => {
    if (n === 1) return;
    const key = text(row.getCell(1));
    if (!key) return;
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw Error("Nombre de campo inválido.");
    out[key] = text(row.getCell(2));
  });
  for (const sh of w.worksheets) {
    if (["Cabecera", "Respuesta"].includes(sh.name)) continue;
    const keys: string[] = [];
    sh.getRow(1).eachCell((cell, n) => (keys[n - 1] = text(cell)));
    if (keys.some((k) => ["__proto__", "constructor", "prototype"].includes(k)))
      throw Error("Nombre de campo inválido.");
    const rows: any[] = [];
    sh.eachRow({ includeEmpty: true }, (row, n) => {
      if (n === 1) return;
      rows.push(
        Object.fromEntries(keys.map((k, i) => [k, text(row.getCell(i + 1))])),
      );
    });
    out[sh.name] = rows;
  }
  return parseObject(pretty(out));
}

/** Ordena el libro y guarda códigos como texto para conservar sus ceros iniciales. */
function presentarLibro(libro: any) {
  for (const hoja of libro.worksheets) {
    hoja.views = [{ state: "frozen", ySplit: 1 }];
    hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    hoja.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF172B4D" },
    };
    hoja.columns.forEach((columna: any) => (columna.width = 28));
    hoja.eachRow((fila: any) =>
      fila.eachCell((celda: any) => (celda.numFmt = "@")),
    );
  }
}

/** Convierte datos en texto; ninguna entrada se interpreta como fórmula Excel. */
function textoCelda(valor: any) {
  return valor == null
    ? ""
    : typeof valor === "object"
      ? JSON.stringify(valor)
      : String(valor);
}

/** Exportación masiva: un documento por fila y productos/totales vinculados por ID. */
export async function exportHistory(registros: any[]) {
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  const documentos = libro.addWorksheet("Documentos");
  const claves = [
    ...new Set(
      registros.flatMap((r) =>
        Object.keys(r.request || {}).filter(
          (k) => !Array.isArray(r.request[k]),
        ),
      ),
    ),
  ];
  documentos.addRow([
    "IdDocumento",
    "Tipo",
    "Operación",
    "Fecha",
    "HTTP",
    ...claves,
  ]);
  const solicitudes = libro.addWorksheet("JSON de solicitudes");
  solicitudes.addRow(["IdDocumento", "Parte", "JSON (unir partes en orden)"]);
  const respuestas = libro.addWorksheet("Respuestas");
  respuestas.addRow(["IdDocumento", "Parte", "Respuesta JSON"]);
  const grupos: Record<string, any[]> = {};

  // Cada grupo se exporta a una hoja relacionada, sin mezclar productos de documentos distintos.
  registros.forEach((registro, indice) => {
    const id = `DOC-${String(indice + 1).padStart(5, "0")}`;
    documentos.addRow([
      id,
      registro.type,
      registro.operation,
      registro.date,
      registro.response?.http ?? "",
      ...claves.map((k) => textoCelda(registro.request?.[k])),
    ]);
    for (const [grupo, filas] of Object.entries(registro.request || {})) {
      if (!Array.isArray(filas)) continue;
      grupos[grupo] ||= [];
      filas.forEach((fila, orden) =>
        grupos[grupo].push({
          IdDocumento: id,
          Orden: String(orden + 1),
          ...fila,
        }),
      );
    }
    const guardarPartes = (hoja: any, contenido: string) => {
      for (let inicio = 0; inicio < contenido.length; inicio += 30000)
        hoja.addRow([
          id,
          String(inicio / 30000 + 1),
          contenido.slice(inicio, inicio + 30000),
        ]);
    };
    guardarPartes(solicitudes, pretty(registro.request || {}));
    // El PDF tiene su propia descarga; no se incluye base64 voluminoso en las celdas.
    const sinPdf = JSON.stringify(
      registro.response?.data ?? {},
      (clave, valor) =>
        clave === "kude" ? "KUDE disponible mediante descarga PDF" : valor,
      2,
    );
    guardarPartes(respuestas, sinPdf);
  });
  const nombres: Record<string, string> = {
    Detalles: "Productos",
    Subtotales: "Totales",
    DocumentosAsociados: "Documentos asociados",
  };
  for (const [grupo, filas] of Object.entries(grupos)) {
    const hoja = libro.addWorksheet((nombres[grupo] || grupo).slice(0, 31));
    const columnas = [...new Set(filas.flatMap((fila) => Object.keys(fila)))];
    hoja.addRow(columnas);
    filas.forEach((fila) =>
      hoja.addRow(columnas.map((clave) => textoCelda(fila[clave]))),
    );
  }
  presentarLibro(libro);
  return new Blob([(await libro.xlsx.writeBuffer()) as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Un único caso ilustrativo para entender las hojas relacionadas de una exportación masiva. */
export async function exportarEjemploMasivo() {
  return exportHistory([
    {
      type: "Factura",
      operation: "Ejemplo de exportación",
      date: "2026-09-30",
      request: {
        tipOpe: "1",
        iTiDE: "1",
        dEst: "001",
        dPunExp: "001",
        dNumDoc: "0000001",
        dNomRec: "CLIENTE DE EJEMPLO",
        cMoneOpe: "PYG",
        Detalles: [
          {
            dCodInt: "PROD001",
            dDesProSer: "PRODUCTO DE EJEMPLO",
            cUniMed: "77",
            dCantProSer: "1.0000",
            dPUniProSer: "100000",
            dTotOpeItem: "100000",
            iAfecIVA: "3",
            dPropIVA: "0",
            dTasaIVA: "0",
            dBasGravIVA: "0",
            dLiqIVAItem: "0",
          },
        ],
        Subtotales: [
          {
            dSubExe: "100000",
            dTotOpe: "100000",
            dTotGralOpe: "100000",
            dTotIVA: "0",
          },
        ],
      },
      response: {
        http: "",
        data: { message: "Ejemplo ilustrativo; no es un documento emitido." },
      },
    },
  ]);
}
