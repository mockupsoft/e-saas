/**
 * Routing Utilities
 * Directory-based ve subdomain-based tenant routing arasında geçiş yapmak için utilities
 */

/**
 * Mevcut routing modu
 * 'directory' = saas.apollo12.co/test1/products
 * 'subdomain' = test1.saas.apollo12.co/products
 */
const ROUTING_MODE = process.env.ROUTING_MODE || 'directory';

/**
 * Tenant domain'ini URL'ye çevir
 * @param {string} tenantDomain - Tenant domain (ör: test1)
 * @param {string} path - İçerik path'i (ör: /products)
 * @returns {string} Tam URL
 */
const generateTenantUrl = (tenantDomain, path = '') => {
    const baseDomain = process.env.BASE_DOMAIN || 'saas.apollo12.co';
    const port = process.env.PORT || 3000;
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    if (ROUTING_MODE === 'subdomain') {
        // Subdomain modunda: test1.saas.apollo12.co/products
        return `${protocol}://${tenantDomain}.${baseDomain}:${port}${path}`;
    } else {
        // Directory modunda: saas.apollo12.co/test1/products
        return `${protocol}://${baseDomain}:${port}/${tenantDomain}${path}`;
    }
};

/**
 * Request'ten tenant domain'ini çıkar
 * @param {object} req - Express request objesi
 * @returns {string|null} Tenant domain veya null
 */
const extractTenantDomain = (req) => {
    if (ROUTING_MODE === 'subdomain') {
        // Subdomain modunda: Host header'dan al
        const host = req.get('Host') || req.hostname || '';
        const domain = host.split(':')[0];
        const parts = domain.split('.');
        
        // test1.saas.apollo12.co -> test1
        if (parts.length >= 3) {
            return parts[0];
        }
        return null;
    } else {
        // Directory modunda: Route parameter'dan al
        return req.params.tenant || null;
    }
};

/**
 * URL'yi tenant domain ve path'e ayır
 * @param {string} url - Tam URL
 * @returns {object} {tenantDomain, path}
 */
const parseUrl = (url) => {
    try {
        const urlObj = new URL(url);
        
        if (ROUTING_MODE === 'subdomain') {
            const parts = urlObj.hostname.split('.');
            const tenantDomain = parts.length >= 3 ? parts[0] : null;
            return {
                tenantDomain,
                path: urlObj.pathname
            };
        } else {
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            const tenantDomain = pathParts.length > 0 ? pathParts[0] : null;
            const path = pathParts.length > 1 ? '/' + pathParts.slice(1).join('/') : '/';
            return {
                tenantDomain,
                path
            };
        }
    } catch (error) {
        return { tenantDomain: null, path: '/' };
    }
};

/**
 * Routing modunu değiştir (restart gerektirir)
 * @param {string} newMode - 'directory' veya 'subdomain'
 */
const setRoutingMode = (newMode) => {
    if (!['directory', 'subdomain'].includes(newMode)) {
        throw new Error('Geçersiz routing modu. "directory" veya "subdomain" olmalı.');
    }
    
    process.env.ROUTING_MODE = newMode;
    console.log(`🔄 Routing modu değiştirildi: ${newMode}`);
    console.log('⚠️  Değişikliğin etkili olması için sunucuyu yeniden başlatın.');
};

/**
 * Mevcut routing modu hakkında bilgi al
 * @returns {object} Routing modu bilgileri
 */
const getRoutingInfo = () => {
    return {
        mode: ROUTING_MODE,
        description: ROUTING_MODE === 'subdomain' 
            ? 'Subdomain-based routing (test1.saas.apollo12.co)'
            : 'Directory-based routing (saas.apollo12.co/test1)',
        example_url: generateTenantUrl('test1', '/products'),
        middleware_pattern: ROUTING_MODE === 'subdomain' ? 'Host header parsing' : '/:tenant route parameters'
    };
};

module.exports = {
    ROUTING_MODE,
    generateTenantUrl,
    extractTenantDomain,
    parseUrl,
    setRoutingMode,
    getRoutingInfo
}; 