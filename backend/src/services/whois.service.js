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
        // Obtener extensión del dominio
        const extension = domain.substring(domain.lastIndexOf('.'));

        // TLDs problemáticos que requieren manejo especial
        const problematicTLDs = ['.app', '.dev', '.page', '.new'];

        try {
            // Configuración especial para TLDs problemáticos
            const whoisConfig = {
                timeout: problematicTLDs.includes(extension) ? 15000 : config.whoisTimeout,
                follow: 3
            };

            const data = await whois(domain, whoisConfig);

            // Determinar disponibilidad basado en la respuesta
            const available = this.isDomainAvailable(data, domain);

            return { available, data };

        } catch (error) {
            // Si el error indica que el dominio no existe, está disponible
            if (this.isNotFoundError(error.message)) {
                return { available: true, data: null };
            }

            // Si es un error de timeout o conexión con TLD problemático
            if (this.isTimeoutOrConnectionError(error.message) && problematicTLDs.includes(extension)) {
                console.warn(`⚠️  WHOIS timeout/connection error for ${domain} - TLD ${extension} may require special handling`);
                throw new Error(`El TLD ${extension} requiere verificación manual. WHOIS no disponible para esta extensión.`);
            }

            throw error;
        }
    }

    /**
     * Verifica si el error es de timeout o conexión
     * @param {string} errorMessage - Mensaje de error
     * @returns {boolean}
     */
    isTimeoutOrConnectionError(errorMessage) {
        const timeoutPatterns = [
            'timeout',
            'timed out',
            'econnrefused',
            'enotfound',
            'etimedout',
            'connection',
            'socket hang up',
            'network'
        ];

        const errorLower = errorMessage.toLowerCase();
        return timeoutPatterns.some(pattern => errorLower.includes(pattern));
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

        // Si la respuesta está vacía o es muy corta, probablemente está disponible
        if (dataStr.length < 50) return true;

        // IMPORTANTE: Verificar patrones de REGISTRO primero (más confiables)
        // Si encontramos evidencia clara de que está registrado, retornar false inmediatamente
        const strongRegisteredPatterns = [
            'registrar:',
            'registrar url:',
            'registrar iana id:',
            'creation date:',
            'created on:',
            'created:',
            'registered on:',
            'registered:',
            'registration date:',
            'domain status: clienttransferprohibited',
            'domain status: active',
            'status: active',
            'status: registered',
            'nameserver:',
            'name server:',
            'nserver:',
            'dns:',
            'registrant organization:',
            'registrant name:',
            'registrant:',
            'admin contact:',
            'admin email:',
            'technical contact:',
            'tech email:',
            'expiration date:',
            'expiry date:',
            'expires on:',
            'expires:',
            'updated date:',
            'last updated:',
            'registry expiry date:',
            'dnssec:',
            'whois server:'
        ];

        // Contar cuántos patrones de registro encontramos
        let registeredPatternCount = 0;
        for (const pattern of strongRegisteredPatterns) {
            if (dataStr.includes(pattern)) {
                registeredPatternCount++;
                // Si encontramos 2 o más patrones fuertes, definitivamente está registrado
                if (registeredPatternCount >= 2) {
                    console.log(`✓ Domain ${domain} is REGISTERED (found ${registeredPatternCount} registration indicators)`);
                    return false;
                }
            }
        }

        // Si encontramos al menos 1 patrón de registro, es muy probable que esté registrado
        if (registeredPatternCount >= 1) {
            console.log(`✓ Domain ${domain} is likely REGISTERED (found ${registeredPatternCount} registration indicator)`);
            return false;
        }

        // Ahora verificar patrones de disponibilidad (solo si NO encontramos patrones de registro)
        const availablePatterns = [
            'no match for',
            'no match',
            'not found',
            'no entries found',
            'no data found',
            'status: available',
            'status: free',
            'available for registration',
            'is available',
            'no se encontró',
            'not registered',
            'no existe',
            'disponible para',
            'domain not found',
            'no object found',
            'no matching record',
            'no information available',
            'domain name not known'
        ];

        for (const pattern of availablePatterns) {
            if (dataStr.includes(pattern)) {
                console.log(`✓ Domain ${domain} is AVAILABLE (matched pattern: "${pattern}")`);
                return true;
            }
        }

        // Si no encontramos patrones claros de ningún tipo, verificar la longitud de la respuesta
        // Respuestas muy cortas suelen indicar dominio disponible
        if (dataStr.length < 200) {
            console.log(`⚠️  Domain ${domain} - Short response (${dataStr.length} chars), assuming AVAILABLE`);
            return true;
        }

        // Por defecto, si no estamos seguros, asumir NO disponible (más seguro)
        console.log(`⚠️  Domain ${domain} - Uncertain status, assuming REGISTERED (safe default)`);
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
