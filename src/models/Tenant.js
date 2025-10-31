const { executeQuery } = require('../utils/db');

class Tenant {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.domain = data.domain || '';
        this.db_name = data.db_name || '';
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Tüm tenant'ları getir
    static async getAllTenants() {
        try {
            const query = `
                SELECT id, name, domain, db_name, status, created_at, updated_at 
                FROM tenants 
                ORDER BY created_at DESC
            `;
            const rows = await executeQuery(query);
            return rows.map(row => new Tenant(row));
        } catch (error) {
            console.error('Tenant listesi getirme hatası:', error.message);
            throw new Error('Tenant listesi alınamadı');
        }
    }

    // ID ile tenant bul
    static async findById(id) {
        try {
            const query = `
                SELECT id, name, domain, db_name, status, created_at, updated_at 
                FROM tenants 
                WHERE id = ?
            `;
            const rows = await executeQuery(query, [id]);
            return rows.length > 0 ? new Tenant(rows[0]) : null;
        } catch (error) {
            console.error('Tenant bulma hatası:', error.message);
            throw new Error('Tenant bulunamadı');
        }
    }

    // Domain ile tenant bul
    static async findByDomain(domain) {
        try {
            const query = `
                SELECT id, name, domain, db_name, status, created_at, updated_at 
                FROM tenants 
                WHERE domain = ?
            `;
            const rows = await executeQuery(query, [domain]);
            return rows.length > 0 ? new Tenant(rows[0]) : null;
        } catch (error) {
            console.error('Domain ile tenant bulma hatası:', error.message);
            throw new Error('Domain ile tenant bulunamadı');
        }
    }

    // Yeni tenant oluştur
    static async createTenant(tenantData) {
        try {
            const { name, domain, db_name, status = 'active' } = tenantData;
            
            // Gerekli alanları kontrol et
            if (!name || !domain || !db_name) {
                throw new Error('Name, domain ve db_name alanları zorunludur');
            }

            const query = `
                INSERT INTO tenants (name, domain, db_name, status) 
                VALUES (?, ?, ?, ?)
            `;
            const result = await executeQuery(query, [name, domain, db_name, status]);
            
            // Yeni oluşturulan tenant'ı geri döndür
            return await Tenant.findById(result.insertId);
        } catch (error) {
            console.error('Tenant oluşturma hatası:', error.message);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Bu domain zaten kullanımda');
            }
            throw new Error('Tenant oluşturulamadı: ' + error.message);
        }
    }

    // Tenant güncelle
    async update(updateData) {
        try {
            const { name, domain, db_name, status } = updateData;
            const query = `
                UPDATE tenants 
                SET name = ?, domain = ?, db_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await executeQuery(query, [name, domain, db_name, status, this.id]);
            
            // Güncellenmiş veriyi al
            const updated = await Tenant.findById(this.id);
            if (updated) {
                Object.assign(this, updated);
            }
            return this;
        } catch (error) {
            console.error('Tenant güncelleme hatası:', error.message);
            throw new Error('Tenant güncellenemedi: ' + error.message);
        }
    }

    // Tenant sil
    async delete() {
        try {
            const query = `DELETE FROM tenants WHERE id = ?`;
            await executeQuery(query, [this.id]);
            return true;
        } catch (error) {
            console.error('Tenant silme hatası:', error.message);
            throw new Error('Tenant silinemedi');
        }
    }

    // Tenant durumunu değiştir
    async changeStatus(newStatus) {
        try {
            const validStatuses = ['active', 'inactive', 'suspended'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Geçersiz status değeri');
            }

            const query = `UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            await executeQuery(query, [newStatus, this.id]);
            this.status = newStatus;
            return this;
        } catch (error) {
            console.error('Tenant status güncelleme hatası:', error.message);
            throw new Error('Tenant durumu güncellenemedi');
        }
    }

    // Tenant sayısını getir
    static async getCount() {
        try {
            const query = `SELECT COUNT(*) as count FROM tenants`;
            const rows = await executeQuery(query);
            return rows[0].count;
        } catch (error) {
            console.error('Tenant sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    // JSON formatına çevir
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            domain: this.domain,
            db_name: this.db_name,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Tenant; 