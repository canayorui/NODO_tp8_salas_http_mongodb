const mongoose = require("mongoose");

const reservaSchema = new mongoose.Schema(
  {
    estudiante: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      match: /@/,
    },
    sala: {
      type: String,
      required: true,
      enum: ["Sala Norte", "Sala Sur", "Sala Multimedia"],
    },
    fecha: {
      type: String,
      required: true,
      trim: true,
    },
    turno: {
      type: String,
      required: true,
      enum: ["Mañana", "Tarde", "Noche"],
    },
    personas: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
      validate: {
        validator: Number.isInteger,
      },
    },
    estado: {
      type: String,
      enum: ["pendiente", "confirmada"],
      default: "pendiente",
    },
  },
  {
    collection: "reservas",
  },
);

module.exports = mongoose.model("Reserva", reservaSchema);
