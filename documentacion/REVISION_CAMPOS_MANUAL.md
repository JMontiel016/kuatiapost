# Revisión de nombres contra el manual v150 y notas técnicas

Fuente oficial consultada: https://www.dnit.gov.py/web/e-kuatia/documentacion-tecnica
Última nota publicada en la página consultada: NT 027 (09/03/2026).

Los nombres siguientes se recuperaron de la columna Descripción del manual. La NT 023 actualiza la identificación opcional en B2F; la NT 027 trata el evento de nominación, no redefine D202.

| Campo | Nombre anterior | Nombre según manual | Página PDF |
|---|---|---|---|
| iTiDE | Tipo de operación | Tipo de Documento Electrónico | 64 |
| dNumDoc | Número de referencia | Número del documento | 65 |
| dFeEmiDE | Fecha y hora de emisión | Fecha y hora de emisión del DE | 66 |
| dInfoFisc | Información fiscal adicional | Información de interés del Fisco respecto al DE | 64 |
| iTImp | Tipo de impuesto | Tipo de impuesto afectado | 67 |
| cMoneOpe | Moneda del registro | Moneda de la operación | 68 |
| dCondTiCam | Forma de informar el cambio de moneda | Condición del tipo de cambio | 68 |
| dTiCam | Tipo de cambio global | Tipo de cambio de la operación | 68 |
| dTiCamIt | Tipo de cambio del ítem | Tipo de cambio por ítem | 88 |
| iIndPres | Forma de realizar la venta | Indicador de presencia | 75 |
| iTiOpe | Tipo de operación con el receptor | Tipo de operación | 72 |
| cPaisRec | País del receptor | Código de país del receptor | 72 |
| dRucRec | RUC del receptor, sin dígito verificador | RUC del receptor | 72 |
| dDVRec | Dígito verificador del RUC | Dígito verificador del RUC del receptor | 72 |
| iTipIDRec | Tipo de operación de identidad | Tipo de documento de identidad del receptor | 72 |
| dNumIDRec | Número de referencia de identidad | Número de documento de identidad | 73 |
| dNomRec | Nombre o razón social del receptor | Nombre o razón social del receptor del DE | 73 |
| cDepRec | Código del departamento | Código del departamento del receptor | 73 |
| cCiuRec | Código de la ciudad | Código de la ciudad del receptor | 74 |
| dTelRec | Teléfono del receptor | Número de teléfono del receptor | 74 |
| dCelRec | Celular del receptor | Número de celular del receptor | 74 |
| dEmailRec | Correo del receptor | Correo electrónico del receptor | 74 |
| iCondOpe | Condición de la venta | Condición de la operación | 81 |
| iMotEmi | Motivo de la nota de crédito o débito | Motivo de emisión | 78 |
| iTipDocAso | Tipo de operación asociado | Tipo de documento asociado | 109 |
| dCdCDERef | CDC del registro electrónico asociado | CDC del DTE referenciado | 109 |
| dCodInt | Código del producto o servicio | Código interno del ítem | 95 |
| dDesProSer | Descripción del producto o servicio | Descripción del producto y/o servicio | 87 |
| dCantProSer | Cantidad del producto o servicio | Cantidad del producto y/o servicio | 87 |
| dPUniProSer | Precio unitario | Precio unitario del producto y/o servicio (incluidos impuestos) | 88 |
| dTotBruOpeItem | Importe bruto del ítem | Total bruto de la operación por ítem | 88 |
| dTotOpeItem | Importe final del ítem | Valor total de la operación por ítem | 90 |
| iAfecIVA | Afectación del ítem al IVA | Forma de afectación tributaria del IVA | 90 |
| dPropIVA | Proporción gravada por IVA | Proporción gravada de IVA | 91 |
| dBasGravIVA | Base imponible del ítem | Base gravada del IVA por ítem | 91 |
| dLiqIVAItem | IVA del ítem | Liquidación del IVA por ítem | 91 |
| dSubExe | Subtotal exento | Subtotal de la operación exenta | 104 |
| dSubExo | Subtotal exonerado | Subtotal de la operación exonerada | 104 |
| dSub5 | Subtotal con IVA del 5% | Subtotal de la operación con IVA incluido a la tasa 5% | 104 |
| dSub10 | Subtotal con IVA del 10% | Subtotal de la operación con IVA incluido a la tasa 10% | 104 |
| dTotOpe | Total de la operación | Total Bruto de la operación | 104 |
| dTotDescGlotem | Total de descuentos globales por ítem | Total descuento global por ítem | 104 |
| dTotAntItem | Total de anticipos por ítem | Total Anticipo por ítem | 105 |
| dTotAnt | Total de anticipos globales | Total Anticipo global por ítem | 105 |
| dDescTotal | Total general de descuentos | Total Descuentos de la operación | 105 |
| dAnticipo | Total general de anticipos | Total Anticipos de la operación | 105 |
| dRedon | Ajuste por redondeo | Redondeo de la operación | 105 |
| dTotGralOpe | Total general del registro | Total Neto de la operación | 105 |
| dIVA5 | Total del IVA del 5% | Liquidación del IVA a la tasa del 5% | 105 |
| dIVA10 | Total del IVA del 10% | Liquidación del IVA a la tasa del 10% | 105 |
| dTotIVA | Total del IVA | Liquidación total del IVA | 106 |
| dBaseGrav5 | Base imponible total del 5% | Total base gravada al 5% | 106 |
| dBaseGrav10 | Base imponible total del 10% | Total base gravada al 10% | 107 |
| dTBasGraIVA | Base imponible total del IVA | Total de la base gravada de IVA | 107 |
| dTotalGs | Total equivalente en guaraníes | Total general de la operación en Guaraníes | 107 |
| iTiPago | Forma de pago | Tipo de pago | 82 |
| dMonTiPag | Importe de este pago | Monto por tipo de pago | 83 |
| cMoneTiPag | Moneda del pago | Moneda por tipo de pago | 83 |
| dTiCamTiPag | Cambio de moneda del pago | Tipo de cambio por tipo de pago | 83 |
| iMotEmiNR | Motivo del traslado | Motivo de emisión | 79 |
| dDesMotEmiNR | Descripción del motivo del traslado | Descripción del motivo de emisión | 80 |
| iRespEmiNR | Responsable de emitir la remisión | Responsable de la emisión de la Nota Remisión Electrónica | 80 |
| dKmR | Kilómetros estimados del recorrido | Kilómetros estimados de recorrido | 80 |
| dFecEm | Fecha de la factura asociada a la remisión | Fecha futura de emisión de la factura | 80 |
| iModTrans | Modalidad de transporte | Modalidad del transporte | 97 |
| dNuDespImp | Número del despacho de importación | Número de despacho de importación | 98 |
| dDVTrans | Dígito verificador del transportista | Dígito verificador del RUC del transportista | 102 |
| iTipIDTrans | Tipo de identidad del transportista | Tipo de documento de identidad del transportista | 102 |
| dNumIDTrans | Número de identidad del transportista | Número de documento de identidad del transportista | 102 |
| dNomChof | Nombre del conductor | Nombre y apellido del chofer | 102 |
| dNumIDChof | Número de identidad del conductor | Número de documento de identidad del chofer | 102 |
| dDirLocSal | Dirección de salida | Dirección del local de salida | 98 |
| cDepSal | Departamento de salida | Código del departamento del local de salida | 99 |
| cDisSal | Distrito de salida | Código del distrito del local de salida | 99 |
| cCiuSal | Ciudad de salida | Código de la ciudad del local de salida | 99 |
| dDirLocEnt | Dirección de entrega | Dirección del local de la entrega | 99 |
| dNumCasEnt | Número de casa de entrega | Número de casa de la entrega | 99 |
| cDepEnt | Departamento de entrega | Código del departamento del local de la entrega | 100 |
| cDisEnt | Distrito de entrega | Código del distrito del local de la entrega | 100 |
| cCiuEnt | Ciudad de entrega | Código de la ciudad del local de la entrega | 100 |
| iNatVen | Naturaleza del vendedor de la autofactura | Naturaleza del vendedor | 76 |
| iTipIDVen | Tipo de identidad del vendedor | Tipo de documento de identidad del vendedor | 76 |
| dNumIDVen | Número de identidad del vendedor | Número de documento de identidad del vendedor | 76 |
| dNomVen | Nombre del vendedor | Nombre y apellido del vendedor | 76 |
| cDepVen | Departamento del vendedor | Código del departamento del vendedor | 77 |
| cDisVen | Distrito del vendedor | Código del distrito del vendedor | 77 |
| cCiuVen | Ciudad del vendedor | Código de la ciudad del vendedor | 77 |
| dDirProv | Dirección donde se realiza la transacción | Lugar de la transacción | 77 |
| dDesIndPres | Descripción de la forma de venta | Descripción del indicador de presencia | 75 |
| dDTipIDRec | Descripción de la identificación | Descripción del tipo de documento de identidad | 73 |
| dDesTiPag | Descripción de la forma de pago | Descripción del tipo de pago | 83 |
| dNumCheq | Número del cheque | Número de cheque | 85 |
| iDenTarj | Marca de la tarjeta | Denominación de la tarjeta | 84 |
| iForProPa | Procesamiento del pago | Forma de procesamiento de pago | 84 |
| dRUCProTar | RUC de la procesadora | RUC de la procesadora de tarjeta | 84 |
| dCodAuOpe | Código de autorización | Código de autorización de la operación | 84 |
| dNumTarj | Últimos cuatro dígitos de la tarjeta | Número de la tarjeta | 85 |
| iCondCred | Condición del crédito | Condición de la operación a crédito | 85 |

Los selectores D202 muestran 1=B2B, 2=B2C, 3=B2G y 4=B2F sin sustituciones ni cambios automáticos del código. La revisión conserva las restricciones documentadas: autofactura contribuyente/B2C; B2F no contribuyente/país extranjero.
Las descripciones de Otro conservan los tamaños del manual: dDesIndPres 10-30, dDTipIDRec 9-41, dDesTiPag 4-30 y dDesDenTarj 4-20 caracteres.
Esta revisión corrige nombres y condiciones identificadas; no constituye una certificación de todos los campos de un XML firmado.

NT 023: se revisó además Innominado, que no corresponde a NC/ND/NR y se limita a B2C con número de identidad 0.
Pruebas: compilación y TypeScript aprobados; catálogos B2B/B2C/B2G/B2F, nombres de identidad, identificación opcional B2F y descripción Otro comprobados; cálculos parciales y archivos siguen pasando. No se enviaron datos a una API real.
