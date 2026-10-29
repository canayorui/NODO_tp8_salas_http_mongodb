const express = require("express");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
const middlewareSolicitudes = require("./middleware/solicitudes");
const crearControladorReservas = require("./controllers/reservas");
const crearControladorApiReservas = require("./controllers/api-reservas");
const crearRouterReservas = require("./router/reservas");
const crearRouterApiReservas = require("./router/api_reservas");

function crearApp({ servicio, formatoMorgan }) {
  const app = express();
  const controlador = crearControladorReservas(servicio);
  const controladorApi = crearControladorApiReservas(servicio);
  const routerReservas = crearRouterReservas(controlador);
  const routerApiReservas = crearRouterApiReservas(controladorApi);

  app.set("views", path.join(__dirname, "../views"));
  app.set("view engine", "ejs");
  app.set("layout", "./layouts/main");

  app.use(morgan(formatoMorgan));
  app.use(middlewareSolicitudes.identificarSolicitud);
  app.use(middlewareSolicitudes.medirDuracion);
  app.use(expressLayouts);
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.render("inicio", { titulo: "Inicio" });
  });

  app.get("/estado", async (req, res, next) => {
    try {
      const cantidad = await servicio.contar();
      res.json({
        servicio: "activo",
        cantidad,
        solicitudId: res.locals.solicitudId,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/reservas", routerReservas);
  app.use("/api/reservas", routerApiReservas);

  app.use((req, res) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Ruta API inexistente" });
    }
    return res.status(404).render("no_encontrados", {
      titulo: "No encontrado",
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    const esApi = req.path === "/api" || req.path.startsWith("/api/");
    const esJsonMalformado =
      error.type === "entity.parse.failed" || error instanceof SyntaxError;

    if (esApi) {
      if (esJsonMalformado) {
        return res.status(400).json({ error: "JSON malformado" });
      }
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ error: "Datos inválidos" });
      }
      console.error(
        `Error interno API ${res.locals.solicitudId || ""}: ${error.name || "Error"}${error.code ? ` (${error.code})` : ""}`,
      );
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    if (esJsonMalformado) {
      return res.status(400).send("Solicitud inválida.");
    }
    console.error(
      `Error interno ${res.locals.solicitudId || ""}: ${error.name || "Error"}${error.code ? ` (${error.code})` : ""}`,
    );
    return res.status(500).send("Error interno del servidor.");
  });

  return app;
}

module.exports = crearApp;
