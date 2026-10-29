const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  next();
}

function validarReserva(req, res, next) {
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const normalizar = (valor) => (typeof valor === "string" ? valor.trim() : "");
  const estudiante = normalizar(body.estudiante);
  const email = normalizar(body.email);
  const sala = normalizar(body.sala);
  const fecha = normalizar(body.fecha);
  const turno = normalizar(body.turno);
  const personasTexto = normalizar(body.personas);
  const personas =
    /^\d+$/.test(personasTexto) && personasTexto !== ""
      ? Number(personasTexto)
      : Number.NaN;

  const valores = {
    estudiante,
    email,
    sala,
    fecha,
    turno,
    personas: personasTexto,
  };
  req.reservaValores = valores;

  if (
    !estudiante ||
    !email.includes("@") ||
    !salaPermitida(sala) ||
    !fecha ||
    !turnosPermitidos.includes(turno) ||
    !Number.isInteger(personas) ||
    personas < 1 ||
    personas > 6
  ) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: "Datos inválidos",
      valores,
    });
  }

  req.reservaValidada = { estudiante, email, sala, fecha, turno, personas };
  return next();
}

function salaPermitida(sala) {
  return salasPermitidas.includes(sala);
}

module.exports = { prepararAreaReservas, validarReserva };
