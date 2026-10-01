# Ordenar JSON y revisar registros

Ordenar JSON agrega sangría sin cambiar claves, valores ni precisión numérica. Acepta un JSON válido seguido de un registro con fecha y nivel DEBUG/ERROR/INFO/WARNING/WARN. El registro se conserva en un panel desplegable separado y no queda dentro del cuerpo para enviar. Los mensajes de la API se muestran por campo.

Se revisan las reglas disponibles de los tipos conocidos y las claves del catálogo. Una clave no reconocida se conserva y requiere confirmar el contrato de la integración; no constituye automáticamente un error. No se renombra FormaPago a Pagos ni se rellenan identificaciones automáticamente. Se avisa si hay caracteres dañados. El resultado corresponde a la última ordenación: volvé a ordenar o revisar después de editar.

Pruebas: TypeScript; preservación de enteros grandes; separación de registro; mensajes Unicode y rutas de ítems; llaves dentro de cadenas; rechazo de bloques incompletos y texto adicional ambiguo. No se realizaron envíos a una API real.
