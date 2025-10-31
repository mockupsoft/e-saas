const mysql = require('mysql2');

// Ana veritabanı bağlantı ayarları
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'saas',
    password: process.env.DB_PASSWORD || 'bf4NmZ8SSRdiEnw5',
    database: process.env.DB_NAME || 'saas',
    charset: 'utf8mb4',
    timezone: '+00:00'
};

// Root kullanıcı bağlantı ayarları (tenant veritabanları oluşturmak için)
const rootDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: 'root',
    password: 'c9c9d73f86c82534',
    charset: 'utf8mb4',
    timezone: '+00:00'
};

// Ana bağlantı havuzu oluştur (ana saas veritabanı için)
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
});

// Promise destekli havuz
const promisePool = pool.promise();

// Veritabanı bağlantısını test et
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ MariaDB veritabanına başarıyla bağlanıldı');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Veritabanı bağlantı hatası:', error.message);
        return false;
    }
};

// Ana veritabanında query çalıştırma fonksiyonu
const executeQuery = async (query, params = []) => {
    try {
        const [rows] = await promisePool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('SQL Sorgu Hatası:', error.message);
        throw error;
    }
};

// Ana tenant tablosunu oluştur (eğer yoksa)
const createTenantTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS tenants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            domain VARCHAR(255) NOT NULL UNIQUE,
            db_name VARCHAR(255) NOT NULL,
            status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    
    try {
        await executeQuery(createTableQuery);
        console.log('✅ Tenants tablosu hazırlandı');
    } catch (error) {
        console.error('❌ Tenants tablosu oluşturma hatası:', error.message);
    }
};

// Ana veritabanını başlat
const initializeDatabase = async () => {
    const connected = await testConnection();
    if (connected) {
        await createTenantTable();
    }
    return connected;
};

// Tenant bazlı veritabanı bağlantı havuzları (cache için)
const tenantPools = new Map();

/**
 * Yeni tenant veritabanı oluştur (Root kullanıcı ile)
 * @param {string} dbName - Tenant veritabanı adı
 * @returns {boolean} Başarı durumu
 */
const createTenantDatabase = async (dbName) => {
    let rootConnection = null;
    
    try {
        console.log(`🏗️ Yeni tenant veritabanı oluşturuluyor: ${dbName}`);
        
        // Root kullanıcı ile bağlan
        rootConnection = await mysql.createConnection(rootDbConfig).promise();
        
        // Veritabanını oluştur
        await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Veritabanı oluşturuldu: ${dbName}`);
        
        // Veritabanını seç
        await rootConnection.execute(`USE \`${dbName}\``);
        
        // Products tablosu oluştur
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                stock_quantity INT DEFAULT 0,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Orders tablosu oluştur
        const createOrdersTable = `
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_customer_email (customer_email),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Customers tablosu oluştur
        const createCustomersTable = `
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                city VARCHAR(100),
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_status (status),
                INDEX idx_city (city)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Categories tablosu oluştur
        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_name (name),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Coupons tablosu oluştur
        const createCouponsTable = `
            CREATE TABLE IF NOT EXISTS coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                type ENUM('percentage', 'fixed') DEFAULT 'percentage',
                amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                min_cart_total DECIMAL(10,2) DEFAULT 0.00,
                expires_at DATETIME NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_type (type),
                INDEX idx_status (status),
                INDEX idx_expires_at (expires_at),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Activity Logs tablosu oluştur (Audit Trail)
        const createActivityLogsTable = `
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                user_id INT,
                user_email VARCHAR(255),
                action_type ENUM('create', 'update', 'delete', 'login', 'logout', 'view') NOT NULL,
                target_type ENUM('product', 'order', 'customer', 'coupon', 'staff', 'login', 'category', 'affiliate', 'notification') NOT NULL,
                target_id INT,
                metadata JSON DEFAULT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_user_id (user_id),
                INDEX idx_action_type (action_type),
                INDEX idx_target_type (target_type),
                INDEX idx_target_id (target_id),
                INDEX idx_created_at (created_at),
                INDEX idx_user_email (user_email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Notifications tablosu oluştur
        const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                user_id INT DEFAULT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('success', 'info', 'warning', 'danger') NOT NULL DEFAULT 'info',
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_user_id (user_id),
                INDEX idx_is_read (is_read),
                INDEX idx_type (type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Staff Users tablosu oluştur
        const createStaffUsersTable = `
            CREATE TABLE IF NOT EXISTS staff_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'manager', 'viewer') NOT NULL DEFAULT 'viewer',
                status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- Indexes
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_email (email),
                INDEX idx_status (status),
                
                -- Unique constraint for email per tenant
                UNIQUE KEY unique_email_per_tenant (tenant_id, email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        // Brands tablosu oluştur
        const createBrandsTable = `
            CREATE TABLE IF NOT EXISTS brands (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                logo VARCHAR(500),
                status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- Indexes
                INDEX idx_slug (slug),
                INDEX idx_status (status),
                INDEX idx_name (name),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        // Products tablosuna brand_id ekle
        const addBrandIdToProducts = `
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS brand_id INT DEFAULT NULL,
            ADD INDEX IF NOT EXISTS idx_brand_id (brand_id),
            ADD CONSTRAINT fk_products_brand_id 
                FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
        `;

        await rootConnection.execute(createProductsTable);
        await rootConnection.execute(createCategoriesTable);
        await rootConnection.execute(createCustomersTable);
        await rootConnection.execute(createOrdersTable);
        await rootConnection.execute(createCouponsTable);
        await rootConnection.execute(createNotificationsTable);
        await rootConnection.execute(createStaffUsersTable);
        await rootConnection.execute(createBrandsTable);
        
        // Brands tablosu oluşturulduktan sonra products tablosuna brand_id kolonu ekle
        try {
            await rootConnection.execute(addBrandIdToProducts);
        } catch (err) {
            // Foreign key zaten varsa hata vermeyecek şekilde
            if (!err.message.includes('Duplicate foreign key constraint name')) {
                console.warn('Brand foreign key eklenirken uyarı:', err.message);
            }
        }

        // Sample brands ekle
        const insertSampleBrands = `
            INSERT INTO brands (name, slug, description, status) VALUES
            ('Markasız', 'markasiz', 'Genel ürünler için', 'active'),
            ('Apple', 'apple', 'Premium teknoloji markası', 'active'),
            ('Samsung', 'samsung', 'Güney Koreli teknoloji devi', 'active'),
            ('Nike', 'nike', 'Spor giyim ve ayakkabı markası', 'active')
            ON DUPLICATE KEY UPDATE name = VALUES(name)
        `;
        
        await rootConnection.execute(insertSampleBrands);
        
        // Affiliate system tables
        const createAffiliatesTable = `
            CREATE TABLE IF NOT EXISTS affiliates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                affiliate_code VARCHAR(50) NOT NULL UNIQUE,
                owner_customer_id INT NOT NULL,
                commission_rate DECIMAL(5,2) DEFAULT 5.00,
                total_sales DECIMAL(10,2) DEFAULT 0.00,
                total_commission DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_affiliate_code (affiliate_code),
                INDEX idx_owner_customer_id (owner_customer_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (owner_customer_id) REFERENCES customers(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        const createAffiliateSalesTable = `
            CREATE TABLE IF NOT EXISTS affiliate_sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                affiliate_id INT NOT NULL,
                order_id INT NOT NULL,
                commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                status ENUM('pending', 'paid') DEFAULT 'pending',
                paid_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_affiliate_id (affiliate_id),
                INDEX idx_order_id (order_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                UNIQUE KEY unique_affiliate_order (affiliate_id, order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        await rootConnection.execute(createAffiliatesTable);
        await rootConnection.execute(createAffiliateSalesTable);
        
        // Orders tablosuna affiliate_code kolonu ekle
        await rootConnection.execute(`
            ALTER TABLE orders 
            ADD COLUMN affiliate_code VARCHAR(50) DEFAULT NULL,
            ADD INDEX idx_affiliate_code (affiliate_code)
        `);
        
        // Tenant kullanıcısına bu veritabanında yetki ver
        await rootConnection.execute(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO 'saas'@'localhost'`);
        await rootConnection.execute(`FLUSH PRIVILEGES`);
        
        console.log(`✅ Tenant veritabanı ve tabloları başarıyla oluşturuldu: ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Tenant veritabanı oluşturma hatası (${dbName}):`, error.message);
        return false;
    } finally {
        if (rootConnection) {
            await rootConnection.end();
        }
    }
};

/**
 * Belirli bir tenant için veritabanı bağlantısı oluştur
 * @param {string} dbName - Tenant'a özel veritabanı adı
 * @returns {object} Promise destekli MySQL pool
 */
const getTenantConnection = (dbName) => {
    try {
        // Eğer bu tenant için pool zaten varsa, onu döndür
        if (tenantPools.has(dbName)) {
            return tenantPools.get(dbName);
        }

        console.log(`🔗 Yeni tenant veritabanı bağlantısı oluşturuluyor: ${dbName}`);

        // Tenant için yeni bağlantı yapılandırması
        const tenantDbConfig = {
            ...dbConfig,
            database: dbName,
            connectionLimit: 5, // Tenant başına daha az bağlantı
            acquireTimeout: 30000,
            timeout: 30000
        };

        // Yeni pool oluştur
        const tenantPool = mysql.createPool(tenantDbConfig);
        const tenantPromisePool = tenantPool.promise();

        // Cache'e ekle
        tenantPools.set(dbName, tenantPromisePool);

        return tenantPromisePool;
    } catch (error) {
        console.error(`❌ Tenant veritabanı bağlantı hatası (${dbName}):`, error.message);
        throw new Error(`Tenant veritabanı bağlantısı kurulamadı: ${dbName}`);
    }
};

/**
 * Tenant veritabanında sorgu çalıştır
 * @param {string} dbName - Tenant veritabanı adı
 * @param {string} query - SQL sorgusu
 * @param {array} params - Sorgu parametreleri
 * @returns {array} Sorgu sonucu
 */
const executeTenantQuery = async (dbName, query, params = []) => {
    try {
        const tenantPool = getTenantConnection(dbName);
        console.log(`🔍 Tenant sorgu çalıştırılıyor (${dbName}): ${query.replace(/\s+/g, ' ').trim()}`);
        
        const [rows] = await tenantPool.execute(query, params);
        return rows;
    } catch (error) {
        console.error(`SQL Tenant Sorgu Hatası (${dbName}):`, error.message);
        throw error;
    }
};

/**
 * Tenant veritabanı bağlantısını test et
 * @param {string} dbName - Tenant veritabanı adı
 * @returns {boolean} Bağlantı durumu
 */
const testTenantConnection = async (dbName) => {
    try {
        const tenantPool = getTenantConnection(dbName);
        const connection = await tenantPool.getConnection();
        console.log(`✅ Tenant veritabanı bağlantısı başarılı: ${dbName}`);
        connection.release();
        return true;
    } catch (error) {
        console.error(`❌ Tenant veritabanı bağlantı testi başarısız (${dbName}):`, error.message);
        return false;
    }
};

/**
 * Tenant için temel tabloları oluştur (eski sistem - artık createTenantDatabase kullanılacak)
 * @param {string} dbName - Tenant veritabanı adı
 */
const initializeTenantDatabase = async (dbName) => {
    try {
        // Veritabanının var olup olmadığını kontrol et
        const tenantPool = getTenantConnection(dbName);
        const connection = await tenantPool.getConnection();
        connection.release();
        
        console.log(`✅ Tenant veritabanı hazır: ${dbName}`);
        return true;
    } catch (error) {
        console.warn(`⚠️ Tenant veritabanı mevcut değil (${dbName}), oluşturulması gerekiyor`);
        // Veritabanı yoksa yeni oluştur
        return await createTenantDatabase(dbName);
    }
};

/**
 * Belirli bir tenant'ın pool bağlantısını kapat
 * @param {string} dbName - Tenant veritabanı adı
 */
const closeTenantConnection = async (dbName) => {
    if (tenantPools.has(dbName)) {
        const pool = tenantPools.get(dbName);
        await pool.end();
        tenantPools.delete(dbName);
        console.log(`🔒 Tenant veritabanı bağlantısı kapatıldı: ${dbName}`);
    }
};

/**
 * Tüm tenant bağlantılarını kapat
 */
const closeAllTenantConnections = async () => {
    const promises = [];
    for (const [dbName, pool] of tenantPools) {
        promises.push(pool.end());
    }
    await Promise.all(promises);
    tenantPools.clear();
    console.log('🔒 Tüm tenant veritabanı bağlantıları kapatıldı');
};

/**
 * Tenant veritabanını sil (Dikkatli kullanın!)
 * @param {string} dbName - Silinecek veritabanı adı
 * @returns {boolean} Başarı durumu
 */
const dropTenantDatabase = async (dbName) => {
    let rootConnection = null;
    
    try {
        console.log(`🗑️ Tenant veritabanı siliniyor: ${dbName}`);
        
        // Önce bağlantı havuzunu kapat
        await closeTenantConnection(dbName);
        
        // Root kullanıcı ile bağlan
        rootConnection = await mysql.createConnection(rootDbConfig).promise();
        
        // Veritabanını sil
        await rootConnection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
        
        console.log(`✅ Tenant veritabanı silindi: ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Tenant veritabanı silme hatası (${dbName}):`, error.message);
        return false;
    } finally {
        if (rootConnection) {
            await rootConnection.end();
        }
    }
};

/**
 * Mevcut tenant'lara kategoriler tablosunu ekle (migration)
 * @param {string} dbName - Tenant veritabanı adı
 * @returns {boolean} Başarı durumu
 */
const addCategoriesTableToTenant = async (dbName) => {
    try {
        console.log(`📂 Kategoriler tablosu ekleniyor: ${dbName}`);
        
        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_name (name),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        await executeTenantQuery(dbName, createCategoriesTable);
        console.log(`✅ Kategoriler tablosu eklendi: ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Kategoriler tablosu ekleme hatası (${dbName}):`, error.message);
        return false;
    }
};

/**
 * Tüm mevcut tenant'lara kategoriler tablosunu ekle
 * @returns {boolean} Başarı durumu
 */
const migrateCategoriesTableToAllTenants = async () => {
    try {
        console.log('🔄 Tüm tenant\'lara kategoriler tablosu migration başlatılıyor...');
        
        // Tüm aktif tenant'ları getir
        const tenants = await executeQuery('SELECT db_name FROM tenants WHERE status = "active"');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const tenant of tenants) {
            const success = await addCategoriesTableToTenant(tenant.db_name);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }
        
        console.log(`✅ Migration tamamlandı - Başarılı: ${successCount}, Başarısız: ${failCount}`);
        return failCount === 0;
        
    } catch (error) {
        console.error('❌ Categories migration hatası:', error.message);
        return false;
    }
};

/**
 * Mevcut tenant veritabanlarına coupons tablosu ekle
 * @param {string} dbName - Tenant veritabanı adı
 */
const addCouponsTableToTenant = async (dbName) => {
    try {
        console.log(`🔄 Adding coupons table to database: ${dbName}`);
        
        // Check if coupons table already exists
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'coupons'
        `;
        
        const existingTables = await executeTenantQuery(dbName, checkTableQuery, [dbName]);
        
        if (existingTables.length > 0) {
            console.log(`✅ Coupons table already exists in ${dbName}`);
            return true;
        }
        
        // Create coupons table
        const createCouponsTable = `
            CREATE TABLE coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                type ENUM('percentage', 'fixed') DEFAULT 'percentage',
                amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                min_cart_total DECIMAL(10,2) DEFAULT 0.00,
                expires_at DATETIME NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_type (type),
                INDEX idx_status (status),
                INDEX idx_expires_at (expires_at),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        await executeTenantQuery(dbName, createCouponsTable);
        console.log(`✅ Coupons table added to ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error adding coupons table to ${dbName}:`, error.message);
        return false;
    }
};

/**
 * Tüm tenant veritabanlarına coupons tablosu ekle
 */
const migrateCouponsTableToAllTenants = async () => {
    try {
        console.log('🚀 Starting coupons table migration for all tenants...');
        
        // Tüm tenant'ları getir
        const tenants = await executeQuery('SELECT id, name, db_name FROM tenants WHERE status = "active"');
        
        if (tenants.length === 0) {
            console.log('ℹ️ No active tenants found');
            return { success: true, migrated: 0 };
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const tenant of tenants) {
            const success = await addCouponsTableToTenant(tenant.db_name);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        console.log(`✅ Coupons table migration completed: ${successCount} success, ${errorCount} errors`);
        return { 
            success: true, 
            migrated: successCount, 
            errors: errorCount,
            total: tenants.length 
        };
        
    } catch (error) {
        console.error('❌ Coupons table migration failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Mevcut tenant veritabanlarına city alanı ekle
 * @param {string} dbName - Tenant veritabanı adı
 */
const addCityColumnToCustomersTable = async (dbName) => {
    try {
        console.log(`🔄 Adding city column to customers table in database: ${dbName}`);
        
        // Check if city column already exists
        const checkColumnQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'city'
        `;
        
        const existingColumns = await executeTenantQuery(dbName, checkColumnQuery, [dbName]);
        
        if (existingColumns.length > 0) {
            console.log(`✅ City column already exists in ${dbName}`);
            return true;
        }
        
        // Add city column
        const addColumnQuery = `
            ALTER TABLE customers 
            ADD COLUMN city VARCHAR(100) AFTER phone,
            ADD INDEX idx_city (city)
        `;
        
        await executeTenantQuery(dbName, addColumnQuery);
        console.log(`✅ City column added to customers table in ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error adding city column to ${dbName}:`, error.message);
        return false;
    }
};

/**
 * Tüm tenant veritabanlarına city alanı ekle
 */
const addCityColumnToAllTenants = async () => {
    try {
        console.log('🔄 Adding city column to all tenant databases...');
        
        // Get all tenants
        const tenants = await executeQuery('SELECT db_name FROM tenants WHERE status = "active"');
        
        for (const tenant of tenants) {
            await addCityColumnToCustomersTable(tenant.db_name);
        }
        
        console.log('✅ City column migration completed for all tenants');
        return true;
        
    } catch (error) {
        console.error('❌ Error migrating city column:', error.message);
        return false;
    }
};

/**
 * Orders tablosuna fatura ve kargo bilgileri için yeni sütunlar ekle
 * @param {string} dbName - Tenant veritabanı adı
 */
const addInvoiceAndShippingColumnsToOrders = async (dbName) => {
    try {
        console.log(`🔄 Adding invoice and shipping columns to orders table in database: ${dbName}`);
        
        // Check existing columns
        const checkColumnsQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders'
        `;
        
        const existingColumns = await executeTenantQuery(dbName, checkColumnsQuery, [dbName]);
        const columnNames = existingColumns.map(col => col.COLUMN_NAME);
        
        // Define new columns to add
        const newColumns = [
            {
                name: 'invoice_type',
                definition: `ADD COLUMN invoice_type ENUM('bireysel', 'kurumsal') DEFAULT 'bireysel'`
            },
            {
                name: 'invoice_title',
                definition: `ADD COLUMN invoice_title VARCHAR(255) DEFAULT NULL`
            },
            {
                name: 'tax_number',
                definition: `ADD COLUMN tax_number VARCHAR(50) DEFAULT NULL`
            },
            {
                name: 'tax_office',
                definition: `ADD COLUMN tax_office VARCHAR(255) DEFAULT NULL`
            },
            {
                name: 'invoice_address',
                definition: `ADD COLUMN invoice_address TEXT DEFAULT NULL`
            },
            {
                name: 'shipping_company',
                definition: `ADD COLUMN shipping_company VARCHAR(100) DEFAULT NULL`
            },
            {
                name: 'tracking_number',
                definition: `ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL`
            },
            {
                name: 'estimated_delivery',
                definition: `ADD COLUMN estimated_delivery DATE DEFAULT NULL`
            }
        ];
        
        // Add missing columns
        let addedColumns = 0;
        for (const column of newColumns) {
            if (!columnNames.includes(column.name)) {
                const alterQuery = `ALTER TABLE orders ${column.definition}`;
                await executeTenantQuery(dbName, alterQuery);
                console.log(`✅ Added column ${column.name} to orders table in ${dbName}`);
                addedColumns++;
            } else {
                console.log(`ℹ️ Column ${column.name} already exists in ${dbName}`);
            }
        }
        
        // Add indexes for better performance
        const indexQueries = [
            `CREATE INDEX IF NOT EXISTS idx_invoice_type ON orders (invoice_type)`,
            `CREATE INDEX IF NOT EXISTS idx_shipping_company ON orders (shipping_company)`,
            `CREATE INDEX IF NOT EXISTS idx_tracking_number ON orders (tracking_number)`,
            `CREATE INDEX IF NOT EXISTS idx_estimated_delivery ON orders (estimated_delivery)`
        ];
        
        for (const indexQuery of indexQueries) {
            try {
                await executeTenantQuery(dbName, indexQuery);
            } catch (indexError) {
                // Index might already exist, ignore error
                console.log(`ℹ️ Index already exists or error creating index in ${dbName}:`, indexError.message);
            }
        }
        
        console.log(`✅ Successfully added ${addedColumns} new columns to orders table in ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error adding invoice and shipping columns to ${dbName}:`, error.message);
        return false;
    }
};

/**
 * Tüm tenant veritabanlarına fatura ve kargo sütunları ekle
 */
const migrateInvoiceAndShippingToAllTenants = async () => {
    try {
        console.log('🚀 Starting invoice and shipping columns migration for all tenants...');
        
        // Tüm tenant'ları getir
        const tenants = await executeQuery('SELECT id, name, db_name FROM tenants WHERE status = "active"');
        
        if (tenants.length === 0) {
            console.log('ℹ️ No active tenants found');
            return { success: true, migrated: 0 };
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const tenant of tenants) {
            const success = await addInvoiceAndShippingColumnsToOrders(tenant.db_name);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        console.log(`✅ Invoice and shipping migration completed: ${successCount} success, ${errorCount} errors`);
        return { 
            success: true, 
            migrated: successCount, 
            errors: errorCount,
            total: tenants.length 
        };
        
    } catch (error) {
        console.error('❌ Invoice and shipping migration failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Mevcut tenant veritabanlarına affiliate sistemi tablolarını ekle
 * @param {string} dbName - Tenant veritabanı adı
 */
const addAffiliateSystemToTenant = async (dbName) => {
    try {
        console.log(`🔄 Adding affiliate system tables to database: ${dbName}`);
        
        // Check if affiliates table already exists
        const checkAffiliatesTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'affiliates'
        `;
        
        const existingAffiliatesTables = await executeTenantQuery(dbName, checkAffiliatesTableQuery, [dbName]);
        
        if (existingAffiliatesTables.length === 0) {
            // Create affiliates table
            const createAffiliatesTable = `
                CREATE TABLE affiliates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    affiliate_code VARCHAR(50) NOT NULL UNIQUE,
                    owner_customer_id INT NOT NULL,
                    commission_rate DECIMAL(5,2) DEFAULT 5.00,
                    total_sales DECIMAL(10,2) DEFAULT 0.00,
                    total_commission DECIMAL(10,2) DEFAULT 0.00,
                    status ENUM('active', 'inactive') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_affiliate_code (affiliate_code),
                    INDEX idx_owner_customer_id (owner_customer_id),
                    INDEX idx_status (status),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (owner_customer_id) REFERENCES customers(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `;
            
            await executeTenantQuery(dbName, createAffiliatesTable);
            console.log(`✅ Affiliates table created in ${dbName}`);
        } else {
            console.log(`ℹ️ Affiliates table already exists in ${dbName}`);
        }
        
        // Check if affiliate_sales table already exists
        const checkAffiliateSalesTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'affiliate_sales'
        `;
        
        const existingAffiliateSalesTables = await executeTenantQuery(dbName, checkAffiliateSalesTableQuery, [dbName]);
        
        if (existingAffiliateSalesTables.length === 0) {
            // Create affiliate_sales table
            const createAffiliateSalesTable = `
                CREATE TABLE affiliate_sales (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    affiliate_id INT NOT NULL,
                    order_id INT NOT NULL,
                    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    status ENUM('pending', 'paid') DEFAULT 'pending',
                    paid_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_affiliate_id (affiliate_id),
                    INDEX idx_order_id (order_id),
                    INDEX idx_status (status),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_affiliate_order (affiliate_id, order_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `;
            
            await executeTenantQuery(dbName, createAffiliateSalesTable);
            console.log(`✅ Affiliate sales table created in ${dbName}`);
        } else {
            console.log(`ℹ️ Affiliate sales table already exists in ${dbName}`);
        }
        
        // Check if affiliate_code column exists in orders table
        const checkAffiliateCodeColumnQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'affiliate_code'
        `;
        
        const existingAffiliateCodeColumns = await executeTenantQuery(dbName, checkAffiliateCodeColumnQuery, [dbName]);
        
        if (existingAffiliateCodeColumns.length === 0) {
            // Add affiliate_code column to orders table
            const addAffiliateCodeColumnQuery = `
                ALTER TABLE orders 
                ADD COLUMN affiliate_code VARCHAR(50) DEFAULT NULL AFTER estimated_delivery,
                ADD INDEX idx_affiliate_code (affiliate_code)
            `;
            
            await executeTenantQuery(dbName, addAffiliateCodeColumnQuery);
            console.log(`✅ Affiliate code column added to orders table in ${dbName}`);
        } else {
            console.log(`ℹ️ Affiliate code column already exists in orders table in ${dbName}`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error adding affiliate system to ${dbName}:`, error.message);
        return false;
    }
};

/**
 * Tüm tenant veritabanlarına affiliate sistemi ekle
 */
const migrateAffiliateSystemToAllTenants = async () => {
    try {
        console.log('🚀 Starting affiliate system migration for all tenants...');
        
        // Tüm tenant'ları getir
        const tenants = await executeQuery('SELECT id, name, db_name FROM tenants WHERE status = "active"');
        
        if (tenants.length === 0) {
            console.log('ℹ️ No active tenants found');
            return { success: true, migrated: 0 };
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const tenant of tenants) {
            const success = await addAffiliateSystemToTenant(tenant.db_name);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        console.log(`✅ Affiliate system migration completed: ${successCount} success, ${errorCount} errors`);
        return { 
            success: true, 
            migrated: successCount, 
            errors: errorCount,
            total: tenants.length 
        };
        
    } catch (error) {
        console.error('❌ Affiliate system migration failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Mevcut tenant veritabanlarına activity logs tablosu ekle
 * @param {string} dbName - Tenant veritabanı adı
 */
const addActivityLogsTableToTenant = async (dbName) => {
    try {
        console.log(`🔄 Adding activity logs table to database: ${dbName}`);
        
        // Check if activity_logs table already exists
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activity_logs'
        `;
        
        const existingTables = await executeTenantQuery(dbName, checkTableQuery, [dbName]);
        
        if (existingTables.length > 0) {
            console.log(`✅ Activity logs table already exists in ${dbName}`);
            return true;
        }
        
        // Create activity_logs table
        const createActivityLogsTable = `
            CREATE TABLE activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                user_id INT,
                user_email VARCHAR(255),
                action_type ENUM('create', 'update', 'delete', 'login', 'logout', 'view') NOT NULL,
                target_type ENUM('product', 'order', 'customer', 'coupon', 'staff', 'login', 'category', 'affiliate') NOT NULL,
                target_id INT,
                metadata JSON DEFAULT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tenant_id (tenant_id),
                INDEX idx_user_id (user_id),
                INDEX idx_action_type (action_type),
                INDEX idx_target_type (target_type),
                INDEX idx_target_id (target_id),
                INDEX idx_created_at (created_at),
                INDEX idx_user_email (user_email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;
        
        await executeTenantQuery(dbName, createActivityLogsTable);
        console.log(`✅ Activity logs table added to ${dbName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error adding activity logs table to ${dbName}:`, error.message);
        return false;
    }
};

/**
 * Tüm tenant'lara activity logs tablosunu ekle
 */
const migrateActivityLogsToAllTenants = async () => {
    try {
        console.log('🔄 Running activity logs migration for all tenants...');
        
        const tenants = await executeQuery('SELECT id, name, db_name FROM tenants WHERE status = "active"');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const tenant of tenants) {
            const success = await addActivityLogsTableToTenant(tenant.db_name);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        console.log(`✅ Activity logs migration completed: ${successCount} success, ${errorCount} errors`);
        return { successCount, errorCount, total: tenants.length };
        
    } catch (error) {
        console.error('❌ Activity logs migration error:', error.message);
        throw error;
    }
};

module.exports = {
    promisePool,
    executeQuery,
    executeTenantQuery,
    testConnection,
    createTenantDatabase,
    dropTenantDatabase,
    getTenantConnection,
    initializeTenantDatabase,
    closeAllTenantConnections,
    initializeDatabase
}; 