const Reserva = require("../modelos/reserva");

async function listar(filtro = {}) {
  return Reserva.find(filtro);
}
async function buscarPorId(id) {
  return Reserva.findById(id);
}
async function crear(datos) {
  const reserva = new Reserva(datos);
  return reserva.save();
}
async function contar() {
  return Reserva.countDocuments();
}

module.exports = {
  listar,
  buscarPorId,
  crear,
  contar,
};
