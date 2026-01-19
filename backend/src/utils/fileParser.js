/**
 * Parsea un archivo de texto con lista de dominios
 * @param {string} fileContent - Contenido del archivo
 * @returns {Array<string>} - Array de dominios válidos
 */
export function parseDomainsFile(fileContent) {
    if (!fileContent || typeof fileContent !== 'string') {
        return [];
    }

    // Dividir por líneas
    const lines = fileContent.split(/\r?\n/);

    // Procesar cada línea
    const domains = lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !line.startsWith('#')) // Ignorar comentarios
        .map(line => cleanDomainName(line))
        .filter(domain => isValidDomainName(domain));

    // Eliminar duplicados
    return [...new Set(domains)];
}

/**
 * Limpia un nombre de dominio
 * @param {string} domain - Dominio a limpiar
 * @returns {string}
 */
function cleanDomainName(domain) {
    return domain
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '') // Remover protocolo
        .replace(/^www\./, '') // Remover www
        .replace(/\/$/, '') // Remover slash final
        .split('/')[0] // Tomar solo el dominio
        .split('?')[0]; // Remover query params
}

/**
 * Valida si un nombre de dominio es válido
 * @param {string} domain - Dominio a validar
 * @returns {boolean}
 */
function isValidDomainName(domain) {
    if (!domain || domain.length === 0) {
        return false;
    }

    // Patrón básico para validar nombres de dominio
    // Permite letras, números, guiones y puntos
    const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

    // Validaciones adicionales
    const isValid =
        domainPattern.test(domain) &&
        domain.length <= 253 && // Longitud máxima de dominio
        !domain.includes('..') && // No permitir puntos consecutivos
        !domain.startsWith('-') && // No empezar con guión
        !domain.endsWith('-'); // No terminar con guión

    return isValid;
}

/**
 * Combina nombres base con extensiones
 * @param {Array<string>} baseNames - Nombres base (sin extensión)
 * @param {Array<string>} extensions - Extensiones (ej: ['.com', '.cl'])
 * @returns {Array<string>} - Array de dominios completos
 */
export function combineDomainsWithExtensions(baseNames, extensions) {
    const domains = [];

    for (const baseName of baseNames) {
        // Si el nombre ya tiene extensión, usarlo tal cual
        if (baseName.includes('.')) {
            domains.push(baseName);
        } else {
            // Combinar con cada extensión
            for (const ext of extensions) {
                const extension = ext.startsWith('.') ? ext : `.${ext}`;
                domains.push(`${baseName}${extension}`);
            }
        }
    }

    return domains;
}

/**
 * Valida el contenido de un archivo
 * @param {string} fileContent - Contenido del archivo
 * @returns {Object} - Resultado de validación
 */
export function validateFileContent(fileContent) {
    if (!fileContent || typeof fileContent !== 'string') {
        return {
            valid: false,
            error: 'El archivo está vacío o no es válido'
        };
    }

    const domains = parseDomainsFile(fileContent);

    if (domains.length === 0) {
        return {
            valid: false,
            error: 'No se encontraron nombres de dominio válidos en el archivo'
        };
    }

    return {
        valid: true,
        count: domains.length,
        domains
    };
}
