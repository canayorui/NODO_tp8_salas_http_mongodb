# Trabajo práctico 07: persistencia inicial de reservas de salas

## Punto de partida y alcance

Esta copia, `tp-07-salas-mongodb`, parte de la aplicación individual del TP06.
Se conserva el sitio Express y su gestión de reservas en memoria. El laboratorio
de MongoDB se ejecuta desde programas independientes de terminal: el sitio web
todavía no lee ni escribe en MongoDB. La integración con los controladores HTTP
queda para la unidad 8.

La configuración HTTP se encuentra en `src/config/entorno.js`. La URI se lee
desde `MONGODB_URI`, pero no es necesaria para arrancar el sitio en memoria.

## Requisitos e instalación

Se utiliza CommonJS, Node.js 20.19 o superior (requisito de Mongoose 9) y npm.
La práctica debe usar MongoDB Atlas Free (M0), no una base local. Desde la raíz,
en una descarga nueva:

```bash
npm install
```

En Atlas:

1. Crear o seleccionar un clúster del nivel gratuito M0.
2. Crear un usuario de base de datos con permisos de lectura y escritura.
3. En Network Access, permitir la IP desde la que se ejecutarán los scripts.
4. En Connect → Drivers, seleccionar Node.js y copiar la URI ofrecida por Atlas.
5. Copiar `.env.example` como `.env` y reemplazar los marcadores de
   `MONGODB_URI` por la URI privada. Conservar sus opciones y usar la base
   `reservas_salas_u7`.

No versionar `.env`, credenciales ni datos personales. `.env.example` contiene
solo marcadores; `node_modules/` también está excluido de Git.

## Configuración, conexión y comandos

`src/config/base-datos.js` configura Node.js para resolver DNS con
`8.8.8.8` y `1.1.1.1` antes de conectar. Esto solo afecta la resolución DNS de
Node.js; no modifica el sistema operativo, la autenticación ni la lista de IP
permitidas en Atlas. Si la red bloquea esos resolutores o el docente indica
otros, acordar el ajuste y documentarlo antes de probar. No publicar la URI ni
mensajes de error que puedan contener secretos.

La conexión también comprueba que la URI seleccione explícitamente la base
`reservas_salas_u7`; evita que una URI sin nombre de base escriba por accidente
en la base predeterminada de MongoDB.

Ejecutar desde la raíz:

```bash
node --env-file=.env scripts/comprobar-conexion.js
node --env-file=.env scripts/crear-reserva.js
node --env-file=.env scripts/listar-reservas.js
```

La prueba de conexión espera a que Mongoose conecte, no crea documentos y cierra
la conexión. Ante un fallo muestra el tipo de error y, si existen, el código y
la operación DNS, y termina con estado distinto de cero. Cada ejecución de
creación inserta un documento nuevo; dos ejecuciones pueden crear reservas con
los mismos campos y `_id` diferentes. La confirmación se imprime solo después
de que MongoDB confirma la escritura. El listado consulta documentos persistidos
con Mongoose; una colección vacía se informa con cantidad cero.

El sitio web se inicia independientemente:

```bash
npm start
```

No necesita `MONGODB_URI`. Los controles de calidad son:

```bash
npm run format
npm run check
```

`format` aplica Prettier a `src/` y `scripts/`. `check` verifica formato y
ejecuta ESLint en ambas carpetas.

## Archivos, esquema y modelo

| Archivo | Responsabilidad |
| --- | --- |
| `src/config/entorno.js` | Lee y valida `PORT`, determina el entorno y expone la URI privada de MongoDB. |
| `src/config/base-datos.js` | Configura DNS, valida la URI y administra la conexión/desconexión de Mongoose. |
| `src/modelos/reserva.js` | Define el modelo `Reserva` y la colección explícita `reservas`. |
| `scripts/comprobar-conexion.js` | Comprueba la conexión sin escrituras. |
| `scripts/crear-reserva.js` | Crea una reserva ficticia y muestra el `_id` confirmado. |
| `scripts/listar-reservas.js` | Lee e imprime las reservas persistidas y su cantidad. |
| `src/index.js`, `src/app.js`, `src/router/`, `src/controllers/`, `src/services/`, `src/middleware/` | Sitio Express preexistente del TP06; continúa usando memoria. |

El modelo usa `_id` ObjectId generado por MongoDB, convertido a texto al
mostrarlo. Asignar un `_id` a un objeto en memoria no demuestra que el documento
se haya escrito: la confirmación se muestra después de esperar `create()`.

| Campo | Tipo y reglas |
| --- | --- |
| `estudiante` | String obligatorio; trim. |
| `email` | String obligatorio; trim y presencia de `@`. |
| `sala` | String obligatorio; `Sala Norte`, `Sala Sur` o `Sala Multimedia`. |
| `fecha` | String obligatorio y no vacío tras trim. |
| `turno` | String obligatorio; `Mañana`, `Tarde` o `Noche`. |
| `personas` | Number obligatorio, entero entre 1 y 6. |

El alcance no valida emails completos, fechas imposibles o futuras,
solapamientos, cupos compartidos ni reservas repetidas. No hay índice único.

## Ensayo y matriz de persistencia

No se debe inventar evidencia ni borrar documentos para obtener una colección
vacía. Registrar cantidades y resultados observados con la URI válida de Atlas,
desde la misma base individual:

1. Ejecutar el listado y anotar la cantidad inicial.
2. Crear una reserva; guardar el `_id` mostrado.
3. Esperar a que termine el proceso y ejecutar el listado en un proceso nuevo.
4. Confirmar el mismo `_id` y que la cantidad aumentó en uno.
5. Repetir el listado sin otras escrituras y confirmar que la cantidad no cambió.
6. En Atlas Data Explorer, capturar la base `reservas_salas_u7`, la colección
   `reservas` y el documento con ese mismo `_id`. Recortar la captura para no
   mostrar credenciales ni datos personales.

Completar la siguiente tabla con resultados reales antes de entregar:

| Caso | Resultado observado / cantidad antes y después |
| --- | --- |
| Conexión Atlas válida | Observado: "Conexión con MongoDB establecida correctamente." y el proceso terminó. |
| Fallo DNS (si ocurrió), código, operación y solución acordada | Un intento inicial falló con `MongooseServerSelectionError` sin causa visible; se amplió el diagnóstico y la conexión posterior fue correcta. |
| `MONGODB_URI` ausente | Observado: ejecutando sin `--env-file`, "Falló la conexión con MongoDB", código `MONGODB_URI_MISSING`, sin mensaje de éxito y código de salida 1. Nota: en PowerShell, `$env:MONGODB_URI=''` elimina la variable y `--env-file` volvía a cargarla desde `.env`. |
| Contraseña incorrecta | Observado antes de corregir el `.env`: `MongoServerError`, código 8000 (autenticación fallida), sin mensaje de éxito. Se restauró la URI válida y la conexión posterior fue correcta. |
| Colección vacía (base nueva `reservas_salas_u7`) | Observado: listado inicial con "Cantidad de reservas: 0", sin error. |
| Reserva válida y `_id` | Observado: "Reserva guardada. _id: 6ae146567c22afa8d679932a"; cantidad 0 → 1. |
| Consulta desde proceso nuevo | Observado: el listado recuperó el mismo `_id` 6ae146567c22afa8d679932a; cantidad 1. |
| Segunda consulta | Observado: el listado repitió el mismo `_id` y la cantidad siguió en 1 (sin otras escrituras). |
| Estudiante vacío, email sin `@`, sala/turno inválidos y fecha vacía | Observado en Atlas, un campo por vez con un script temporal (luego eliminado): `ValidationError` en `estudiante`, `email`, `sala`, `turno` y `fecha`; cantidad 1 antes y 1 después en cada caso. |
| Personas `0`, `7`, `2.5` y texto no numérico (`"abc"`) | Observado en Atlas: `ValidationError` en `personas` en los cuatro casos (el texto no numérico falla en la conversión); cantidad 1 antes y 1 después. |
| Captura de Data Explorer con el mismo `_id` | Pendiente de captura. |

Para probar validaciones, cambiar temporalmente un solo campo de
`reservaDePrueba` en `scripts/crear-reserva.js`, ejecutar la creación, anotar el
resultado/cantidad y restaurar el ejemplo válido. Los errores no deben producir
un mensaje de éxito.

## Continuidad del sitio

Las altas HTTP siguen siendo en memoria y no aparecen necesariamente en Atlas;
las reservas creadas con los programas de terminal no aparecen todavía en las
vistas. La migración del servicio HTTP y el uso de operaciones asíncronas quedan
fuera de este TP y se abordarán en la unidad 8.

Comprobación del sitio con el servidor en marcha (arrancado con `src/index.js`, el mismo punto de entrada de `npm start`): inicio, `/estado`, listado y formulario respondieron 200; el formulario inválido respondió 400 y la cantidad en memoria siguió en 4; el formulario válido redirigió a `/reservas` y la cantidad pasó de 4 a 5; el CSS respondió 200 y una URL desconocida, 404. Las reservas de Atlas no aparecen en las vistas.

## Calidad

`npm run format` y `npm run check` (Prettier y ESLint sobre `src/` y `scripts/`) finalizaron sin errores.

## Versiones usadas

- Node.js 22.17.1
- npm 10.9.2
- Mongoose 9.11.4
- MongoDB Atlas Free (M0), clúster preparado en las clases.

## Seguridad

No se publican `.env`, credenciales ni datos personales: `.env` y `node_modules/` están en `.gitignore`, `.env.example` contiene solo marcadores y los datos de las reservas son ficticios.
# NODO_tp8_salas_http_mongodb
