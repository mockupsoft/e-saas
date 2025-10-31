const express = require('express');
const router = express.Router();
const StaffUser = require('../models/StaffUser');
const AuthMiddleware = require('../middleware/auth');

// ===============================
// 👥 STAFF YÖNETİMİ API'LERİ
// ===============================

/**
 * GET /tenant/api/staff - Tüm personelleri listele
 * Sadece admin ve manager erişebilir
 */
router.get('/api/staff', 
    AuthMiddleware.authenticate(),
    AuthMiddleware.checkPermission('read', 'staff'),
    async (req, res) => {
        try {
            const tenantDb = req.auth.tenant_db;
            
            // Personel listesini getir
            const staff = await StaffUser.getAll(tenantDb);
            
            // İstatistikleri hesapla
            const stats = {
                total: staff.length,
                active: staff.filter(s => s.status === 'active').length,
                disabled: staff.filter(s => s.status === 'disabled').length,
                admin: staff.filter(s => s.role === 'admin').length,
                manager: staff.filter(s => s.role === 'manager').length,
                viewer: staff.filter(s => s.role === 'viewer').length
            };

            res.json({
                success: true,
                message: 'Staff list retrieved successfully',
                data: {
                    staff: staff.map(s => s.toJSON()),
                    stats: stats
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Staff list error:', error.message);
            res.status(500).json({
                success: false,
                error: 'STAFF_LIST_ERROR',
                message: 'Failed to retrieve staff list',
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * GET /tenant/api/staff/:id - Personel bilgisi getir
 * Sadece admin erişebilir veya kendi bilgilerini görüntüleyebilir
 */
router.get('/api/staff/:id',
    AuthMiddleware.authenticate(),
    async (req, res) => {
        try {
            const tenantDb = req.auth.tenant_db;
            const staffId = parseInt(req.params.id);
            const currentUserId = req.auth.user_id;
            const currentUserRole = req.auth.role;

            // Admin olmayan kullanıcılar sadece kendi bilgilerini görebilir
            if (currentUserRole !== 'admin' && staffId !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'You can only view your own profile'
                });
            }

            const staffUser = await StaffUser.findById(tenantDb, staffId);

            if (!staffUser) {
                return res.status(404).json({
                    success: false,
                    error: 'STAFF_NOT_FOUND',
                    message: 'Staff user not found'
                });
            }

            res.json({
                success: true,
                message: 'Staff user retrieved successfully',
                data: staffUser.toJSON(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Staff get error:', error.message);
            res.status(500).json({
                success: false,
                error: 'STAFF_GET_ERROR',
                message: 'Failed to retrieve staff user',
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * POST /tenant/api/staff - Yeni personel oluştur
 * Sadece admin erişebilir
 */
router.post('/api/staff',
    AuthMiddleware.authenticate(),
    AuthMiddleware.authorize(['admin']),
    async (req, res) => {
        try {
            const tenantDb = req.auth.tenant_db;
            const { name, email, password, role, status } = req.body;

            // Validation
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Name, email and password are required'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Password must be at least 6 characters long'
                });
            }

            // Personel oluştur
            const newStaff = await StaffUser.create(tenantDb, {
                name,
                email,
                password,
                role: role || 'viewer',
                status: status || 'active'
            });

            res.status(201).json({
                success: true,
                message: 'Staff user created successfully',
                data: newStaff.toJSON(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Staff create error:', error.message);
            
            let statusCode = 500;
            let errorCode = 'STAFF_CREATE_ERROR';
            
            if (error.message.includes('Email already exists')) {
                statusCode = 400;
                errorCode = 'EMAIL_EXISTS';
            } else if (error.message.includes('Invalid')) {
                statusCode = 400;
                errorCode = 'VALIDATION_ERROR';
            }

            res.status(statusCode).json({
                success: false,
                error: errorCode,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * PUT /tenant/api/staff/:id - Personel bilgilerini güncelle (şifre hariç)
 * Admin tüm personeli, diğerleri sadece kendilerini güncelleyebilir
 */
router.put('/api/staff/:id',
    AuthMiddleware.authenticate(),
    async (req, res) => {
        try {
            const tenantDb = req.auth.tenant_db;
            const staffId = parseInt(req.params.id);
            const currentUserId = req.auth.user_id;
            const currentUserRole = req.auth.role;
            const { name, email, role, status } = req.body;

            // Admin olmayan kullanıcılar sadece kendi bilgilerini güncelleyebilir
            if (currentUserRole !== 'admin' && staffId !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'You can only update your own profile'
                });
            }

            // Admin olmayan kullanıcılar role ve status değiştiremez
            let updateData = { name, email };
            if (currentUserRole === 'admin') {
                updateData.role = role;
                updateData.status = status;
            }

            const updatedStaff = await StaffUser.update(tenantDb, staffId, updateData);

            res.json({
                success: true,
                message: 'Staff user updated successfully',
                data: updatedStaff.toJSON(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Staff update error:', error.message);
            
            let statusCode = 500;
            let errorCode = 'STAFF_UPDATE_ERROR';
            
            if (error.message.includes('not found')) {
                statusCode = 404;
                errorCode = 'STAFF_NOT_FOUND';
            } else if (error.message.includes('Email already exists')) {
                statusCode = 400;
                errorCode = 'EMAIL_EXISTS';
            } else if (error.message.includes('Invalid')) {
                statusCode = 400;
                errorCode = 'VALIDATION_ERROR';
            }

            res.status(statusCode).json({
                success: false,
                error: errorCode,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * PUT /tenant/api/staff/:id/password - Şifre güncelle
 * Admin tüm personelin şifresini, diğerleri sadece kendilerininki değiştirebilir
 */
router.put('/api/staff/:id/password',
    AuthMiddleware.authenticate(),
    async (req, res) => {
        try {
            const tenantDb = req.auth.tenant_db;
            const staffId = parseInt(req.params.id);
            const currentUserId = req.auth.user_id;
            const currentUserRole = req.auth.role;
            const { newPassword, currentPassword } = req.body;

            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'New password is required'
                });
            }

            // Admin olmayan kullanıcılar sadece kendi şifrelerini değiştirebilir
            if (currentUserRole !== 'admin' && staffId !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'You can only change your own password'
                });
            }

            // Admin olmayan kullanıcılar mevcut şifrelerini de girmelidir
            if (currentUserRole !== 'admin' && staffId === currentUserId) {
                if (!currentPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'VALIDATION_ERROR',
                        message: 'Current password is required'
                    });
                }

                // Mevcut şifreyi kontrol et
                const user = await StaffUser.findByEmail(tenantDb, req.auth.user.email);
                const isValidPassword = await StaffUser.verifyPassword(currentPassword, user.password);
                
                if (!isValidPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'INVALID_PASSWORD',
                        message: 'Current password is incorrect'
                    });
                }
            }

            await StaffUser.updatePassword(tenantDb, staffId, newPassword);

            res.json({
                success: true,
                message: 'Password updated successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Password update error:', error.message);
            
            let statusCode = 500;
            let errorCode = 'PASSWORD_UPDATE_ERROR';
            
            if (error.message.includes('not found')) {
                statusCode = 404;
                errorCode = 'STAFF_NOT_FOUND';
            } else if (error.message.includes('at least 6 characters')) {
                statusCode = 400;
                errorCode = 'VALIDATION_ERROR';
            }

            res.status(statusCode).json({
                success: false,
                error: errorCode,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * DELETE /tenant/api/staff/:id - Personeli sil/deaktif et
 * Sadece admin erişebilir
 */
router.delete('/api/staff/:id',
    AuthMiddleware.authenticate(),
    AuthMiddleware.authorize(['admin']),
    async (req, res) => {
        try {
            const tenantDb = req.auth.tenant_db;
            const staffId = parseInt(req.params.id);
            const currentUserId = req.auth.user_id;

            // Kullanıcı kendini silemez
            if (staffId === currentUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'SELF_DELETE_ERROR',
                    message: 'You cannot delete your own account'
                });
            }

            await StaffUser.delete(tenantDb, staffId);

            res.json({
                success: true,
                message: 'Staff user deleted successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Staff delete error:', error.message);
            
            let statusCode = 500;
            let errorCode = 'STAFF_DELETE_ERROR';
            
            if (error.message.includes('not found')) {
                statusCode = 404;
                errorCode = 'STAFF_NOT_FOUND';
            }

            res.status(statusCode).json({
                success: false,
                error: errorCode,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);

module.exports = router; 