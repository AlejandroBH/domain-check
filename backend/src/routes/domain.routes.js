import express from 'express';
import multer from 'multer';
import { config } from '../config/config.js';
import { whoisService } from '../services/whois.service.js';
import { godaddyService } from '../services/godaddy.service.js';
import { cacheService } from '../services/cache.service.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import {
    parseDomainsFile,
    combineDomainsWithExtensions,
    validateFileContent
} from '../utils/fileParser.js';

const router = express.Router();

// Seleccionar servicio de dominios basado en configuración
function getDomainService() {
    if (config.domainProvider === 'godaddy' && godaddyService.isConfigured()) {
        console.log('✓ Using GoDaddy API for domain verification');
        return godaddyService;
    }
    console.log('⚠️  Using WHOIS for domain verification (GoDaddy not configured)');
    return whoisService;
}

// Configurar multer para subida de archivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos .txt'));
        }
    }
});

/**
 * POST /api/upload
 * Sube y parsea un archivo .txt con dominios
 */
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo'
            });
        }

        const fileContent = req.file.buffer.toString('utf-8');
        const validation = validateFileContent(fileContent);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        res.json({
            success: true,
            count: validation.count,
            domains: validation.domains
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/check
 * Verifica disponibilidad de dominios
 */
router.post('/check', async (req, res) => {
    try {
        const { domains, extensions, delay } = req.body;

        if (!domains || !Array.isArray(domains) || domains.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de dominios'
            });
        }

        // Actualizar delay si se proporciona
        if (delay && typeof delay === 'number' && delay >= 1000) {
            rateLimiter.setDelay(delay);
        }

        // Combinar dominios con extensiones si se proporcionan
        let domainsToCheck = domains;
        if (extensions && Array.isArray(extensions) && extensions.length > 0) {
            domainsToCheck = combineDomainsWithExtensions(domains, extensions);
        }

        // Configurar SSE para enviar progreso en tiempo real
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const results = [];
        const total = domainsToCheck.length;

        // Obtener servicio de dominios
        const domainService = getDomainService();

        // Verificar cada dominio
        for (let i = 0; i < domainsToCheck.length; i++) {
            const domain = domainsToCheck[i];
            const result = await domainService.checkDomain(domain);
            results.push(result);

            // Enviar progreso
            res.write(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total,
                percentage: ((i + 1) / total * 100).toFixed(2),
                result
            })}\n\n`);
        }

        // Enviar resultado final
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            results,
            total,
            summary: {
                available: results.filter(r => r.available === true).length,
                registered: results.filter(r => r.available === false).length,
                errors: results.filter(r => r.status === 'error').length
            }
        })}\n\n`);

        res.end();

    } catch (error) {
        res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error.message
        })}\n\n`);
        res.end();
    }
});

/**
 * POST /api/check-single
 * Verifica un solo dominio (para pruebas rápidas)
 */
router.post('/check-single', async (req, res) => {
    try {
        const { domain } = req.body;

        if (!domain || typeof domain !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un dominio válido'
            });
        }

        const domainService = getDomainService();
        const result = await domainService.checkDomain(domain);

        res.json({
            success: true,
            result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cache/stats
 * Obtiene estadísticas del caché
 */
router.get('/cache/stats', (req, res) => {
    const stats = cacheService.getStats();
    res.json({
        success: true,
        stats
    });
});

/**
 * DELETE /api/cache
 * Limpia el caché
 */
router.delete('/cache', (req, res) => {
    cacheService.clear();
    res.json({
        success: true,
        message: 'Caché limpiado exitosamente'
    });
});

/**
 * GET /api/config
 * Obtiene configuración actual
 */
router.get('/config', (req, res) => {
    res.json({
        success: true,
        config: {
            supportedTLDs: config.supportedTLDs,
            rateLimitDelay: config.rateLimitDelay,
            maxFileSize: config.maxFileSize,
            cacheTTL: config.cacheTTL,
            domainProvider: config.domainProvider,
            godaddyConfigured: godaddyService.isConfigured()
        }
    });
});

export default router;
