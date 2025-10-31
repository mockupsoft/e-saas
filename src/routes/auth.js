const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const StaffUser = require('../models/StaffUser');

// ===============================
// 🔐 AUTHENTİCATİON API'LERİ
// ===============================

/**
 * POST /tenant/login - Personel girişi
 */
router.post('/login',
    AuthMiddleware.rateLimitLogin(),
    async (req, res) => {
        try {
            const { email, password } = req.body;
            const tenantDb = req.tenant.db_name; // Tenant middleware'den gelir

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Email and password are required'
                });
            }

            // Login işlemi
            const loginResult = await AuthMiddleware.login(tenantDb, email, password);

            // JWT token'ı HTTP-only cookie olarak set et
            res.cookie('auth_token', loginResult.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 saat
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: loginResult.user,
                    // Token'ı client'a gönderme, güvenlik için cookie'de tutuluyor
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Login error:', error.message);
            
            let statusCode = 400;
            let errorCode = 'LOGIN_ERROR';
            
            if (error.message.includes('Invalid credentials')) {
                statusCode = 401;
                errorCode = 'INVALID_CREDENTIALS';
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
 * POST /tenant/logout - Personel çıkışı
 */
router.post('/logout', (req, res) => {
    try {
        // Cookie'yi temizle
        AuthMiddleware.logout(res);

        res.json({
            success: true,
            message: 'Logout successful',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Logout error:', error.message);
        res.status(500).json({
            success: false,
            error: 'LOGOUT_ERROR',
            message: 'Failed to logout',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /tenant/me - Mevcut kullanıcı bilgileri
 */
router.get('/me',
    AuthMiddleware.authenticate(),
    async (req, res) => {
        try {
            res.json({
                success: true,
                message: 'User info retrieved successfully',
                data: req.auth.user.toJSON(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('User info error:', error.message);
            res.status(500).json({
                success: false,
                error: 'USER_INFO_ERROR',
                message: 'Failed to retrieve user information',
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * POST /tenant/verify-token - Token doğrulama
 */
router.post('/verify-token',
    AuthMiddleware.authenticate(),
    async (req, res) => {
        try {
            res.json({
                success: true,
                message: 'Token is valid',
                data: {
                    user: req.auth.user.toJSON(),
                    role: req.auth.role,
                    tenant_id: req.auth.tenant_id
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Token verify error:', error.message);
            res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Token verification failed',
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * GET /tenant/auth-status - Giriş durumu kontrol et (optional auth)
 */
router.get('/auth-status',
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
        try {
            const isAuthenticated = !!req.auth;
            
            res.json({
                success: true,
                message: 'Auth status retrieved',
                data: {
                    isAuthenticated: isAuthenticated,
                    user: isAuthenticated ? req.auth.user.toJSON() : null,
                    role: isAuthenticated ? req.auth.role : null
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Auth status error:', error.message);
            res.status(500).json({
                success: false,
                error: 'AUTH_STATUS_ERROR',
                message: 'Failed to get auth status',
                timestamp: new Date().toISOString()
            });
        }
    }
);

module.exports = router; 