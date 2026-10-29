const dns = require("node:dns");
const { URL } = require("node:url");
const mongoose = require("mongoose");

const leerConfiguracion = require("./entorno");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function conectarBaseDatos() {
  const { mongodbUri } = leerConfiguracion();

  if (!mongodbUri || !mongodbUri.trim()) {
    const error = new Error("MONGODB_URI no configurada");
    error.code = "MONGODB_URI_MISSING";
    throw error;
  }

  if (!mongodbUri.startsWith("mongodb+srv://")) {
    const error = new Error(
      "Formato de MONGODB_URI inválido: se esperaba una URI de Atlas mongodb+srv://",
    );
    error.code = "MONGODB_URI_INVALID";
    throw error;
  }

  let baseDatos;
  try {
    baseDatos = new URL(mongodbUri).pathname.slice(1).split("/")[0];
  } catch {
    const error = new Error(
      "No se pudo interpretar la configuración de MONGODB_URI",
    );
    error.code = "MONGODB_URI_INVALID";
    throw error;
  }

  if (baseDatos !== "reservas_salas_u8") {
    const error = new Error(
      "MONGODB_URI debe apuntar a la base de datos reservas_salas_u8",
    );
    error.code = "MONGODB_DATABASE_INVALID";
    throw error;
  }

  await mongoose.connect(mongodbUri);
}

async function desconectarBaseDatos() {
  await mongoose.disconnect();
}

module.exports = {
  conectarBaseDatos,
  desconectarBaseDatos,
};
