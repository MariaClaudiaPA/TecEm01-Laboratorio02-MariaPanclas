import mongoose from 'mongoose';

const SearchSchema = new mongoose.Schema({
  origen: {
    lat: Number,
    lon: Number,
    nombre: String
  },
  destino: {
    lat: Number,
    lon: Number,
    nombre: String
  },
  distancia_km: String,
  duracion_min: String,
  ruta: Object,
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model('Search', SearchSchema);