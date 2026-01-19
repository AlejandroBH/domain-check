import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';
import domainRoutes from './routes/domain.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Rutas API
app.use('/api', domainRoutes);

// Ruta principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Error interno del servidor',
        ...(config.nodeEnv === 'development' && { stack: err.stack })
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
    });
});

// Iniciar servidor
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🌐  Domain Availability Checker                     ║
║                                                        ║
║   Servidor iniciado exitosamente                      ║
║   Puerto: ${PORT}                                         ║
║   Entorno: ${config.nodeEnv}                              ║
║   URL: http://localhost:${PORT}                           ║
║                                                        ║
║   Rate Limit: ${config.rateLimitDelay}ms entre consultas              ║
║   Cache TTL: ${config.cacheTTL / 3600000}h                                  ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT recibido. Cerrando servidor...');
    process.exit(0);
});
