# 🌐 Domain Availability Checker

Aplicación web para verificar la disponibilidad de nombres de dominio mediante WHOIS. Analiza múltiples dominios desde un archivo `.txt` con filtros configurables por extensión.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Características

- ✅ **Verificación en lote** - Analiza múltiples dominios simultáneamente
- 📁 **Carga de archivos** - Drag & drop de archivos `.txt`
- 🎯 **Filtros de extensión** - Configura extensiones (.com, .cl, .app, etc.)
- ⚡ **Control de velocidad** - Delay configurable para evitar bloqueos
- 💾 **Sistema de caché** - Almacena resultados por 24 horas
- 📊 **Progreso en tiempo real** - Visualización de avance con SSE
- 📥 **Exportación** - Descarga resultados en CSV o JSON
- 🎨 **Diseño moderno** - Interfaz premium con dark/light mode
- 📱 **Responsive** - Funciona en desktop, tablet y móvil

## 🚀 Inicio Rápido

### Requisitos

- Node.js 18 o superior
- npm o yarn

### Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias del backend**
```bash
cd backend
npm install
```

3. **Iniciar el servidor**
```bash
npm run dev
```

4. **Abrir en el navegador**
```
http://localhost:3000
```

## 📖 Uso

### 1. Preparar archivo de dominios

Crea un archivo `.txt` con los nombres de dominio (uno por línea):

```txt
google
microsoft
miempresa
dominiodisponible123
```

### 2. Cargar archivo

- Arrastra el archivo a la zona de drop
- O haz clic para seleccionarlo

### 3. Configurar extensiones

Selecciona las extensiones que deseas verificar:
- `.com`, `.net`, `.org`
- `.cl`, `.ar`, `.mx`
- `.app`, `.dev`, `.io`
- Y más...

### 4. Ajustar delay (opcional)

Configura el tiempo de espera entre consultas:
- **Recomendado**: 2000ms (2 segundos)
- **Mínimo**: 1000ms (1 segundo)
- **Máximo**: 5000ms (5 segundos)

> ⚠️ Un delay muy bajo puede causar bloqueos temporales de IP

### 5. Verificar

Haz clic en "Verificar Disponibilidad" y observa los resultados en tiempo real.

### 6. Exportar resultados

Descarga los resultados en:
- **CSV** - Compatible con Excel
- **JSON** - Para procesamiento programático

## 🏗️ Estructura del Proyecto

```
domain-check/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── config.js          # Configuración
│   │   ├── routes/
│   │   │   └── domain.routes.js   # Rutas API
│   │   ├── services/
│   │   │   ├── whois.service.js   # Servicio WHOIS
│   │   │   └── cache.service.js   # Sistema de caché
│   │   ├── utils/
│   │   │   ├── rateLimiter.js     # Control de velocidad
│   │   │   └── fileParser.js      # Parser de archivos
│   │   └── server.js              # Servidor Express
│   ├── package.json
│   └── .env
└── frontend/
    ├── css/
    │   └── styles.css             # Estilos
    ├── js/
    │   ├── app.js                 # Aplicación principal
    │   ├── fileHandler.js         # Manejo de archivos
    │   └── domainChecker.js       # Cliente API
    └── index.html
```

## ⚙️ Configuración

### Variables de entorno (`.env`)

```env
PORT=3000                    # Puerto del servidor
NODE_ENV=development         # Entorno
RATE_LIMIT_DELAY=2000       # Delay entre consultas (ms)
CACHE_TTL=86400000          # TTL del caché (24h en ms)
MAX_FILE_SIZE=5242880       # Tamaño máximo de archivo (5MB)
```

### Extensiones soportadas

El sistema soporta las siguientes extensiones por defecto:

- **Genéricas**: .com, .net, .org, .info, .biz
- **Latinoamérica**: .cl, .ar, .mx, .co, .pe
- **Tecnología**: .app, .dev, .io, .ai, .tech
- **Otras**: .online, .site, .website, .store, .shop

## 🔧 API Endpoints

### `POST /api/upload`
Sube y parsea un archivo .txt

**Request:**
```
Content-Type: multipart/form-data
file: archivo.txt
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "domains": ["google", "microsoft", ...]
}
```

### `POST /api/check`
Verifica disponibilidad de dominios (SSE)

**Request:**
```json
{
  "domains": ["google", "microsoft"],
  "extensions": [".com", ".cl"],
  "delay": 2000
}
```

**Response (Stream):**
```
data: {"type":"progress","current":1,"total":4,"result":{...}}
data: {"type":"complete","results":[...],"summary":{...}}
```

### `POST /api/check-single`
Verifica un solo dominio

**Request:**
```json
{
  "domain": "google.com"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "domain": "google.com",
    "available": false,
    "status": "registered",
    "responseTime": 1234,
    "fromCache": false
  }
}
```

### `GET /api/cache/stats`
Obtiene estadísticas del caché

### `DELETE /api/cache`
Limpia el caché

### `GET /api/config`
Obtiene configuración del servidor

## 🎨 Temas

La aplicación incluye dos temas:

- **Dark Mode** (por defecto) - Diseño oscuro premium
- **Light Mode** - Diseño claro y limpio

El tema se guarda automáticamente en `localStorage`.

## ⚠️ Limitaciones de WHOIS

- **Rate Limiting**: ~50-100 consultas/minuto por IP
- **Velocidad**: 1-3 segundos por consulta
- **Bloqueos**: Posible bloqueo temporal si se excede el límite
- **Formato**: Respuestas inconsistentes entre TLDs

### Solución

El sistema implementa:
- Control de velocidad configurable
- Sistema de caché (24h)
- Reintentos automáticos
- Detección inteligente de disponibilidad

## 🚀 Roadmap

- [ ] Integración con GoDaddy API (mayor velocidad)
- [ ] Soporte para más TLDs
- [ ] Historial de búsquedas
- [ ] Notificaciones cuando un dominio se libera
- [ ] API REST pública
- [ ] Dashboard de estadísticas

## 📝 Licencia

MIT License - Libre para uso personal y comercial

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Soporte

Si encuentras algún problema o tienes sugerencias, por favor abre un issue en GitHub.

---

Desarrollado con ❤️ usando Node.js, Express y WHOIS
