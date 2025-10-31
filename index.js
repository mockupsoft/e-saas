// index.js
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

// Veritabanı bağlantısını import et
const { initializeDatabase, closeAllTenantConnections } = require('./src/utils/db');

// Tenant middleware'ini import et
const tenantRouter = require('./src/middleware/tenantRouter');

// Swagger konfigürasyonu
const { swaggerUi, swaggerSetup } = require('./src/config/swagger');

// Express app'i oluştur
const app = express();

// Port yapılandırması (.env'den al, yoksa 3000 kullan)
const PORT = process.env.PORT || 3000;

// Güvenlik middleware'leri
app.use(helmet({
            contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
                scriptSrcAttr: ["'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                connectSrc: ["'self'"],
            },
        },
}));

// CORS yapılandırması
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
        'https://saas.apollo12.co',
        'https://*.saas.apollo12.co',
        'http://localhost:3000'
    ],
    credentials: true
}));

// Body parser middleware'leri
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Session middleware for CSRF and auth
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'saas-panel-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// CSRF Token Middleware (simple implementation)
app.use((req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = Math.random().toString(36).substring(2);
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
});

// View engine ayarları
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static dosyalar için public klasörü
app.use(express.static(path.join(__dirname, 'public')));

/**
 * @swagger
 * /:
 *   get:
 *     summary: API durumu kontrolü
 *     description: SaaS E-Ticaret Platformu API'sinin durumunu kontrol eder
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API başarıyla çalışıyor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "SaaS E-Ticaret Platformu API Aktif"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "production"
 */
// Ana rota - API durumu (tenant middleware'den önce)
app.get('/', (req, res) => {
    res.json({
        message: 'SaaS E-Ticaret Platformu API Aktif',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Swagger UI rotaları
app.use('/api-docs', swaggerUi.serve, swaggerSetup);

// Route dosyalarını içeri al ve tanımla
try {
    const adminRoutes = require('./src/routes/admin');
    const tenantRoutes = require('./src/routes/tenant');
    
    // Admin rotaları (path-based değil, normal) - tenant middleware'den önce
    app.use('/admin', adminRoutes);
    
    // Tenant routing middleware'ini uygula - admin'den sonra
    app.use('/:tenant', tenantRouter, tenantRoutes);
} catch (error) {
    console.warn('⚠️  Route dosyaları henüz oluşturulmamış:', error.message);
    console.log('📝 Lütfen src/routes/admin.js ve src/routes/tenant.js dosyalarını oluşturun');
}

// 404 hata yakalayıcısı
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Sayfa bulunamadı',
        message: `${req.method} ${req.originalUrl} rotası mevcut değil`,
        timestamp: new Date().toISOString()
    });
});

// Global hata yakalayıcısı
app.use((err, req, res, next) => {
    console.error('🚨 Sunucu Hatası:', err.stack);
    res.status(500).json({
        error: 'Sunucu hatası',
        message: process.env.NODE_ENV === 'production' ? 'Bir hata oluştu' : err.message,
        timestamp: new Date().toISOString()
    });
});

// Veritabanı bağlantısını başlat ve sunucuyu çalıştır
const startServer = async () => {
    try {
        // Veritabanı bağlantısını başlat
        console.log('📊 Veritabanı bağlantısı kuruluyor...');
        const dbConnected = await initializeDatabase();
        
        if (!dbConnected) {
            console.error('❌ Veritabanı bağlantısı kurulamadı! Sunucu başlatılamıyor.');
            process.exit(1);
        }
        
        // SSL sertifika dosyalarını kontrol et
        const sslKeyPath = '/etc/letsencrypt/live/saas.apollo12.co/privkey.pem';
        const sslCertPath = '/etc/letsencrypt/live/saas.apollo12.co/fullchain.pem';
        
        // Force HTTP mode for development
        const forceHttpMode = process.env.NODE_ENV === 'development' || process.env.FORCE_HTTP === 'true';
        
        if (!forceHttpMode && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
            // HTTPS sunucuyu başlat
            const httpsOptions = {
                key: fs.readFileSync(sslKeyPath),
                cert: fs.readFileSync(sslCertPath)
            };
            
            https.createServer(httpsOptions, app).listen(443, () => {
                console.log(`
🚀 SaaS E-Ticaret Platformu Başlatıldı!
🌐 HTTPS Server: https://saas.apollo12.co
📊 Admin Panel: https://saas.apollo12.co/admin/dashboard
📋 API Dokümantasyonu: https://saas.apollo12.co/api-docs/
💾 Backup Sistemi: https://saas.apollo12.co/admin/backup
🔧 Geliştirici: Apollo12 Team
⏰ ${new Date().toLocaleString('tr-TR')}

🔐 SSL Sertifikası: Aktif ✅
🛡️ Güvenlik: Helmet, CORS, CSP Aktif
📱 Multi-Tenant: ${process.env.ROUTING_MODE || 'directory'} modu
                `);
            });

            // HTTP'den HTTPS'e yönlendirme
            http.createServer((req, res) => {
                res.writeHead(301, { 
                    "Location": "https://" + req.headers.host + req.url 
                });
                res.end();
            }).listen(80, () => {
                console.log('🔄 HTTP -> HTTPS yönlendirme aktif (Port 80)');
            });

        } else {
            // SSL sertifikası yoksa HTTP kullan
            console.log('⚠️  SSL sertifikası bulunamadı, HTTP modunda başlatılıyor...');
            
            app.listen(PORT, () => {
                console.log(`
🚀 SaaS E-Ticaret Platformu Başlatıldı! (HTTP Mode)
🌐 HTTP Server: http://localhost:${PORT}
📊 Admin Panel: http://localhost:${PORT}/admin/dashboard
📋 API Dokümantasyonu: http://localhost:${PORT}/api-docs/
💾 Backup Sistemi: http://localhost:${PORT}/admin/backup
🔧 Geliştirici: Apollo12 Team
⏰ ${new Date().toLocaleString('tr-TR')}

⚠️  SSL Sertifikası: Yok - HTTP modu
🛡️ Güvenlik: Helmet, CORS aktif
📱 Multi-Tenant: ${process.env.ROUTING_MODE || 'directory'} modu
                `);
            });
        }

    } catch (error) {
        console.error('❌ Sunucu başlatma hatası:', error.message);
        process.exit(1);
    }
};

// Sunucuyu başlat
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Sunucu kapatılıyor...');
    try {
        await closeAllTenantConnections();
        console.log('✅ Tüm veritabanı bağlantıları kapatıldı');
    } catch (error) {
        console.error('❌ Bağlantı kapatma hatası:', error.message);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n👋 Sunucu sonlandırılıyor...');
    try {
        await closeAllTenantConnections();
        console.log('✅ Tüm veritabanı bağlantıları kapatıldı');
    } catch (error) {
        console.error('❌ Bağlantı kapatma hatası:', error.message);
    }
    process.exit(0);
});

module.exports = app;
