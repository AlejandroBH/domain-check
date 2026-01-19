import { config } from '../config/config.js';

class CacheService {
    constructor(ttl = config.cacheTTL) {
        this.cache = new Map();
        this.ttl = ttl;
    }

    /**
     * Obtiene un valor del caché
     * @param {string} key - Clave a buscar
     * @returns {any|null} - Valor almacenado o null si no existe o expiró
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        // Verificar si expiró
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Almacena un valor en el caché
     * @param {string} key - Clave
     * @param {any} value - Valor a almacenar
     * @param {number} customTTL - TTL personalizado (opcional)
     */
    set(key, value, customTTL = null) {
        const ttl = customTTL || this.ttl;
        const expiry = Date.now() + ttl;

        this.cache.set(key, {
            value,
            expiry,
            createdAt: Date.now()
        });
    }

    /**
     * Verifica si una clave existe y no ha expirado
     * @param {string} key - Clave a verificar
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Elimina una clave del caché
     * @param {string} key - Clave a eliminar
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Limpia todo el caché
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Limpia entradas expiradas
     */
    cleanExpired() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas del caché
     */
    getStats() {
        return {
            size: this.cache.size,
            ttl: this.ttl,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Instancia singleton
export const cacheService = new CacheService();

// Limpiar caché expirado cada hora
setInterval(() => {
    cacheService.cleanExpired();
}, 3600000);
