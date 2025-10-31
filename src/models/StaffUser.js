const bcrypt = require('bcrypt');
const { executeTenantQuery } = require('../utils/db');

class StaffUser {
    constructor(data = {}) {
        this.id = data.id;
        this.tenant_id = data.tenant_id;
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'viewer';
        this.status = data.status || 'active';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Şifreyi hashle
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Şifre doğrulama
     */
    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    /**
     * Yeni personel oluştur
     */
    static async create(tenantDbName, data) {
        const { name, email, password, role = 'viewer', status = 'active' } = data;

        // Validation
        if (!name || !email || !password) {
            throw new Error('Name, email and password are required');
        }

        if (!['admin', 'manager', 'viewer'].includes(role)) {
            throw new Error('Invalid role. Must be admin, manager, or viewer');
        }

        if (!['active', 'disabled'].includes(status)) {
            throw new Error('Invalid status. Must be active or disabled');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Check if email already exists for this tenant
        const existingUser = await executeTenantQuery(
            tenantDbName,
            'SELECT id FROM staff_users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            throw new Error('Email already exists');
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Get tenant_id (assumes we have it from middleware)
        const tenantIdQuery = await executeTenantQuery(
            tenantDbName,
            'SELECT 1 as tenant_check LIMIT 1'
        );
        
        // Extract tenant_id from database name (saas_test1 -> 1)
        const tenantId = tenantDbName.replace('saas_test', '').replace('saas_', '') || '1';

        // Insert new staff user
        const result = await executeTenantQuery(
            tenantDbName,
            'INSERT INTO staff_users (tenant_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [parseInt(tenantId), name, email, hashedPassword, role, status]
        );

        if (result.affectedRows === 0) {
            throw new Error('Failed to create staff user');
        }

        // Return created user (without password)
        const newUser = await this.findById(tenantDbName, result.insertId);

        // Yeni personel eklendi bildirimi gönder
        try {
            const NotificationService = require('../utils/notificationService');
            // Tenant ID'yi veritabanı adından çıkar
            const tenantId = parseInt(tenantDbName.replace('saas_test', '').replace('saas_', '') || '1');
            await NotificationService.notifyStaffAdded(tenantDbName, tenantId, newUser);
        } catch (notificationError) {
            console.error('Personel bildirimi oluşturma hatası:', notificationError.message);
            // Bildirim hatası personel oluşturulmasını engellemez
        }

        return newUser;
    }

    /**
     * Personel listesini getir
     */
    static async getAll(tenantDbName) {
        const users = await executeTenantQuery(
            tenantDbName,
            'SELECT id, tenant_id, name, email, role, status, created_at, updated_at FROM staff_users ORDER BY created_at DESC'
        );

        return users.map(user => new StaffUser(user));
    }

    /**
     * ID ile personel bul
     */
    static async findById(tenantDbName, id) {
        const users = await executeTenantQuery(
            tenantDbName,
            'SELECT id, tenant_id, name, email, role, status, created_at, updated_at FROM staff_users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return null;
        }

        return new StaffUser(users[0]);
    }

    /**
     * Email ile personel bul (login için)
     */
    static async findByEmail(tenantDbName, email) {
        const users = await executeTenantQuery(
            tenantDbName,
            'SELECT * FROM staff_users WHERE email = ? AND status = "active"',
            [email]
        );

        if (users.length === 0) {
            return null;
        }

        return new StaffUser(users[0]);
    }

    /**
     * Personel bilgilerini güncelle (şifre hariç)
     */
    static async update(tenantDbName, id, data) {
        const { name, email, role, status } = data;

        // Validation
        if (role && !['admin', 'manager', 'viewer'].includes(role)) {
            throw new Error('Invalid role');
        }

        if (status && !['active', 'disabled'].includes(status)) {
            throw new Error('Invalid status');
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }

            // Check if email already exists (exclude current user)
            const existingUser = await executeTenantQuery(
                tenantDbName,
                'SELECT id FROM staff_users WHERE email = ? AND id != ?',
                [email, id]
            );

            if (existingUser.length > 0) {
                throw new Error('Email already exists');
            }
        }

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (role) {
            updateFields.push('role = ?');
            updateValues.push(role);
        }
        if (status) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }

        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(id);

        const result = await executeTenantQuery(
            tenantDbName,
            `UPDATE staff_users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            throw new Error('Staff user not found or no changes made');
        }

        // Return updated user
        return await this.findById(tenantDbName, id);
    }

    /**
     * Şifre güncelle
     */
    static async updatePassword(tenantDbName, id, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        const hashedPassword = await this.hashPassword(newPassword);

        const result = await executeTenantQuery(
            tenantDbName,
            'UPDATE staff_users SET password = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, id]
        );

        if (result.affectedRows === 0) {
            throw new Error('Staff user not found');
        }

        return true;
    }

    /**
     * Personeli sil/deaktif et
     */
    static async delete(tenantDbName, id) {
        // Soft delete - set status to disabled
        const result = await executeTenantQuery(
            tenantDbName,
            'UPDATE staff_users SET status = "disabled", updated_at = NOW() WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            throw new Error('Staff user not found');
        }

        return true;
    }

    /**
     * Personel sayısını getir
     */
    static async getCount(tenantDbName, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM staff_users WHERE 1=1';
        const params = [];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.role) {
            query += ' AND role = ?';
            params.push(filters.role);
        }

        const result = await executeTenantQuery(tenantDbName, query, params);
        return result[0].count;
    }

    /**
     * Role display name
     */
    getRoleDisplayName() {
        const roleMap = {
            'admin': 'Yönetici',
            'manager': 'Müdür',
            'viewer': 'Görüntüleyici'
        };
        return roleMap[this.role] || this.role;
    }

    /**
     * Status display name
     */
    getStatusDisplayName() {
        const statusMap = {
            'active': 'Aktif',
            'disabled': 'Pasif'
        };
        return statusMap[this.status] || this.status;
    }

    /**
     * JSON representation (without password)
     */
    toJSON() {
        return {
            id: this.id,
            tenant_id: this.tenant_id,
            name: this.name,
            email: this.email,
            role: this.role,
            status: this.status,
            role_display: this.getRoleDisplayName(),
            status_display: this.getStatusDisplayName(),
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = StaffUser; 