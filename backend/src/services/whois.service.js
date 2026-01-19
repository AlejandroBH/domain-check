import whois from 'whois-json';
import { config } from '../config/config.js';
import { cacheService } from './cache.service.js';
import { rateLimiter } from '../utils/rateLimiter.js';

class WhoisService {
    /**
     * Verifica la disponibilidad de un dominio
     * @param {string} domain - Dominio a verificar (ej: google.com)
     * @returns {Promise<Object>} - Resultado de la verificación
     */
    async checkDomain(domain) {
        const startTime = Date.now();

        // Normalizar dominio
        const normalizedDomain = domain.toLowerCase().trim();

        // Verificar caché
        const cached = cacheService.get(normalizedDomain);
        if (cached) {
            return {
                ...cached,
                fromCache: true
            };
        }

        try {
            // Ejecutar consulta WHOIS con rate limiting
            const result = await rateLimiter.add(async () => {
                return await this.performWhoisLookup(normalizedDomain);
            });

            const responseTime = Date.now() - startTime;

            const domainResult = {
                domain: normalizedDomain,
                available: result.available,
                status: result.available ? 'available' : 'registered',
                responseTime,
                fromCache: false,
                checkedAt: new Date().toISOString()
            };

            // Guardar en caché
            cacheService.set(normalizedDomain, domainResult);

            return domainResult;

        } catch (error) {
            const responseTime = Date.now() - startTime;

            return {
                domain: normalizedDomain,
                available: null,
                status: 'error',
                error: error.message,
                responseTime,
                fromCache: false,
                checkedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Realiza la consulta WHOIS
     * @param {string} domain - Dominio a consultar
     * @returns {Promise<Object>}
     */
    async performWhoisLookup(domain) {
        try {
            const data = await whois(domain, {
                timeout: config.whoisTimeout,
                follow: 3
            });

            // Determinar disponibilidad basado en la respuesta
            const available = this.isDomainAvailable(data, domain);

            return { available, data };

        } catch (error) {
            // Si el error indica que el dominio no existe, está disponible
            if (this.isNotFoundError(error.message)) {
                return { available: true, data: null };
            }
            throw error;
        }
    }

    /**
     * Determina si un dominio está disponible basado en la respuesta WHOIS
     * @param {Object} data - Datos WHOIS
     * @param {string} domain - Dominio consultado
     * @returns {boolean}
     */
    isDomainAvailable(data, domain) {
        if (!data) return true;

        // Convertir a string para análisis
        const dataStr = JSON.stringify(data).toLowerCase();

        // Patrones que indican dominio NO disponible (registrado)
        const registeredPatterns = [
            'registrar:',
            'creation date:',
            'created:',
            'registered:',
            'domain status: active',
            'status: active',
            'nameserver',
            'name server'
        ];

        // Patrones que indican dominio disponible
        const availablePatterns = [
            'no match',
            'not found',
            'no entries found',
            'no data found',
            'available',
            'free',
            'no se encontró'
        ];

        // Verificar patrones de disponibilidad primero
        for (const pattern of availablePatterns) {
            if (dataStr.includes(pattern)) {
                return true;
            }
        }

        // Verificar patrones de registro
        for (const pattern of registeredPatterns) {
            if (dataStr.includes(pattern)) {
                return false;
            }
        }

        // Si no hay información clara, asumir no disponible por seguridad
        return false;
    }

    /**
     * Verifica si el error indica que el dominio no fue encontrado
     * @param {string} errorMessage - Mensaje de error
     * @returns {boolean}
     */
    isNotFoundError(errorMessage) {
        const notFoundPatterns = [
            'no match',
            'not found',
            'no entries found',
            'no data found',
            'no se encontró',
            'domain not found'
        ];

        const errorLower = errorMessage.toLowerCase();
        return notFoundPatterns.some(pattern => errorLower.includes(pattern));
    }

    /**
     * Verifica múltiples dominios
     * @param {Array<string>} domains - Array de dominios
     * @param {Function} onProgress - Callback de progreso (opcional)
     * @returns {Promise<Array>}
     */
    async checkMultipleDomains(domains, onProgress = null) {
        const results = [];
        const total = domains.length;

        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            const result = await this.checkDomain(domain);
            results.push(result);

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total,
                    percentage: ((i + 1) / total * 100).toFixed(2),
                    domain,
                    result
                });
            }
        }

        return results;
    }
}

export const whoisService = new WhoisService();
