function crearControladorReservas(servicio) {
  return {
    async listado(req, res, next) {
      try {
        const reservas = await servicio.listar();
        return res.render("reservas/lista", {
          titulo: "Listado",
          reservas,
        });
      } catch (error) {
        return next(error);
      }
    },

    formulario(req, res) {
      return res.render("reservas/nueva", {
        titulo: "Nueva reserva",
        error: null,
        valores: {},
      });
    },

    async detalle(req, res, next) {
      try {
        const reserva = await servicio.buscarPorId(req.params.id);
        if (!reserva) {
          return res
            .status(404)
            .render("no_encontrados", { titulo: "No encontrado" });
        }
        return res.render("reservas/detalle", { titulo: "Detalle", reserva });
      } catch (error) {
        if (error.name === "CastError") {
          return res
            .status(404)
            .render("no_encontrados", { titulo: "No encontrado" });
        }
        return next(error);
      }
    },

    async crear(req, res, next) {
      try {
        await servicio.crear(req.reservaValidada);
        return res.redirect(302, "/reservas");
      } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
          return res.status(400).render("reservas/nueva", {
            titulo: "Nueva reserva",
            error: "Datos inválidos",
            valores: req.reservaValores,
          });
        }
        return next(error);
      }
    },
  };
}

module.exports = crearControladorReservas;
