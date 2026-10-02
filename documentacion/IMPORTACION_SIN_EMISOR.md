# Importación sin datos del emisor

La conversión de XML a nota de crédito ya no copia datos del grupo gEmis. La importación general de XML y TXT con XML omite ese grupo completo, incluyendo actividad económica y responsables. TXT con JSON y XML de intercambio omiten las claves conocidas del emisor en la cabecera.

Se conservan receptor, numeración, fecha, productos, pagos, importes y referencias de origen. No se modificaron los cálculos. El JSON importado explícitamente, Excel y el editor libre conservan sus propiedades: este ajuste no impide añadir campos manualmente.

Los borradores ya cargados no se limpian automáticamente: hay que volver a importar o convertir el origen.
