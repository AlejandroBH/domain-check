// Manejo de archivos y drag & drop

let currentFile = null;
let currentDomains = [];

/**
 * Inicializa el manejo de archivos
 */
export function initFileHandler() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const clearFileBtn = document.getElementById('clearFile');

    // Click en drop zone abre selector de archivos
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Selección de archivo
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Limpiar archivo
    clearFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
    });
}

/**
 * Maneja el archivo seleccionado
 * @param {File} file - Archivo seleccionado
 */
async function handleFile(file) {
    // Validar tipo de archivo
    if (!file.name.endsWith('.txt')) {
        showError('Solo se permiten archivos .txt');
        return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
        showError('El archivo es demasiado grande (máximo 5MB)');
        return;
    }

    try {
        // Leer archivo
        const content = await readFileContent(file);

        // Parsear dominios
        const domains = parseDomains(content);

        if (domains.length === 0) {
            showError('No se encontraron dominios válidos en el archivo');
            return;
        }

        // Guardar datos
        currentFile = file;
        currentDomains = domains;

        // Mostrar información del archivo
        displayFileInfo(file, domains.length);

        // Habilitar botón de verificación
        updateStartButton();

    } catch (error) {
        showError('Error al leer el archivo: ' + error.message);
    }
}

/**
 * Lee el contenido de un archivo
 * @param {File} file - Archivo a leer
 * @returns {Promise<string>}
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
    });
}

/**
 * Parsea dominios del contenido del archivo
 * @param {string} content - Contenido del archivo
 * @returns {Array<string>}
 */
function parseDomains(content) {
    const lines = content.split(/\r?\n/);

    const domains = lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !line.startsWith('#'))
        .map(line => cleanDomain(line))
        .filter(domain => isValidDomain(domain));

    // Eliminar duplicados
    return [...new Set(domains)];
}

/**
 * Limpia un nombre de dominio
 * @param {string} domain - Dominio a limpiar
 * @returns {string}
 */
function cleanDomain(domain) {
    return domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('/')[0]
        .split('?')[0];
}

/**
 * Valida un nombre de dominio
 * @param {string} domain - Dominio a validar
 * @returns {boolean}
 */
function isValidDomain(domain) {
    if (!domain || domain.length === 0) return false;

    const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

    return pattern.test(domain) &&
        domain.length <= 253 &&
        !domain.includes('..') &&
        !domain.startsWith('-') &&
        !domain.endsWith('-');
}

/**
 * Muestra información del archivo cargado
 * @param {File} file - Archivo
 * @param {number} count - Cantidad de dominios
 */
function displayFileInfo(file, count) {
    const dropZone = document.getElementById('dropZone');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = fileInfo.querySelector('.file-name');
    const fileCount = fileInfo.querySelector('.file-count');

    dropZone.classList.add('hidden');
    fileInfo.classList.remove('hidden');

    fileName.textContent = file.name;
    fileCount.textContent = `${count} dominio${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
}

/**
 * Limpia el archivo cargado
 */
function clearFile() {
    currentFile = null;
    currentDomains = [];

    const dropZone = document.getElementById('dropZone');
    const fileInfo = document.getElementById('fileInfo');
    const fileInput = document.getElementById('fileInput');

    dropZone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    fileInput.value = '';

    // Deshabilitar botón de verificación
    updateStartButton();

    // Limpiar resultados
    clearResults();
}

/**
 * Actualiza el estado del botón de inicio
 */
function updateStartButton() {
    const startBtn = document.getElementById('startCheck');
    const hasFile = currentDomains.length > 0;
    const hasExtensions = getSelectedExtensions().length > 0;

    startBtn.disabled = !hasFile || !hasExtensions;
}

/**
 * Obtiene las extensiones seleccionadas
 * @returns {Array<string>}
 */
function getSelectedExtensions() {
    const container = document.getElementById('selectedExtensions');
    const tags = container.querySelectorAll('.extension-tag');
    return Array.from(tags).map(tag => tag.dataset.extension);
}

/**
 * Limpia los resultados
 */
function clearResults() {
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');

    progressSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 */
function showError(message) {
    alert(message); // Temporal, se puede mejorar con un toast
}

/**
 * Obtiene los dominios actuales
 * @returns {Array<string>}
 */
export function getCurrentDomains() {
    return currentDomains;
}

/**
 * Exporta la función de actualización del botón
 */
export { updateStartButton };
