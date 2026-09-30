# Asistente de KuatiaPost

## Ejecutar en tu computadora

1. Verificá Ollama y el modelo:

```bash
ollama list
```

Si el servicio está detenido:

```bash
sudo systemctl start ollama
```

Si falta el modelo:

```bash
ollama pull llama3.2
```

2. En la raíz del proyecto, configurá `.env.local`:

```env
LLAMA_URL=http://127.0.0.1:11434/api/chat
LLAMA_MODEL=llama3.2
LLAMA_API_KEY=
```

En desarrollo, si falta LLAMA_URL se usa esta misma dirección local. La configuración explícita también sirve para ejecutar `npm run start` en tu computadora.

3. Reiniciá KuatiaPost después de cambiar la configuración:

```bash
npm run dev
```

4. Entrá al Asistente y presioná Comprobar conexión. Si dice disponible, probá: ¿Cómo completo dPunExp?

## Vercel

Vercel no puede acceder a 127.0.0.1 de tu computadora. Configurá LLAMA_URL con un servicio HTTPS accesible desde Vercel, LLAMA_MODEL con el nombre disponible y LLAMA_API_KEY si el proveedor la requiere. La conexión admite /api/chat de Ollama y /v1/chat/completions de servicios compatibles. Después de cambiar variables, volvé a desplegar. El tiempo máximo real también depende de los límites de tu alojamiento.

## Interfaz

El menú negro en inglés era el indicador de desarrollo de Next.js. Está desactivado. La ayuda de KuatiaPost está en español y ocupa una posición fija. Puede plegarse, pero queda visible el botón Abrir.

## Verificación

Compilación y pruebas con servicios simulados aprobadas: conexión nativa y compatible, modelo ausente, servicio detenido y ocultación de secretos antes de enviar consultas al modelo. No se probó inferencia con el Ollama de tu computadora.
