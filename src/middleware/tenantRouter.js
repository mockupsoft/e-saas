const Tenant = require('../models/Tenant');
const { extractTenantDomain, ROUTING_MODE } = require('../utils/routing');

/**
 * Tenant Routing Middleware
 * Multi-tenant routing: directory veya subdomain modunda çalışır
 * Directory mode: saas.apollo12.co/test1/dashboard -> tenant: test1
 * Subdomain mode: test1.saas.apollo12.co/dashboard -> tenant: test1
 */
const tenantRouter = async (req, res, next) => {
    try {
        // Tenant domain'ini mevcut routing moduna göre çıkar
        const tenantDomain = extractTenantDomain(req);
        
        // Tenant domain boşsa atlat
        if (!tenantDomain) {
            return next();
        }
        
        // Ana domain kontrolleri
        if (['admin', 'api', 'www', 'static', 'assets'].includes(tenantDomain)) {
            return next(); // Admin/sistem rotalarını atlat
        }

        console.log(`🔍 Tenant aranıyor - Domain: ${tenantDomain} (${ROUTING_MODE} mode)`);

        // Tenant'ı domain'e göre veritabanından bul
        // Directory mode: direkt olarak tenantDomain'i kullan (test1)
        // Subdomain mode: tam domain'i kullan (test1.saas.apollo12.co)
        const searchDomain = ROUTING_MODE === 'subdomain' ? `${tenantDomain}.saas.apollo12.co` : tenantDomain;
        const tenant = await Tenant.findByDomain(searchDomain);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'TENANT_NOT_FOUND',
                message: `Tenant bulunamadı: ${tenantDomain}`,
                timestamp: new Date().toISOString()
            });
        }

        // Tenant durumu kontrol et
        if (tenant.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'TENANT_INACTIVE',
                message: `Tenant aktif değil: ${tenantDomain}`,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`✅ Tenant bulundu - ID: ${tenant.id}, Name: ${tenant.name}, DB: ${tenant.db_name}`);

        // Request objesine tenant bilgilerini ekle
        req.tenant = tenant;
        req.tenant_id = tenant.id;
        req.db_name = tenant.db_name;
        req.tenant_domain = tenantDomain;

        next();
    } catch (error) {
        console.error('Tenant routing hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'TENANT_ROUTING_ERROR',
            message: 'Tenant routing işleminde hata oluştu',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Sadece /tenant/* rotaları için tenant middleware'ini uygula
 */
const applyTenantRouting = (app) => {
    // Sadece /tenant ile başlayan rotalara middleware uygula
    app.use('/tenant*', tenantRouter);
    console.log('🏢 Tenant routing middleware /tenant/* rotalarına uygulandı');
};

/**
 * Tenant bilgilerini manuel olarak set etmek için helper fonksiyon
 * (Test amaçlı kullanılabilir)
 */
const setTenantForRequest = (req, tenantData) => {
    req.tenant = tenantData;
    req.tenant_id = tenantData.id;
    req.tenant_name = tenantData.name;
    req.db_name = tenantData.db_name;
};

/**
 * İsteğin tenant bilgisine sahip olup olmadığını kontrol et
 */
const requireTenant = (req, res, next) => {
    if (!req.tenant) {
        return res.status(400).json({
            success: false,
            error: 'TENANT_REQUIRED',
            message: 'Bu endpoint için tenant bilgisi gerekli.',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

module.exports = tenantRouter; 