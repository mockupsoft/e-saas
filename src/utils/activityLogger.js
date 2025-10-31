const { executeTenantQuery } = require('./db');

/**
 * Activity Logger Utility
 * Tenant aktivitelerini kayıt altına alan yardımcı fonksiyonlar
 */

/**
 * Aktivite logu kaydet
 * @param {Object} params - Parametreler
 * @param {string} params.tenantDb - Tenant veritabanı adı
 * @param {number} params.tenantId - Tenant ID
 * @param {number} params.userId - Kullanıcı ID (isteğe bağlı)
 * @param {string} params.userEmail - Kullanıcı email (isteğe bağlı)
 * @param {string} params.actionType - İşlem türü (create, update, delete, login, logout, view)
 * @param {string} params.targetType - Hedef tür (product, order, customer, etc.)
 * @param {number} params.targetId - Hedef ID (isteğe bağlı)
 * @param {Object} params.metadata - Ek bilgiler (isteğe bağlı)
 * @param {string} params.ipAddress - IP adresi (isteğe bağlı)
 * @param {string} params.userAgent - User agent (isteğe bağlı)
 * @returns {boolean} Başarı durumu
 */
const logActivity = async ({
    tenantDb,
    tenantId,
    userId = null,
    userEmail = null,
    actionType,
    targetType,
    targetId = null,
    metadata = null,
    ipAddress = null,
    userAgent = null
}) => {
    try {
        // Parametreleri doğrula
        if (!tenantDb || !tenantId || !actionType || !targetType) {
            console.warn('Activity log eksik parametreler:', { tenantDb, tenantId, actionType, targetType });
            return false;
        }

        // Geçerli action_type kontrolü
        const validActionTypes = ['create', 'update', 'delete', 'login', 'logout', 'view'];
        if (!validActionTypes.includes(actionType)) {
            console.warn('Geçersiz action_type:', actionType);
            return false;
        }

        // Geçerli target_type kontrolü
        const validTargetTypes = ['product', 'order', 'customer', 'coupon', 'staff', 'login', 'category', 'affiliate', 'notification'];
        if (!validTargetTypes.includes(targetType)) {
            console.warn('Geçersiz target_type:', targetType);
            return false;
        }

        // Metadata'yı JSON string'e çevir
        const metadataJson = metadata ? JSON.stringify(metadata) : null;

        // Activity log kaydını veritabanına ekle
        const insertQuery = `
            INSERT INTO activity_logs (
                tenant_id, user_id, user_email, action_type, target_type, 
                target_id, metadata, ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        await executeTenantQuery(tenantDb, insertQuery, [
            tenantId,
            userId,
            userEmail,
            actionType,
            targetType,
            targetId,
            metadataJson,
            ipAddress,
            userAgent
        ]);

        console.log(`📝 Activity logged: ${actionType} ${targetType} (tenant: ${tenantId}, user: ${userEmail || userId || 'system'})`);
        return true;

    } catch (error) {
        console.error('Activity log kaydetme hatası:', error.message);
        return false;
    }
};

/**
 * Express request'ten aktivite bilgilerini çıkar
 * @param {Object} req - Express request objesi
 * @returns {Object} Aktivite bilgileri
 */
const extractActivityInfo = (req) => {
    return {
        tenantDb: req.tenant?.db_name || req.db_name,
        tenantId: req.tenant?.id || req.tenant_id,
        userId: req.auth?.user_id || null,
        userEmail: req.auth?.user?.email || null,
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('User-Agent') || null
    };
};

/**
 * Express middleware wrapper - Kolay kullanım için
 * @param {string} actionType - İşlem türü
 * @param {string} targetType - Hedef türü
 * @param {function} getTargetId - Target ID'yi döndüren fonksiyon (isteğe bağlı)
 * @param {function} getMetadata - Metadata'yı döndüren fonksiyon (isteğe bağlı)
 * @returns {function} Middleware fonksiyonu
 */
const createLogMiddleware = (actionType, targetType, getTargetId = null, getMetadata = null) => {
    return async (req, res, next) => {
        // Orijinal response'u yakala
        const originalSend = res.send;
        
        res.send = function(data) {
            // Response'u gönder
            originalSend.call(this, data);
            
            // Sadece başarılı işlemler için log tut
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Activity bilgilerini çıkar
                const activityInfo = extractActivityInfo(req);
                
                // Target ID'yi belirle
                let targetId = null;
                if (getTargetId && typeof getTargetId === 'function') {
                    try {
                        targetId = getTargetId(req, res, data);
                    } catch (error) {
                        console.warn('Target ID çıkarma hatası:', error.message);
                    }
                }
                
                // Metadata'yı belirle
                let metadata = null;
                if (getMetadata && typeof getMetadata === 'function') {
                    try {
                        metadata = getMetadata(req, res, data);
                    } catch (error) {
                        console.warn('Metadata çıkarma hatası:', error.message);
                    }
                }
                
                // Activity log kaydet (async olarak, yanıtı engellemeyecek şekilde)
                setImmediate(() => {
                    logActivity({
                        ...activityInfo,
                        actionType,
                        targetType,
                        targetId,
                        metadata
                    });
                });
            }
        };
        
        next();
    };
};

/**
 * Aktivite loglarını listele
 * @param {string} tenantDb - Tenant veritabanı adı
 * @param {Object} filters - Filtreler
 * @param {number} filters.limit - Kayıt limiti (varsayılan: 50)
 * @param {number} filters.offset - Başlangıç offset'i (varsayılan: 0)
 * @param {string} filters.actionType - İşlem türü filtresi
 * @param {string} filters.targetType - Hedef türü filtresi
 * @param {number} filters.userId - Kullanıcı ID filtresi
 * @param {string} filters.dateFrom - Başlangıç tarihi (YYYY-MM-DD)
 * @param {string} filters.dateTo - Bitiş tarihi (YYYY-MM-DD)
 * @returns {Array} Activity logları
 */
const getActivityLogs = async (tenantDb, filters = {}) => {
    try {
        const {
            limit = 50,
            offset = 0,
            actionType = null,
            targetType = null,
            userId = null,
            dateFrom = null,
            dateTo = null
        } = filters;

        let whereConditions = [];
        let queryParams = [];

        // Filtre koşullarını oluştur
        if (actionType) {
            whereConditions.push('action_type = ?');
            queryParams.push(actionType);
        }

        if (targetType) {
            whereConditions.push('target_type = ?');
            queryParams.push(targetType);
        }

        if (userId) {
            whereConditions.push('user_id = ?');
            queryParams.push(userId);
        }

        if (dateFrom) {
            whereConditions.push('DATE(created_at) >= ?');
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            whereConditions.push('DATE(created_at) <= ?');
            queryParams.push(dateTo);
        }

        // WHERE clause'u oluştur
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Query'i oluştur
        const query = `
            SELECT 
                id, tenant_id, user_id, user_email, action_type, target_type, 
                target_id, metadata, ip_address, user_agent, created_at
            FROM activity_logs 
            ${whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, offset);

        const logs = await executeTenantQuery(tenantDb, query, queryParams);

        // Metadata JSON'ları parse et
        return logs.map(log => ({
            ...log,
            metadata: log.metadata ? JSON.parse(log.metadata) : null
        }));

    } catch (error) {
        console.error('Activity logs getirme hatası:', error.message);
        throw error;
    }
};

/**
 * Aktivite log sayısını al (sayfalama için)
 * @param {string} tenantDb - Tenant veritabanı adı
 * @param {Object} filters - Filtreler (getActivityLogs ile aynı)
 * @returns {number} Toplam kayıt sayısı
 */
const getActivityLogsCount = async (tenantDb, filters = {}) => {
    try {
        const {
            actionType = null,
            targetType = null,
            userId = null,
            dateFrom = null,
            dateTo = null
        } = filters;

        let whereConditions = [];
        let queryParams = [];

        // Filtre koşullarını oluştur (getActivityLogs ile aynı)
        if (actionType) {
            whereConditions.push('action_type = ?');
            queryParams.push(actionType);
        }

        if (targetType) {
            whereConditions.push('target_type = ?');
            queryParams.push(targetType);
        }

        if (userId) {
            whereConditions.push('user_id = ?');
            queryParams.push(userId);
        }

        if (dateFrom) {
            whereConditions.push('DATE(created_at) >= ?');
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            whereConditions.push('DATE(created_at) <= ?');
            queryParams.push(dateTo);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const query = `SELECT COUNT(*) as count FROM activity_logs ${whereClause}`;
        const result = await executeTenantQuery(tenantDb, query, queryParams);

        return result[0]?.count || 0;

    } catch (error) {
        console.error('Activity logs count hatası:', error.message);
        throw error;
    }
};

module.exports = {
    logActivity,
    extractActivityInfo,
    createLogMiddleware,
    getActivityLogs,
    getActivityLogsCount
}; 