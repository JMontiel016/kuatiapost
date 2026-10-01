# Corrección de nota de crédito parcial

Se comparó con src/conversion.js del conversor XML recibido. La implementación había cambiado el cálculo por monto para conservar precio y derivar cantidad; esa igualdad estricta bloqueaba importes que el conversor original admite.

Se recuperó el criterio original: por monto, conservar la cantidad seleccionada y recalcular el precio unitario. Por cantidad, conservar el precio original. Los montos por código y el monto total se distribuyen con aritmética BigInt a ocho decimales. Se recalculan base, IVA y subtotales, así como equivalencias de moneda disponibles. No se acepta superar el disponible de la selección.

El diálogo muestra el JSON editable de la nota. Cambiar controles del XML lo regenera. Editar manualmente el JSON conserva ese borrador hasta cambiar los controles. Copiar, JSON, TXT y Revisar están disponibles. Recalcular importes actualiza cantidad × precio, IVA y totales después de editar. Esta recalculación rechaza descuentos o anticipos explícitos no soportados. Usar nota de crédito en Envío de datos transfiere el JSON visible, no una nueva conversión que pierda los cambios manuales. No emite automáticamente.

Pruebas: monto parcial 550, monto 1 con precio original 3, cantidad decimal, código repetido, monto por dos códigos, exceso de monto, base/IVA 10%, edición de cantidades y equivalente en guaraníes para USD. Compilación y TypeScript. No se usó una API real ni se verificó una emisión fiscal; antes de emitir, revisar que el método de devolución por monto corresponda a la operación.
