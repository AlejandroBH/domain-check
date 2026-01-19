// Aplicación principal

import { initFileHandler, getCurrentDomains, updateStartButton } from './fileHandler.js';
import { checkDomains, exportToCSV, exportToJSON } from './domainChecker.js';

// Estado de la aplicación
let selectedExtensions = [];
let isChecking = false;

/**
 * Inicializa la aplicación
 */
function init() {
    initTheme();
    initFileHandler();
    initExtensions();
    initDelayInput();
    initCheckButton();
    initExportButtons();
}

/**
 * Inicializa el tema
 */
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

/**
 * Inicializa el selector de extensiones
 */
function initExtensions() {
    const select = document.getElementById('extensionSelect');
    const container = document.getElementById('selectedExtensions');

    select.addEventListener('change', (e) => {
        const extension = e.target.value;

        if (extension && !selectedExtensions.includes(extension)) {
            selectedExtensions.push(extension);
            renderExtensions();
            updateStartButton();
        }

        // Reset select
        e.target.value = '';
    });
}

/**
 * Renderiza las extensiones seleccionadas
 */
function renderExtensions() {
    const container = document.getElementById('selectedExtensions');

    container.innerHTML = selectedExtensions.map(ext => `
    <div class="extension-tag" data-extension="${ext}">
      ${ext}
      <button onclick="window.removeExtension('${ext}')" aria-label="Eliminar ${ext}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

/**
 * Elimina una extensión
 * @param {string} extension - Extensión a eliminar
 */
window.removeExtension = function (extension) {
    selectedExtensions = selectedExtensions.filter(ext => ext !== extension);
    renderExtensions();
    updateStartButton();
};

/**
 * Inicializa el input de delay
 */
function initDelayInput() {
    const input = document.getElementById('delayInput');
    const badge = input.parentElement.querySelector('.badge');

    input.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        badge.textContent = `${value / 1000}s`;
    });
}

/**
 * Inicializa el botón de verificación
 */
function initCheckButton() {
    const btn = document.getElementById('startCheck');

    btn.addEventListener('click', async () => {
        if (isChecking) return;

        const domains = getCurrentDomains();
        const delay = parseInt(document.getElementById('delayInput').value);

        if (domains.length === 0 || selectedExtensions.length === 0) {
            alert('Debes cargar un archivo y seleccionar al menos una extensión');
            return;
        }

        isChecking = true;
        btn.disabled = true;
        btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
      Verificando...
    `;

        // Mostrar sección de progreso
        showProgress();

        // Iniciar verificación
        await checkDomains(
            domains,
            selectedExtensions,
            delay,
            onProgress,
            onComplete,
            onError
        );
    });
}

/**
 * Muestra la sección de progreso
 */
function showProgress() {
    const section = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');

    section.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    // Reset progreso
    updateProgress(0, 0, 0);
}

/**
 * Callback de progreso
 * @param {Object} data - Datos de progreso
 */
function onProgress(data) {
    const { current, total, percentage, result } = data;

    updateProgress(current, total, percentage);
    addResultToTable(result);
}

/**
 * Actualiza la barra de progreso
 * @param {number} current - Actual
 * @param {number} total - Total
 * @param {string} percentage - Porcentaje
 */
function updateProgress(current, total, percentage) {
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressText');
    const percent = document.getElementById('progressPercent');

    bar.style.width = `${percentage}%`;
    text.textContent = `${current} / ${total} dominios verificados`;
    percent.textContent = `${percentage}%`;
}

/**
 * Agrega un resultado a la tabla
 * @param {Object} result - Resultado
 */
function addResultToTable(result) {
    const tbody = document.getElementById('resultsTableBody');
    const resultsSection = document.getElementById('resultsSection');

    // Mostrar sección de resultados
    resultsSection.classList.remove('hidden');

    const row = document.createElement('tr');
    row.innerHTML = `
    <td><strong>${result.domain}</strong></td>
    <td>
      <span class="status-badge ${result.status}">
        ${getStatusText(result)}
      </span>
    </td>
    <td>${result.responseTime}ms</td>
    <td>
      <span class="cache-indicator">
        ${result.fromCache ? '✓ Caché' : '—'}
      </span>
    </td>
  `;

    tbody.appendChild(row);

    // Scroll al final
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Obtiene el texto del estado
 * @param {Object} result - Resultado
 * @returns {string}
 */
function getStatusText(result) {
    if (result.status === 'available') return '✓ Disponible';
    if (result.status === 'registered') return '✗ Registrado';
    return '! Error';
}

/**
 * Callback de finalización
 * @param {Object} data - Datos finales
 */
function onComplete(data) {
    const { summary } = data;

    // Actualizar resumen
    document.getElementById('availableCount').textContent = summary.available;
    document.getElementById('registeredCount').textContent = summary.registered;
    document.getElementById('errorCount').textContent = summary.errors;

    // Resetear botón
    resetCheckButton();

    isChecking = false;
}

/**
 * Callback de error
 * @param {string} error - Mensaje de error
 */
function onError(error) {
    alert('Error: ' + error);
    resetCheckButton();
    isChecking = false;
}

/**
 * Resetea el botón de verificación
 */
function resetCheckButton() {
    const btn = document.getElementById('startCheck');
    btn.disabled = false;
    btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
    Verificar Disponibilidad
  `;
}

/**
 * Inicializa los botones de exportación
 */
function initExportButtons() {
    document.getElementById('exportCSV').addEventListener('click', () => {
        exportToCSV();
    });

    document.getElementById('exportJSON').addEventListener('click', () => {
        exportToJSON();
    });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
