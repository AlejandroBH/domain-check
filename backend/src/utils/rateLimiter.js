import { config } from '../config/config.js';

class RateLimiter {
    constructor(delayMs = config.rateLimitDelay) {
        this.delay = delayMs;
        this.queue = [];
        this.processing = false;
    }

    /**
     * Agrega una tarea a la cola con rate limiting
     * @param {Function} task - Función async a ejecutar
     * @returns {Promise} - Resultado de la tarea
     */
    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Procesa la cola de tareas con delay
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const { task, resolve, reject } = this.queue.shift();

            try {
                const result = await task();
                resolve(result);
            } catch (error) {
                reject(error);
            }

            // Esperar antes de la siguiente tarea
            if (this.queue.length > 0) {
                await this.sleep(this.delay);
            }
        }

        this.processing = false;
    }

    /**
     * Espera un tiempo determinado
     * @param {number} ms - Milisegundos a esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene el tamaño actual de la cola
     */
    getQueueSize() {
        return this.queue.length;
    }

    /**
     * Limpia la cola
     */
    clear() {
        this.queue = [];
    }

    /**
     * Actualiza el delay
     * @param {number} delayMs - Nuevo delay en milisegundos
     */
    setDelay(delayMs) {
        this.delay = delayMs;
    }
}

// Instancia singleton
export const rateLimiter = new RateLimiter();
