import axios from 'axios';
import { config } from '../config/config.js';
import { cacheService } from './cache.service.js';

class GoDaddyService {
    constructor() {
        this.baseUrl = 'https://api.godaddy.com/v1';
        this.headers = {
            'Authorization': `sso-key ${config.godaddy.apiKey}:${config.godaddy.apiSecret}`,
            'Content-Type': 'application/json'
        };
    }

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
            // Llamar a GoDaddy API - Endpoint correcto
            const response = await axios.get(
                `${this.baseUrl}/domains/available?domain=${encodeURIComponent(normalizedDomain)}`,
                {
                    headers: this.headers,
                    timeout: 10000
                }
            );

            const responseTime = Date.now() - startTime;
            const data = response.data;

            const domainResult = {
                domain: normalizedDomain,
                available: data.available,
                status: data.available ? 'available' : 'registered',
                price: data.price || null,
                currency: data.currency || 'USD',
                period: data.period || 1,
                responseTime,
                fromCache: false,
                provider: 'godaddy',
                checkedAt: new Date().toISOString()
            };

            // Guardar en caché
            cacheService.set(normalizedDomain, domainResult);

            console.log(`✓ GoDaddy: ${normalizedDomain} is ${data.available ? 'AVAILABLE' : 'REGISTERED'} (${responseTime}ms)`);

            return domainResult;

        } catch (error) {
            const responseTime = Date.now() - startTime;

            // Logging detallado del error
            console.error(`✗ GoDaddy API error for ${normalizedDomain}:`);
            console.error(`   Status: ${error.response?.status || 'N/A'}`);
            console.error(`   Message: ${error.response?.data?.message || error.message}`);
            console.error(`   Full error:`, JSON.stringify(error.response?.data, null, 2));

            // Manejar errores específicos de GoDaddy
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                const message = errorData?.message || errorData?.error || error.message;

                // 400: Bad Request - Usualmente API keys de OTE en producción
                if (status === 400) {
                    console.error(`⚠️  Error 400: Verifica que estés usando API keys de PRODUCCIÓN, no de OTE/Testing`);
                    return {
                        domain: normalizedDomain,
                        available: null,
                        status: 'error',
                        error: 'API keys inválidas (¿estás usando keys de OTE en lugar de Production?)',
                        responseTime,
                        fromCache: false,
                        provider: 'godaddy',
                        checkedAt: new Date().toISOString()
                    };
                }

                // 401: API key inválida
                if (status === 401) {
                    console.error(`⚠️  Error 401: API Key o Secret incorrectos`);
                    return {
                        domain: normalizedDomain,
                        available: null,
                        status: 'error',
                        error: 'API Key de GoDaddy inválida. Verifica tu configuración.',
                        responseTime,
                        fromCache: false,
                        provider: 'godaddy',
                        checkedAt: new Date().toISOString()
                    };
                }

                // 429: Rate limit excedido
                if (status === 429) {
                    console.error(`⚠️  Error 429: Rate limit excedido`);
                    return {
                        domain: normalizedDomain,
                        available: null,
                        status: 'error',
                        error: 'Límite de requests excedido. Espera un momento.',
                        responseTime,
                        fromCache: false,
                        provider: 'godaddy',
                        checkedAt: new Date().toISOString()
                    };
                }

                // 422: Dominio inválido
                if (status === 422) {
                    return {
                        domain: normalizedDomain,
                        available: null,
                        status: 'error',
                        error: 'Formato de dominio inválido',
                        responseTime,
                        fromCache: false,
                        provider: 'godaddy',
                        checkedAt: new Date().toISOString()
                    };
                }
            }

            // Error genérico
            return {
                domain: normalizedDomain,
                available: null,
                status: 'error',
                error: error.message || 'Error desconocido',
                responseTime,
                fromCache: false,
                provider: 'godaddy',
                checkedAt: new Date().toISOString()
            };
        }
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

            // Pequeño delay para respetar rate limits (opcional)
            if (i < domains.length - 1) {
                await this.sleep(100); // 100ms entre requests
            }
        }

        return results;
    }

    /**
     * Obtiene información de precios para un dominio
     * @param {string} domain - Dominio a consultar
     * @returns {Promise<Object>}
     */
    async getDomainPrice(domain) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/domains/available`,
                {
                    params: {
                        domain: domain.toLowerCase().trim(),
                        checkType: 'FULL'
                    },
                    headers: this.headers,
                    timeout: 10000
                }
            );

            return {
                domain: domain,
                price: response.data.price,
                currency: response.data.currency,
                period: response.data.period
            };

        } catch (error) {
            console.error(`Error getting price for ${domain}:`, error.message);
            return null;
        }
    }

    /**
     * Verifica si las credenciales de GoDaddy están configuradas
     * @returns {boolean}
     */
    isConfigured() {
        return !!(config.godaddy.apiKey && config.godaddy.apiSecret);
    }

    /**
     * Espera un tiempo determinado
     * @param {number} ms - Milisegundos a esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const godaddyService = new GoDaddyService();
