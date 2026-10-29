# Trabajo práctico 08: reservas de salas con HTTP y MongoDB

## Origen y alcance

Proyecto individual basado en la copia funcional del TP07. Conserva el sitio
HTML y migra las operaciones de reservas a MongoDB Atlas: tanto el sitio como la
API JSON usan el mismo servicio asíncrono y la colección `reservas` de la base
`reservas_salas_u8`. El arreglo inicial en memoria dejó de importarse al
arranque; los documentos no se cargan ni se crean automáticamente al iniciar o
listar.

La aplicación usa CommonJS, Node.js 20.19 o superior, npm, Express 4 y Mongoose
9. Se mantienen las versiones declaradas en `package.json` y
`package-lock.json`.

## Preparación y arranque

1. Preparar un clúster MongoDB Atlas Free (M0), un usuario con permisos de
   lectura/escritura y permitir en Network Access la IP de la máquina que hará
   las pruebas.
2. Copiar `.env.example` a `.env` y sustituir los marcadores de `MONGODB_URI`
   por la URI privada de Atlas. Mantener la base `reservas_salas_u8`; no
   compartir ni versionar `.env`.
3. Instalar dependencias con `npm install`.
4. Iniciar el servidor desde la raíz con `npm start` (equivale a
   `node --env-file=.env src/index.js`).

El servidor espera la conexión a MongoDB antes de abrir el puerto. Si falta o
no es válida la URI, o falla la conexión, no anuncia que el servidor está
disponible. La configuración de DNS acordada con la red está centralizada en
`src/config/base-datos.js`; no se repite por petición. El servidor conserva la
conexión entre solicitudes y la cierra ordenadamente ante `SIGINT` y `SIGTERM`.
Los scripts de terminal conectan y desconectan por ejecución.

## Estructura por capas

| Ruta | Responsabilidad |
| --- | --- |
| `src/config/entorno.js`, `src/config/base-datos.js` | Entorno, URI, DNS y conexión a Atlas. |
| `src/modelos/reserva.js` | Esquema Mongoose, validaciones y colección. |
| `src/services/reservas.js` | Consultas, creación y conteo asíncronos. |
| `src/controllers/reservas.js`, `src/controllers/api-reservas.js` | Respuestas HTML y JSON. |
| `src/router/reservas.js`, `src/router/api_reservas.js` | Rutas HTML y API separadas. |
| `src/middleware/reservas.js`, `src/middleware/solicitudes.js` | Validación del formulario y datos de solicitud. |
| `src/index.js`, `src/app.js` | Conexión/arranque y composición de Express. |
| `scripts/` | Comprobación de conexión y ejemplos de operación desde terminal. |

El servicio síncrono del TP anterior ya no es importado por el arranque: el
sitio, `/estado` y la API esperan las operaciones del servicio MongoDB.

## Modelo de reserva

| Campo | Regla |
| --- | --- |
| `estudiante` | String obligatorio, recortado con `trim`. |
| `email` | String obligatorio, `trim` y presencia de `@`. |
| `sala` | String obligatorio: `Sala Norte`, `Sala Sur` o `Sala Multimedia`. |
| `fecha` | String obligatorio y `trim`; no se valida que sea una fecha real o futura. |
| `turno` | String obligatorio: `Mañana`, `Tarde` o `Noche`. |
| `personas` | Number obligatorio, entero entre 1 y 6. |
| `estado` | Default `pendiente`; opciones `pendiente` y `confirmada`. La creación no acepta estado del cliente. |

La API copia expresamente los seis campos admitidos, por lo que `estado`, `_id`
y otras propiedades adicionales del cuerpo no se asignan. El modelo conserva
sus propias validaciones. No se validan emails completos, fechas reales o
futuras, solapamientos, cupos compartidos ni duplicados; no hay índice único.
El estado por defecto no añade autenticación, autorización ni migra documentos
anteriores.

## Endpoints

| Método y ruta | Respuesta |
| --- | --- |
| `GET /` | Inicio HTML. |
| `GET /estado` | Estado y conteo consultado en MongoDB. |
| `GET /reservas` | Listado HTML persistido. |
| `GET /reservas/nueva` | Formulario HTML. |
| `POST /reservas` | Crea y espera la escritura; redirige con 302. |
| `GET /reservas/:id` | Detalle HTML persistido. |
| `GET /api/reservas` | `200` y arreglo JSON (incluye `[]` si no hay resultados). |
| `GET /api/reservas/:id` | `200` recurso, `400` ID mal formado o `404` inexistente. |
| `GET /api/reservas?sala=Sala%20Norte` | `200` con coincidencias exactas; sin coincidencias, `[]`. |
| `POST /api/reservas` | JSON válido: `201`, recurso guardado y cabecera `Location`. |

Los errores de creación o de JSON mal formado responden `400` JSON; los fallos
inesperados responden `500` JSON sin traza ni URI. Una sala repetida o un filtro
que no sea texto responde `400`. Las rutas API desconocidas responden `404`
JSON. Esta entrega no implementa `PUT`, `PATCH` ni `DELETE`.

Ejemplo para Postman:

```http
POST http://localhost:3000/api/reservas
Content-Type: application/json
```

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-10-21",
  "turno": "Mañana",
  "personas": 2
}
```

Debe responder `201`, incluir un `id` textual, los seis campos, `estado:
"pendiente"` y una cabecera `Location: /api/reservas/<id>`. Consultar esa URL
con `GET` recupera el documento guardado. La fecha del ejemplo es ilustrativa.

## Pruebas de API y persistencia

Iniciar el servidor con `npm start` y mantenerlo activo durante las solicitudes.
En Postman, usar Body `none` para los GET y el filtro; para crear, elegir Body
`raw` → `JSON` y no sobrescribir `Content-Type: application/json`.

1. Enviar `GET http://localhost:3000/api/reservas`; anotar estado, arreglo y
   cantidad inicial.
2. Enviar el POST del ejemplo una sola vez; guardar el `id` y `Location` de la
   respuesta.
3. Consultar con GET la URL de `Location`; comparar el mismo ID y campos.
4. Probar `GET /api/reservas/1` (400) y un ObjectId de 24 caracteres que no
   exista (404).
5. Probar `sala=Sala Norte`, una sala textual sin coincidencias (`200`, `[]`)
   y dos parámetros `sala` repetidos (400). Quitar filtros para comparar el
   total.
6. Probar un campo por solicitud: estudiante vacío, email sin `@`, sala o turno
   no permitidos, fecha vacía y `personas` 0, 7, 2.5 o `"abc"`. Probar también
   `personas` booleano, arreglo u objeto; cuerpo ausente; JSON mal formado.
   Cada rechazo debe ser `400` y no aumentar la cantidad. Probar por separado
   una creación válida con `estado` o `_id` extra: debe guardar estado
   `pendiente` y un ID propio.
7. Probar el formulario en navegador: alta válida (302) e inválida (400 con
   valores conservados). Comprobar inicio, CSS, `/estado`, listado, detalle y
   una ruta HTML inexistente.
8. Reiniciar el servidor sin repetir el POST; consultar el mismo ID, buscarlo
   en el sitio, listar dos veces y verificar cantidad estable. Comparar el
   `_id` con el documento de `reservas_salas_u8.reservas` en Atlas.

Registrar resultados observados, cantidades antes/después e IDs. Incluir
capturas de Postman que muestren método, URL, estado, cuerpo y `Location` para
la creación; añadir evidencia de la consulta del mismo ID después del reinicio
y de Atlas, recortada para excluir secretos y datos personales. No borrar la
colección ni volver a crear el documento para sustituir esa prueba.

| Caso de evidencia | Resultado |
| --- | --- |
| Solicitudes API, filtros y entradas inválidas | Pendiente de ejecutar y registrar en Postman. |
| Persistencia después de reiniciar y conteos estables | Pendiente de ejecutar y registrar. |
| Documento e `_id` en Atlas | Pendiente de capturar. |

No se declara realizada una prueba que aún no se ejecutó. No publicar el
servidor en Internet sin las protecciones que se incorporarán más adelante.

## Comparación con TP07 y controles

En TP07, la interfaz HTTP operaba sobre una colección en memoria y MongoDB se
usaba desde scripts independientes. En esta versión, las vistas, la API y
`/estado` comparten el servicio persistente; la semilla ya no se importa en el
arranque ni se inserta automáticamente.

Ejecutar `npm run format` para aplicar Prettier y `npm run check` para verificar
formato y ESLint sobre `src/` y `scripts/`.

El archivo `.env` y `node_modules/` están excluidos por `.gitignore`. La
plantilla `.env.example` solo contiene marcadores; no incluir credenciales ni
datos reales en el repositorio o en las capturas.
