const { executeTenantQuery } = require('../utils/db');

class Customer {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.email = data.email || '';
        this.phone = data.phone || '';
        this.city = data.city || '';
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Tüm müşterileri getir
    static async getAllCustomers(dbName) {
        try {
            const query = `
                SELECT id, name, email, phone, city, status, created_at, updated_at 
                FROM customers 
                ORDER BY created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Customer(row));
        } catch (error) {
            console.error('Müşteri listesi getirme hatası:', error.message);
            throw new Error('Müşteri listesi alınamadı');
        }
    }

    // ID ile müşteri bul
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, name, email, phone, city, status, created_at, updated_at 
                FROM customers 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Customer(rows[0]) : null;
        } catch (error) {
            console.error('Müşteri bulma hatası:', error.message);
            throw new Error('Müşteri bulunamadı');
        }
    }

    // Email ile müşteri bul
    static async findByEmail(dbName, email) {
        try {
            const query = `
                SELECT id, name, email, phone, city, status, created_at, updated_at 
                FROM customers 
                WHERE email = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [email]);
            return rows.length > 0 ? new Customer(rows[0]) : null;
        } catch (error) {
            console.error('Email ile müşteri bulma hatası:', error.message);
            throw new Error('Email ile müşteri bulunamadı');
        }
    }

    // Yeni müşteri oluştur
    static async createCustomer(dbName, customerData) {
        try {
            const { name, email, phone, city, status = 'active' } = customerData;
            
            // Gerekli alanları kontrol et
            if (!name || !email) {
                throw new Error('Ad ve email alanları zorunludur');
            }

            // Email benzersizliğini kontrol et
            const existingCustomer = await Customer.findByEmail(dbName, email);
            if (existingCustomer) {
                throw new Error('Bu email adresi zaten kullanımda');
            }

            const query = `
                INSERT INTO customers (name, email, phone, city, status) 
                VALUES (?, ?, ?, ?, ?)
            `;
            const result = await executeTenantQuery(dbName, query, [name, email, phone || '', city || '', status]);
            
            // Yeni oluşturulan müşteriyi geri döndür
            const newCustomer = await Customer.findById(dbName, result.insertId);

            // Yeni müşteri kaydı bildirimi gönder
            try {
                const NotificationService = require('../utils/notificationService');
                // Tenant ID'yi veritabanı adından çıkar
                const tenantId = parseInt(dbName.replace('saas_test', '').replace('saas_', '') || '1');
                await NotificationService.notifyNewCustomer(dbName, tenantId, newCustomer);
            } catch (notificationError) {
                console.error('Yeni müşteri bildirimi oluşturma hatası:', notificationError.message);
                // Bildirim hatası müşteri oluşturulmasını engellemez
            }

            return newCustomer;
        } catch (error) {
            console.error('Müşteri oluşturma hatası:', error.message);
            throw error;
        }
    }

    // Müşteri güncelle
    static async updateCustomer(dbName, id, updateData) {
        try {
            const { name, email, phone, city, status } = updateData;
            
            // Gerekli alanları kontrol et
            if (!name || !email) {
                throw new Error('Ad ve email alanları zorunludur');
            }

            // Email benzersizliğini kontrol et (kendisi hariç)
            const existingCustomer = await Customer.findByEmail(dbName, email);
            if (existingCustomer && existingCustomer.id !== parseInt(id)) {
                throw new Error('Bu email adresi zaten kullanımda');
            }

            const query = `
                UPDATE customers 
                SET name = ?, email = ?, phone = ?, city = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await executeTenantQuery(dbName, query, [name, email, phone || '', city || '', status, id]);
            
            // Güncellenmiş müşteriyi geri döndür
            return await Customer.findById(dbName, id);
        } catch (error) {
            console.error('Müşteri güncelleme hatası:', error.message);
            throw error;
        }
    }

    // Müşteri sil
    static async deleteCustomer(dbName, id) {
        try {
            const query = `DELETE FROM customers WHERE id = ?`;
            const result = await executeTenantQuery(dbName, query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Müşteri silme hatası:', error.message);
            throw new Error('Müşteri silinemedi');
        }
    }

    // Müşteri durumunu değiştir
    static async changeStatus(dbName, id, newStatus) {
        try {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Geçersiz status değeri');
            }

            const query = `UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            await executeTenantQuery(dbName, query, [newStatus, id]);
            return await Customer.findById(dbName, id);
        } catch (error) {
            console.error('Müşteri status güncelleme hatası:', error.message);
            throw new Error('Müşteri durumu güncellenemedi');
        }
    }

    // Müşteri sayısını getir
    static async getCount(dbName) {
        try {
            const query = `SELECT COUNT(*) as count FROM customers`;
            const rows = await executeTenantQuery(dbName, query);
            return rows[0].count;
        } catch (error) {
            console.error('Müşteri sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    // Aktif müşteri sayısını getir
    static async getActiveCount(dbName) {
        try {
            const query = `SELECT COUNT(*) as count FROM customers WHERE status = 'active'`;
            const rows = await executeTenantQuery(dbName, query);
            return rows[0].count;
        } catch (error) {
            console.error('Aktif müşteri sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    // JSON formatına çevir
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            city: this.city,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Customer; 