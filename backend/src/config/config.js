import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Rate limiting
  rateLimitDelay: parseInt(process.env.RATE_LIMIT_DELAY) || 2000, // ms entre consultas
  maxConcurrent: 1, // Consultas concurrentes (mantener en 1 para WHOIS)

  // Cache
  cacheTTL: parseInt(process.env.CACHE_TTL) || 86400000, // 24 horas en ms

  // File upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB

  // TLDs soportados
  supportedTLDs: [
    '.com', '.net', '.org', '.info', '.biz',
    '.cl', '.ar', '.mx', '.co', '.pe',
    '.app', '.dev', '.io', '.ai', '.tech',
    '.online', '.site', '.website', '.store', '.shop'
  ],

  // WHOIS timeout
  whoisTimeout: 10000, // 10 segundos

  // Reintentos
  maxRetries: 2,

  // Domain provider: 'godaddy' o 'whois'
  domainProvider: process.env.DOMAIN_PROVIDER || 'godaddy',

  // GoDaddy API
  godaddy: {
    apiKey: process.env.GODADDY_API_KEY || '',
    apiSecret: process.env.GODADDY_API_SECRET || '',
    baseUrl: 'https://api.godaddy.com/v1'
  }
};
