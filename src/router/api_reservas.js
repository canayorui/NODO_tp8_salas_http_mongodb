const express = require("express");

function manejarErrorAsincrono(controlador) {
  return (req, res, next) => {
    Promise.resolve(controlador(req, res, next)).catch(next);
  };
}

function crearRouterApiReservas(controlador) {
  const router = express.Router();

  router.get("/", manejarErrorAsincrono(controlador.listar));
  router.get("/:id", manejarErrorAsincrono(controlador.detalle));
  router.post("/", manejarErrorAsincrono(controlador.crear));

  return router;
}

module.exports = crearRouterApiReservas;
