/**
 * Super Admin Authentication Middleware
 * Sadece süper admin paneline erişim için özel middleware
 */
class AdminAuthMiddleware {
    
    /**
     * Super Admin Session Authentication
     * Geçici olarak session-based auth kullanıyoruz
     * İleri aşamada JWT veya daha güvenli yöntem eklenebilir
     */
    static requireSuperAdmin() {
        return (req, res, next) => {
            // Admin panel için basit session check
            // Production'da bu daha güvenli bir yöntemle değiştirilmeli
            
            // Header kontrolü - admin panelden gelip gelmediğini kontrol et
            const userAgent = req.get('User-Agent') || '';
            const referer = req.get('Referer') || '';
            
            // Admin panel rotalarına erişim kontrolü
            if (req.originalUrl.startsWith('/admin')) {
                // Geçici olarak tüm admin rotalarına erişime izin ver
                // Production'da burada gerçek authentication yapılmalı
                return next();
            }
            
            // Admin panel dışı erişim reddedilir
            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'Super admin access required'
            });
        };
    }
    
    /**
     * Backup işlemleri için özel yetki kontrolü
     */
    static requireBackupPermission() {
        return (req, res, next) => {
            // Backup rotalarına sadece admin panelden erişime izin ver
            const referer = req.get('Referer') || '';
            
            if (!referer.includes('/admin')) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Bu işlem sadece süper admin panelinden yapılabilir'
                });
            }
            
            // Admin erişimi varsa backup işlemlerine izin ver
            next();
        };
    }
    
    /**
     * API endpoint'ler için HTMX/AJAX request kontrolü
     */
    static requireAjaxRequest() {
        return (req, res, next) => {
            const isHtmx = req.headers['hx-request'];
            const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
            
            if (!isHtmx && !isAjax && req.method !== 'GET') {
                return res.status(400).json({
                    success: false,
                    error: 'BAD_REQUEST',
                    message: 'Bu endpoint sadece AJAX/HTMX istekleri kabul eder'
                });
            }
            
            next();
        };
    }
    
    /**
     * Rate limiting for backup operations
     */
    static backupRateLimit() {
        const attempts = new Map();
        const WINDOW_MS = 5 * 60 * 1000; // 5 dakika
        const MAX_ATTEMPTS = 3; // 5 dakikada maksimum 3 backup işlemi
        
        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            
            if (!attempts.has(clientIP)) {
                attempts.set(clientIP, []);
            }
            
            const clientAttempts = attempts.get(clientIP);
            
            // Eski attempt'leri temizle
            const validAttempts = clientAttempts.filter(time => now - time < WINDOW_MS);
            attempts.set(clientIP, validAttempts);
            
            if (validAttempts.length >= MAX_ATTEMPTS) {
                return res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Çok fazla backup isteği. 5 dakika sonra tekrar deneyin.',
                    retryAfter: Math.ceil(WINDOW_MS / 1000)
                });
            }
            
            // Yeni attempt ekle
            validAttempts.push(now);
            next();
        };
    }
}

module.exports = AdminAuthMiddleware; 