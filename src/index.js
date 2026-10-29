const leerConfiguracion = require("./config/entorno");
const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("./config/base-datos");
const crearApp = require("./app");
const servicioReservas = require("./services/reservas");

async function iniciarServidor() {
  let servidor;
  let baseDatosConectada = false;

  try {
    const configuracion = leerConfiguracion();
    await conectarBaseDatos();
    baseDatosConectada = true;

    const app = crearApp({
      servicio: servicioReservas,
      formatoMorgan: configuracion.formatoMorgan,
    });

    servidor = await new Promise((resolve, reject) => {
      const instancia = app.listen(configuracion.port, () => {
        resolve(instancia);
      });
      instancia.once("error", reject);
    });

    console.log(
      `Servidor iniciado en puerto ${configuracion.port} (${configuracion.entorno})`,
    );
  } catch (error) {
    console.error(
      `No se pudo iniciar el servidor (${error.name || "Error"}${error.code ? `, código ${error.code}` : ""}).`,
    );
    if (
      error.code === "MONGODB_URI_MISSING" ||
      error.code === "MONGODB_URI_INVALID" ||
      error.code === "MONGODB_DATABASE_INVALID"
    ) {
      console.error(error.message);
    }
    process.exitCode = 1;
    if (baseDatosConectada) {
      await desconectarBaseDatos().catch((closeError) => {
        console.error(
          `No se pudo cerrar la conexión (${closeError.name || "Error"}).`,
        );
      });
    }
    return;
  }

  let cerrando = false;
  async function cerrarServidor(signal) {
    if (cerrando) return;
    cerrando = true;
    console.log(`Cerrando servidor por ${signal}.`);

    try {
      await new Promise((resolve, reject) => {
        servidor.close((error) => (error ? reject(error) : resolve()));
      });
      await desconectarBaseDatos();
    } catch (error) {
      console.error(
        `No se pudo cerrar correctamente (${error.name || "Error"}${error.code ? `, código ${error.code}` : ""}).`,
      );
      process.exitCode = 1;
    }
  }

  process.once("SIGINT", () => cerrarServidor("SIGINT"));
  process.once("SIGTERM", () => cerrarServidor("SIGTERM"));
}

iniciarServidor();
