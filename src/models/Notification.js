const { executeTenantQuery } = require('../utils/db');

class Notification {
    constructor(data = {}) {
        this.id = data.id || null;
        this.tenant_id = data.tenant_id || null;
        this.user_id = data.user_id || null;
        this.title = data.title || '';
        this.message = data.message || '';
        this.type = data.type || 'info';
        this.is_read = data.is_read || false;
        this.created_at = data.created_at || null;
    }

    /**
     * Tüm bildirimleri getir (yeni olanlar önce)
     */
    static async getAllNotifications(dbName, userId = null) {
        try {
            let query = `
                SELECT id, tenant_id, user_id, title, message, type, is_read, created_at 
                FROM notifications 
            `;
            let params = [];

            // Eğer user_id belirtilmişse, o kullanıcının veya genel bildirimleri getir
            if (userId) {
                query += `WHERE user_id IS NULL OR user_id = ? `;
                params.push(userId);
            }

            query += `ORDER BY created_at DESC`;

            const rows = await executeTenantQuery(dbName, query, params);
            return rows.map(row => new Notification(row));
        } catch (error) {
            console.error('Bildirim listesi getirme hatası:', error.message);
            throw new Error('Bildirim listesi alınamadı');
        }
    }

    /**
     * Okunmamış bildirimleri getir
     */
    static async getUnreadNotifications(dbName, userId = null) {
        try {
            let query = `
                SELECT id, tenant_id, user_id, title, message, type, is_read, created_at 
                FROM notifications 
                WHERE is_read = FALSE 
            `;
            let params = [];

            // Eğer user_id belirtilmişse, o kullanıcının veya genel bildirimleri getir
            if (userId) {
                query += `AND (user_id IS NULL OR user_id = ?) `;
                params.push(userId);
            }

            query += `ORDER BY created_at DESC`;

            const rows = await executeTenantQuery(dbName, query, params);
            return rows.map(row => new Notification(row));
        } catch (error) {
            console.error('Okunmamış bildirim listesi getirme hatası:', error.message);
            throw new Error('Okunmamış bildirim listesi alınamadı');
        }
    }

    /**
     * Okunmamış bildirim sayısını getir
     */
    static async getUnreadCount(dbName, userId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count 
                FROM notifications 
                WHERE is_read = FALSE 
            `;
            let params = [];

            // Eğer user_id belirtilmişse, o kullanıcının veya genel bildirimleri say
            if (userId) {
                query += `AND (user_id IS NULL OR user_id = ?) `;
                params.push(userId);
            }

            const rows = await executeTenantQuery(dbName, query, params);
            return rows[0].count;
        } catch (error) {
            console.error('Okunmamış bildirim sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    /**
     * ID ile bildirim bul
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, tenant_id, user_id, title, message, type, is_read, created_at 
                FROM notifications 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Notification(rows[0]) : null;
        } catch (error) {
            console.error('Bildirim bulma hatası:', error.message);
            throw new Error('Bildirim bulunamadı');
        }
    }

    /**
     * Yeni bildirim oluştur
     */
    static async createNotification(dbName, notificationData) {
        try {
            const { tenant_id, user_id, title, message, type = 'info' } = notificationData;
            
            // Gerekli alanları kontrol et
            if (!tenant_id || !title || !message) {
                throw new Error('Tenant ID, başlık ve mesaj alanları zorunludur');
            }

            // Type validation
            const validTypes = ['success', 'info', 'warning', 'danger'];
            if (!validTypes.includes(type)) {
                throw new Error('Geçerli bir bildirim türü seçiniz (success, info, warning, danger)');
            }

            const query = `
                INSERT INTO notifications (tenant_id, user_id, title, message, type, is_read, created_at) 
                VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)
            `;
            const result = await executeTenantQuery(dbName, query, [
                tenant_id, 
                user_id || null, 
                title.trim(), 
                message.trim(), 
                type
            ]);
            
            // Yeni oluşturulan bildirimi geri döndür
            return await Notification.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Bildirim oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Bildirimi okundu olarak işaretle
     */
    static async markAsRead(dbName, id, userId = null) {
        try {
            let query = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;
            let params = [id];

            // Eğer userId belirtilmişse, güvenlik için kontrol ekle
            if (userId) {
                query += ` AND (user_id IS NULL OR user_id = ?)`;
                params.push(userId);
            }

            const result = await executeTenantQuery(dbName, query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Bildirim okundu işaretleme hatası:', error.message);
            throw new Error('Bildirim okundu olarak işaretlenemedi');
        }
    }

    /**
     * Tüm bildirimleri okundu olarak işaretle
     */
    static async markAllAsRead(dbName, userId = null) {
        try {
            let query = `UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE`;
            let params = [];

            // Eğer userId belirtilmişse, sadece o kullanıcının bildirimlerini işaretle
            if (userId) {
                query += ` AND (user_id IS NULL OR user_id = ?)`;
                params.push(userId);
            }

            const result = await executeTenantQuery(dbName, query, params);
            return result.affectedRows;
        } catch (error) {
            console.error('Tüm bildirimleri okundu işaretleme hatası:', error.message);
            throw new Error('Bildirimler okundu olarak işaretlenemedi');
        }
    }

    /**
     * Belirli yaştan eski bildirimleri sil (temizlik için)
     */
    static async deleteOldNotifications(dbName, daysOld = 30) {
        try {
            const query = `
                DELETE FROM notifications 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `;
            const result = await executeTenantQuery(dbName, query, [daysOld]);
            return result.affectedRows;
        } catch (error) {
            console.error('Eski bildirimleri silme hatası:', error.message);
            throw new Error('Eski bildirimler silinemedi');
        }
    }

    /**
     * Bildirim tipine göre renkli badge döndür
     */
    getBadgeColor() {
        const colors = {
            'success': 'bg-green-100 text-green-800',
            'info': 'bg-blue-100 text-blue-800',
            'warning': 'bg-yellow-100 text-yellow-800',
            'danger': 'bg-red-100 text-red-800'
        };
        return colors[this.type] || colors['info'];
    }

    /**
     * Bildirim tipine göre ikon döndür
     */
    getIcon() {
        const icons = {
            'success': '✅',
            'info': 'ℹ️',
            'warning': '⚠️',
            'danger': '❌'
        };
        return icons[this.type] || icons['info'];
    }

    /**
     * JSON formatına çevir
     */
    toJSON() {
        return {
            id: this.id,
            tenant_id: this.tenant_id,
            user_id: this.user_id,
            title: this.title,
            message: this.message,
            type: this.type,
            is_read: this.is_read,
            created_at: this.created_at,
            badge_color: this.getBadgeColor(),
            icon: this.getIcon()
        };
    }
}

module.exports = Notification; 