// Cliente API para verificación de dominios

const API_BASE = '/api';

let currentResults = [];
let eventSource = null;

/**
 * Verifica múltiples dominios
 * @param {Array<string>} domains - Dominios base
 * @param {Array<string>} extensions - Extensiones
 * @param {number} delay - Delay entre consultas
 * @param {Function} onProgress - Callback de progreso
 * @param {Function} onComplete - Callback de finalización
 * @param {Function} onError - Callback de error
 */
export async function checkDomains(domains, extensions, delay, onProgress, onComplete, onError) {
    try {
        currentResults = [];

        const response = await fetch(`${API_BASE}/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domains,
                extensions,
                delay
            })
        });

        if (!response.ok) {
            throw new Error('Error en la solicitud');
        }

        // Leer respuesta como stream (SSE)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));

                    if (data.type === 'progress') {
                        currentResults.push(data.result);
                        onProgress(data);
                    } else if (data.type === 'complete') {
                        currentResults = data.results;
                        onComplete(data);
                    } else if (data.type === 'error') {
                        onError(data.error);
                    }
                }
            }
        }

    } catch (error) {
        onError(error.message);
    }
}

/**
 * Verifica un solo dominio
 * @param {string} domain - Dominio a verificar
 * @returns {Promise<Object>}
 */
export async function checkSingleDomain(domain) {
    const response = await fetch(`${API_BASE}/check-single`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain })
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.result;
}

/**
 * Obtiene estadísticas del caché
 * @returns {Promise<Object>}
 */
export async function getCacheStats() {
    const response = await fetch(`${API_BASE}/cache/stats`);
    const data = await response.json();
    return data.stats;
}

/**
 * Limpia el caché
 * @returns {Promise<void>}
 */
export async function clearCache() {
    await fetch(`${API_BASE}/cache`, {
        method: 'DELETE'
    });
}

/**
 * Obtiene la configuración del servidor
 * @returns {Promise<Object>}
 */
export async function getConfig() {
    const response = await fetch(`${API_BASE}/config`);
    const data = await response.json();
    return data.config;
}

/**
 * Exporta resultados a CSV
 * @param {Array<Object>} results - Resultados a exportar
 */
export function exportToCSV(results = currentResults) {
    const headers = ['Dominio', 'Estado', 'Disponible', 'Tiempo (ms)', 'Desde Caché', 'Fecha'];

    const rows = results.map(r => [
        r.domain,
        r.status,
        r.available === true ? 'Sí' : r.available === false ? 'No' : 'N/A',
        r.responseTime,
        r.fromCache ? 'Sí' : 'No',
        r.checkedAt
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadFile(csv, 'domain-check-results.csv', 'text/csv');
}

/**
 * Exporta resultados a JSON
 * @param {Array<Object>} results - Resultados a exportar
 */
export function exportToJSON(results = currentResults) {
    const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalDomains: results.length,
        summary: {
            available: results.filter(r => r.available === true).length,
            registered: results.filter(r => r.available === false).length,
            errors: results.filter(r => r.status === 'error').length
        },
        results
    }, null, 2);

    downloadFile(json, 'domain-check-results.json', 'application/json');
}

/**
 * Descarga un archivo
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Obtiene los resultados actuales
 * @returns {Array<Object>}
 */
export function getCurrentResults() {
    return currentResults;
}
