const jwt = require('jsonwebtoken');
const StaffUser = require('../models/StaffUser');

// JWT Secret - production'da environment variable olmalı
const JWT_SECRET = process.env.JWT_SECRET || 'saas_panel_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthMiddleware {
    /**
     * JWT token oluştur
     */
    static generateToken(payload) {
        return jwt.sign(payload, JWT_SECRET, { 
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'saas-panel'
        });
    }

    /**
     * JWT token doğrula
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    /**
     * Auth middleware - JWT token kontrol et
     */
    static authenticate() {
        return async (req, res, next) => {
            try {
                // Token'ı cookie'den al
                const token = req.cookies?.auth_token;

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        error: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    });
                }

                // Token'ı doğrula
                const decoded = this.verifyToken(token);

                // User bilgilerini al
                const user = await StaffUser.findById(decoded.tenant_db, decoded.user_id);
                
                if (!user || user.status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        error: 'UNAUTHORIZED', 
                        message: 'User not found or inactive'
                    });
                }

                // Request'e user bilgilerini ekle
                req.auth = {
                    user: user,
                    user_id: user.id,
                    tenant_id: user.tenant_id,
                    tenant_db: decoded.tenant_db,
                    role: user.role
                };

                next();
            } catch (error) {
                console.error('Auth middleware error:', error.message);
                return res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Invalid authentication'
                });
            }
        };
    }

    /**
     * Role-based authorization middleware
     */
    static authorize(allowedRoles = []) {
        return (req, res, next) => {
            if (!req.auth) {
                return res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Authentication required'
                });
            }

            const userRole = req.auth.role;

            // Admin her şeye erişebilir
            if (userRole === 'admin') {
                return next();
            }

            // Belirli roller kontrol et
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Insufficient permissions'
                });
            }

            next();
        };
    }

    /**
     * Specific permission checks
     */
    static checkPermission(action, resource) {
        return (req, res, next) => {
            if (!req.auth) {
                return res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED', 
                    message: 'Authentication required'
                });
            }

            const userRole = req.auth.role;

            // Admin has all permissions
            if (userRole === 'admin') {
                return next();
            }

            // Define role permissions
            const permissions = {
                'manager': {
                    'products': ['read', 'create', 'update', 'delete'],
                    'orders': ['read', 'create', 'update', 'delete'],
                    'customers': ['read', 'create', 'update', 'delete'],
                    'categories': ['read', 'create', 'update', 'delete'],
                    'coupons': ['read', 'create', 'update', 'delete'],
                    'inventory': ['read', 'update'],
                    'reports': ['read'],
                    'staff': ['read'] // Managers can view staff but not modify
                },
                'viewer': {
                    'products': ['read'],
                    'orders': ['read'],
                    'customers': ['read'],
                    'categories': ['read'],
                    'coupons': ['read'],
                    'inventory': ['read'],
                    'reports': ['read'],
                    'staff': [] // Viewers cannot access staff management
                }
            };

            const userPermissions = permissions[userRole] || {};
            const resourcePermissions = userPermissions[resource] || [];

            if (!resourcePermissions.includes(action)) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: `Insufficient permissions for ${action} on ${resource}`
                });
            }

            next();
        };
    }

    /**
     * Optional auth - for pages that work with or without auth
     */
    static optionalAuth() {
        return async (req, res, next) => {
            try {
                const token = req.cookies?.auth_token;

                if (token) {
                    const decoded = this.verifyToken(token);
                    const user = await StaffUser.findById(decoded.tenant_db, decoded.user_id);
                    
                    if (user && user.status === 'active') {
                        req.auth = {
                            user: user,
                            user_id: user.id,
                            tenant_id: user.tenant_id,
                            tenant_db: decoded.tenant_db,
                            role: user.role
                        };
                    }
                }

                next();
            } catch (error) {
                // Ignore auth errors in optional auth
                next();
            }
        };
    }

    /**
     * Rate limiting for login attempts
     */
    static rateLimitLogin() {
        const attempts = new Map();
        const MAX_ATTEMPTS = 5;
        const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            
            if (!attempts.has(ip)) {
                attempts.set(ip, { count: 0, resetTime: now + WINDOW_MS });
            }

            const attempt = attempts.get(ip);

            if (now > attempt.resetTime) {
                attempt.count = 0;
                attempt.resetTime = now + WINDOW_MS;
            }

            if (attempt.count >= MAX_ATTEMPTS) {
                return res.status(429).json({
                    success: false,
                    error: 'TOO_MANY_ATTEMPTS',
                    message: 'Too many login attempts. Please try again later.',
                    retryAfter: Math.ceil((attempt.resetTime - now) / 1000)
                });
            }

            attempt.count++;
            next();
        };
    }

    /**
     * Login helper
     */
    static async login(tenantDbName, email, password) {
        // Find user by email
        const user = await StaffUser.findByEmail(tenantDbName, email);
        
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isValidPassword = await StaffUser.verifyPassword(password, user.password);
        
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const tokenPayload = {
            user_id: user.id,
            tenant_id: user.tenant_id,
            tenant_db: tenantDbName,
            role: user.role,
            email: user.email
        };

        const token = this.generateToken(tokenPayload);

        return {
            user: user.toJSON(),
            token: token
        };
    }

    /**
     * Logout helper
     */
    static logout(res) {
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
    }

    /**
     * Require specific roles middleware
     */
    static requireRole(...allowedRoles) {
        return (req, res, next) => {
            if (!req.auth) {
                return res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Giriş yapmanız gerekiyor'
                });
            }

            const userRole = req.auth.role;

            // Admin her zaman geçebilir
            if (userRole === 'admin') {
                return next();
            }

            // Belirtilen roller içinde mi kontrol et
            if (!allowedRoles.includes(userRole)) {
                // HTMX istekleri için farklı response
                if (req.headers['hx-request']) {
                    return res.status(403).send(`
                        <div style="padding: 2rem; text-align: center; color: #dc2626;">
                            <h3>🚫 Erişim Reddedildi</h3>
                            <p>Bu işlemi yapma yetkiniz bulunmuyor.</p>
                            <p><strong>Gerekli rol:</strong> ${allowedRoles.join(' veya ')}</p>
                            <p><strong>Sizin rolünüz:</strong> ${userRole}</p>
                        </div>
                    `);
                }

                // Normal sayfa istekleri için 403 sayfası
                return res.status(403).render('errors/403', {
                    tenantName: req.tenant?.name || 'Tenant',
                    tenantDomain: req.tenant_domain || '',
                    userRole: userRole,
                    requiredRoles: allowedRoles,
                    currentUser: req.auth.user
                });
            }

            next();
        };
    }

    /**
     * User session middleware - template'lere kullanıcı bilgisi aktar
     */
    static injectUserSession() {
        return async (req, res, next) => {
            try {
                // Eğer auth bilgisi varsa res.locals'a aktar
                if (req.auth) {
                    res.locals.currentUser = req.auth.user;
                    res.locals.userRole = req.auth.role;
                    res.locals.isAuthenticated = true;
                } else {
                    res.locals.currentUser = null;
                    res.locals.userRole = null;
                    res.locals.isAuthenticated = false;
                }

                next();
            } catch (error) {
                console.error('User session injection error:', error.message);
                res.locals.currentUser = null;
                res.locals.userRole = null;
                res.locals.isAuthenticated = false;
                next();
            }
        };
    }

    /**
     * Role permissions helper
     */
    static getRolePermissions(role) {
        const permissions = {
            'admin': {
                modules: ['dashboard', 'products', 'orders', 'customers', 'categories', 'coupons', 'inventory', 'reports', 'settings', 'staff', 'affiliates', 'billing', 'support', 'themes', 'pages', 'campaigns'],
                actions: ['read', 'create', 'update', 'delete']
            },
            'manager': {
                modules: ['dashboard', 'products', 'orders', 'customers', 'categories', 'coupons', 'inventory', 'reports', 'affiliates'],
                actions: ['read', 'create', 'update', 'delete']
            },
            'viewer': {
                modules: ['dashboard', 'products', 'orders', 'customers', 'categories', 'coupons', 'inventory', 'reports'],
                actions: ['read']
            }
        };

        return permissions[role] || { modules: [], actions: [] };
    }

    /**
     * Check if user has permission for module
     */
    static hasPermission(userRole, module, action = 'read') {
        const permissions = this.getRolePermissions(userRole);
        return permissions.modules.includes(module) && permissions.actions.includes(action);
    }
}

module.exports = AuthMiddleware; 