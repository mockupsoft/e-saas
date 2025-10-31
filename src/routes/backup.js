const express = require('express');
const router = express.Router();
const BackupService = require('../utils/backup');
const AdminAuthMiddleware = require('../middleware/adminAuth');

// Backup service instance
const backupService = new BackupService();

/**
 * @swagger
 * /admin/backup:
 *   get:
 *     summary: Backup yönetim sayfası
 *     description: Süper admin backup listesi ve işlemler sayfası
 *     tags: [Admin Backup]
 *     responses:
 *       200:
 *         description: Backup sayfası başarıyla yüklendi
 *       403:
 *         description: Yetki yok
 */
router.get('/', AdminAuthMiddleware.requireSuperAdmin(), async (req, res) => {
    try {
        // Mevcut backup'ları listele
        const backups = await backupService.listBackups();
        
        res.render('admin/backup', {
            title: 'Sistem Yedekleme',
            backups: backups,
            totalBackups: backups.length,
            totalSize: backups.reduce((sum, backup) => sum + (backup.size || 0), 0)
        });
    } catch (error) {
        console.error('Backup sayfası hatası:', error.message);
        res.status(500).render('admin/error', {
            title: 'Hata',
            error: 'Backup sayfası yüklenirken bir hata oluştu: ' + error.message
        });
    }
});

/**
 * @swagger
 * /admin/backup/api/create:
 *   post:
 *     summary: Yeni backup oluştur
 *     description: Tüm sistem dosyaları ve veritabanlarının backup'ını al
 *     tags: [Admin Backup]
 *     responses:
 *       200:
 *         description: Backup başarıyla oluşturuldu
 *       400:
 *         description: Hatalı istek
 *       403:
 *         description: Yetki yok
 *       429:
 *         description: Rate limit aşıldı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/api/create', [
    AdminAuthMiddleware.requireSuperAdmin(),
    AdminAuthMiddleware.requireAjaxRequest(),
    AdminAuthMiddleware.backupRateLimit()
], async (req, res) => {
    try {
        const { name } = req.body;
        console.log('🚀 Backup işlemi başlatılıyor...', name ? `(${name})` : '');
        
        // Backup oluştur (async operation)
        const result = await backupService.createBackup(name);
        
        res.json({
            success: true,
            message: 'Backup başarıyla oluşturuldu',
            data: {
                backupId: result.backupId,
                timestamp: result.info.created,
                path: result.path
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Backup oluşturma hatası:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'BACKUP_FAILED',
            message: 'Backup oluşturulamadı: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /admin/backup/api/restore/{backupId}:
 *   post:
 *     summary: Backup'tan geri yükle
 *     description: Seçilen backup'tan sistem geri yükleme
 *     tags: [Admin Backup]
 *     parameters:
 *       - in: path
 *         name: backupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Geri yüklenecek backup ID
 *     responses:
 *       200:
 *         description: Restore başarıyla tamamlandı
 *       400:
 *         description: Hatalı backup ID
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Backup bulunamadı
 *       500:
 *         description: Restore hatası
 */
router.post('/api/restore/:backupId', [
    AdminAuthMiddleware.requireSuperAdmin(),
    AdminAuthMiddleware.requireAjaxRequest(),
    AdminAuthMiddleware.backupRateLimit()
], async (req, res) => {
    try {
        const { backupId } = req.params;
        
        if (!backupId) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_BACKUP_ID',
                message: 'Backup ID gerekli',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`🔄 Restore işlemi başlatılıyor: ${backupId}`);
        
        // Restore işlemi (async operation)
        const result = await backupService.restoreBackup(backupId);
        
        res.json({
            success: true,
            message: 'Sistem başarıyla geri yüklendi',
            data: {
                backupId: result.backupId,
                restoredInfo: result.restoredInfo
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Restore hatası:', error.message);
        
        let statusCode = 500;
        let errorCode = 'RESTORE_FAILED';
        
        if (error.message.includes('not found')) {
            statusCode = 404;
            errorCode = 'BACKUP_NOT_FOUND';
        } else if (error.message.includes('corrupted')) {
            statusCode = 400;
            errorCode = 'BACKUP_CORRUPTED';
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorCode,
            message: 'Geri yükleme başarısız: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /admin/backup/api/list:
 *   get:
 *     summary: Backup listesi
 *     description: Mevcut tüm backup'ları listele
 *     tags: [Admin Backup]
 *     responses:
 *       200:
 *         description: Backup listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/api/list', AdminAuthMiddleware.requireSuperAdmin(), async (req, res) => {
    try {
        const backups = await backupService.listBackups();
        
        res.json({
            success: true,
            data: backups,
            count: backups.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Backup listesi hatası:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'LIST_FAILED',
            message: 'Backup listesi alınamadı: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /admin/backup/api/rename/{backupId}:
 *   patch:
 *     summary: Backup adını düzenle
 *     description: Backup'ın adını güncelle
 *     tags: [Admin Backup]
 *     parameters:
 *       - in: path
 *         name: backupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Güncellenecek backup ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Yeni backup adı
 *     responses:
 *       200:
 *         description: Backup adı başarıyla güncellendi
 *       400:
 *         description: Hatalı istek
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Backup bulunamadı
 *       500:
 *         description: Güncelleme hatası
 */
router.patch('/api/rename/:backupId', [
    AdminAuthMiddleware.requireSuperAdmin(),
    AdminAuthMiddleware.requireAjaxRequest()
], async (req, res) => {
    try {
        const { backupId } = req.params;
        const { name } = req.body;
        
        console.log(`🏷️ Backup adı güncelleniyor: ${backupId} -> ${name}`);
        
        const result = await backupService.renameBackup(backupId, name);
        
        if (result) {
            res.json({
                success: true,
                message: 'Backup adı başarıyla güncellendi',
                data: { backupId: result.newBackupId, name },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'BACKUP_NOT_FOUND',
                message: 'Backup bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Backup adı güncelleme hatası:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'RENAME_FAILED',
            message: 'Backup adı güncellenemedi: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /admin/backup/api/delete/{backupId}:
 *   delete:
 *     summary: Backup sil
 *     description: Seçilen backup'ı sil
 *     tags: [Admin Backup]
 *     parameters:
 *       - in: path
 *         name: backupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek backup ID
 *     responses:
 *       200:
 *         description: Backup başarıyla silindi
 *       400:
 *         description: Hatalı backup ID
 *       403:
 *         description: Yetki yok
 *       404:
 *         description: Backup bulunamadı
 *       500:
 *         description: Silme hatası
 */
router.delete('/api/delete/:backupId', [
    AdminAuthMiddleware.requireSuperAdmin(),
    AdminAuthMiddleware.requireAjaxRequest()
], async (req, res) => {
    try {
        const { backupId } = req.params;
        
        if (!backupId) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_BACKUP_ID',
                message: 'Backup ID gerekli',
                timestamp: new Date().toISOString()
            });
        }

        const deleted = await backupService.deleteBackup(backupId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Backup başarıyla silindi',
                data: { backupId },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'BACKUP_NOT_FOUND',
                message: 'Backup bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Backup silme hatası:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'DELETE_FAILED',
            message: 'Backup silinemedi: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /admin/backup/api/logs/{operation}:
 *   get:
 *     summary: Backup logları
 *     description: Backup/restore işlem loglarını görüntüle
 *     tags: [Admin Backup]
 *     parameters:
 *       - in: path
 *         name: operation
 *         required: true
 *         schema:
 *           type: string
 *           enum: [backup, restore]
 *         description: Log türü
 *       - in: query
 *         name: lines
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Gösterilecek satır sayısı
 *     responses:
 *       200:
 *         description: Log verileri
 *       400:
 *         description: Hatalı parametre
 *       403:
 *         description: Yetki yok
 */
router.get('/api/logs/:operation', AdminAuthMiddleware.requireSuperAdmin(), async (req, res) => {
    try {
        const { operation } = req.params;
        const lines = parseInt(req.query.lines) || 100;
        
        if (!['backup', 'restore'].includes(operation)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_OPERATION',
                message: 'Geçerli operasyon türleri: backup, restore',
                timestamp: new Date().toISOString()
            });
        }

        const logs = await backupService.getBackupLogs(operation, lines);
        
        res.json({
            success: true,
            data: {
                operation: operation,
                lines: logs,
                count: logs.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Log okuma hatası:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'LOG_READ_FAILED',
            message: 'Loglar okunamadı: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Backup status endpoint - işlem durumunu kontrol etmek için
 */
router.get('/api/status', AdminAuthMiddleware.requireSuperAdmin(), async (req, res) => {
    try {
        const backups = await backupService.listBackups();
        const lastBackup = backups[0] || null;
        
        res.json({
            success: true,
            data: {
                totalBackups: backups.length,
                lastBackup: lastBackup,
                systemStatus: 'operational'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'STATUS_CHECK_FAILED',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router; 