import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ── CONEXIÓN A MONGODB ──
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB conectado'))
  .catch(err => console.log('Error MongoDB:', err.message));

// ── ESQUEMA DE BÚSQUEDA ──
const searchSchema = new mongoose.Schema({
  origen: String,     // "lat,lon"
  destino: String,    // "lat,lon"
  distancia_km: String,
  duracion_min: String,
  fecha: { type: Date, default: Date.now }
});

const Search = mongoose.model('Search', searchSchema);

// ── RUTA CON GEOMETRÍA ──
const UA = 'LabUCSM/1.0';
const osmFetch = (url) => fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());

app.get('/api/ruta', async (req, res) => {
  const { oLat, oLon, dLat, dLon } = req.query;
  if (!oLat || !oLon || !dLat || !dLon) return res.status(400).json({ error: 'Se requieren coordenadas' });

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=geojson`;
    const data = await osmFetch(url);

    if (data.code !== 'Ok') return res.status(502).json({ error: data.code });

    const ruta = data.routes[0];

    // Guardar en historial
    const nuevaBusqueda = new Search({
      origen: `${oLat},${oLon}`,
      destino: `${dLat},${dLon}`,
      distancia_km: (ruta.distance / 1000).toFixed(2),
      duracion_min: (ruta.duration / 60).toFixed(1)
    });
    await nuevaBusqueda.save();

    res.json({
      distancia_km: nuevaBusqueda.distancia_km,
      duracion_min: nuevaBusqueda.duracion_min,
      geometry: ruta.geometry
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── OBTENER HISTORIAL CON FILTRO POR FECHA ──
app.get('/api/historial', async (req, res) => {
  try {
    const { fecha } = req.query;
    let filtro = {};
    if (fecha) {
      const start = new Date(fecha);
      const end = new Date(fecha);
      end.setDate(end.getDate() + 1);
      filtro.fecha = { $gte: start, $lt: end };
    }
    const historial = await Search.find(filtro).sort({ fecha: -1 }).limit(20);
    res.json(historial);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));