const Notification = require('../models/Notification');
const { logActivity, extractActivityInfo } = require('../utils/activityLogger');

class NotificationController {
    /**
     * GET /tenant/api/notifications - Okunmamış bildirimleri getir
     */
    static async getUnreadNotifications(req, res) {
        try {
            const tenant = req.tenant;
            const userId = req.auth?.user?.id || null; // Auth middleware'den kullanıcı ID'si

            if (!tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Tenant bilgileri bulunamadı'
                });
            }

            // Okunmamış bildirimleri ve sayısını getir
            const [notifications, unreadCount] = await Promise.all([
                Notification.getUnreadNotifications(tenant.db_name, userId),
                Notification.getUnreadCount(tenant.db_name, userId)
            ]);

            res.json({
                success: true,
                message: 'Okunmamış bildirimler başarıyla getirildi',
                data: {
                    notifications: notifications.map(n => n.toJSON()),
                    unread_count: unreadCount
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Okunmamış bildirimler getirme hatası:', error.message);
            res.status(500).json({
                success: false,
                error: 'NOTIFICATION_FETCH_ERROR',
                message: 'Bildirimler getirilemedi',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * GET /tenant/api/notifications/all - Tüm bildirimleri getir (sayfalı)
     */
    static async getAllNotifications(req, res) {
        try {
            const tenant = req.tenant;
            const userId = req.auth?.user?.id || null;
            const { page = 1, limit = 20 } = req.query;

            if (!tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Tenant bilgileri bulunamadı'
                });
            }

            // Tüm bildirimleri getir
            const notifications = await Notification.getAllNotifications(tenant.db_name, userId);
            const unreadCount = await Notification.getUnreadCount(tenant.db_name, userId);

            // Sayfalama
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const paginatedNotifications = notifications.slice(offset, offset + parseInt(limit));

            res.json({
                success: true,
                message: 'Bildirimler başarıyla getirildi',
                data: {
                    notifications: paginatedNotifications.map(n => n.toJSON()),
                    unread_count: unreadCount,
                    pagination: {
                        current_page: parseInt(page),
                        per_page: parseInt(limit),
                        total: notifications.length,
                        total_pages: Math.ceil(notifications.length / parseInt(limit))
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Tüm bildirimler getirme hatası:', error.message);
            res.status(500).json({
                success: false,
                error: 'NOTIFICATION_FETCH_ERROR',
                message: 'Bildirimler getirilemedi',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * PUT /tenant/api/notifications/:id/read - Bildirimi okundu olarak işaretle
     */
    static async markAsRead(req, res) {
        try {
            const tenant = req.tenant;
            const userId = req.auth?.user?.id || null;
            const { id } = req.params;

            if (!tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Tenant bilgileri bulunamadı'
                });
            }

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_ID',
                    message: 'Geçerli bir bildirim ID\'si gerekli'
                });
            }

            // Bildirimi okundu olarak işaretle
            const updated = await Notification.markAsRead(tenant.db_name, parseInt(id), userId);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'NOTIFICATION_NOT_FOUND',
                    message: 'Bildirim bulunamadı veya erişim reddedildi'
                });
            }

            // Güncellenmiş okunmamış sayıyı getir
            const unreadCount = await Notification.getUnreadCount(tenant.db_name, userId);

            // Activity log
            const activityInfo = extractActivityInfo(req);
            await logActivity({
                ...activityInfo,
                actionType: 'update',
                targetType: 'notification',
                targetId: parseInt(id),
                metadata: { action: 'mark_as_read' }
            });

            res.json({
                success: true,
                message: 'Bildirim okundu olarak işaretlendi',
                data: {
                    notification_id: parseInt(id),
                    unread_count: unreadCount
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Bildirim okundu işaretleme hatası:', error.message);
            res.status(500).json({
                success: false,
                error: 'NOTIFICATION_UPDATE_ERROR',
                message: 'Bildirim güncellenemedi',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * PUT /tenant/api/notifications/mark-all-read - Tüm bildirimleri okundu işaretle
     */
    static async markAllAsRead(req, res) {
        try {
            const tenant = req.tenant;
            const userId = req.auth?.user?.id || null;

            if (!tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Tenant bilgileri bulunamadı'
                });
            }

            // Tüm bildirimleri okundu olarak işaretle
            const updatedCount = await Notification.markAllAsRead(tenant.db_name, userId);

            // Activity log
            const activityInfo = extractActivityInfo(req);
            await logActivity({
                ...activityInfo,
                actionType: 'update',
                targetType: 'notification',
                metadata: { 
                    action: 'mark_all_as_read',
                    affected_count: updatedCount
                }
            });

            res.json({
                success: true,
                message: `${updatedCount} bildirim okundu olarak işaretlendi`,
                data: {
                    updated_count: updatedCount,
                    unread_count: 0
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Tüm bildirimleri okundu işaretleme hatası:', error.message);
            res.status(500).json({
                success: false,
                error: 'NOTIFICATION_UPDATE_ERROR',
                message: 'Bildirimler güncellenemedi',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * POST /tenant/api/notifications - Yeni bildirim oluştur (sadece admin/manager)
     */
    static async createNotification(req, res) {
        try {
            const tenant = req.tenant;
            const { title, message, type = 'info', user_id = null } = req.body;

            if (!tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Tenant bilgileri bulunamadı'
                });
            }

            // Validation
            if (!title || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Başlık ve mesaj alanları zorunludur'
                });
            }

            const validTypes = ['success', 'info', 'warning', 'danger'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_TYPE',
                    message: 'Geçerli bir bildirim türü seçiniz (success, info, warning, danger)'
                });
            }

            // Yeni bildirim oluştur
            const notification = await Notification.createNotification(tenant.db_name, {
                tenant_id: tenant.id,
                user_id: user_id,
                title: title.trim(),
                message: message.trim(),
                type: type
            });

            // Activity log
            const activityInfo = extractActivityInfo(req);
            await logActivity({
                ...activityInfo,
                actionType: 'create',
                targetType: 'notification',
                targetId: notification.id,
                metadata: { 
                    title: notification.title,
                    type: notification.type,
                    target_user_id: user_id
                }
            });

            res.status(201).json({
                success: true,
                message: 'Bildirim başarıyla oluşturuldu',
                data: notification.toJSON(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Bildirim oluşturma hatası:', error.message);
            res.status(500).json({
                success: false,
                error: 'NOTIFICATION_CREATE_ERROR',
                message: 'Bildirim oluşturulamadı: ' + error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * GET /tenant/api/notifications/count - Okunmamış bildirim sayısını getir
     */
    static async getUnreadCount(req, res) {
        try {
            const tenant = req.tenant;
            const userId = req.auth?.user?.id || null;

            if (!tenant) {
                return res.status(400).json({
                    success: false,
                    error: 'TENANT_REQUIRED',
                    message: 'Tenant bilgileri bulunamadı'
                });
            }

            const unreadCount = await Notification.getUnreadCount(tenant.db_name, userId);

            res.json({
                success: true,
                data: {
                    unread_count: unreadCount
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Okunmamış bildirim sayısı getirme hatası:', error.message);
            res.status(500).json({
                success: false,
                error: 'NOTIFICATION_COUNT_ERROR',
                message: 'Bildirim sayısı getirilemedi',
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = NotificationController; 