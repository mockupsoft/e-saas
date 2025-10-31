const mysql = require('mysql2/promise');

// Test verisi ekleme scripti
async function addTestData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'saas',
        password: 'bf4NmZ8SSRdiEnw5',
        database: 'test1_store', // Test tenant database
    });

    try {
        // Test products
        await connection.execute(`
            INSERT IGNORE INTO products (name, description, price, stock_quantity, status) VALUES
            ('Test Ürün 1', 'Test açıklaması 1', 99.99, 50, 'active'),
            ('Test Ürün 2', 'Test açıklaması 2', 199.99, 30, 'active'),
            ('Test Ürün 3', 'Test açıklaması 3', 299.99, 20, 'active'),
            ('Test Ürün 4', 'Test açıklaması 4', 399.99, 15, 'active'),
            ('Test Ürün 5', 'Test açıklaması 5', 499.99, 10, 'active')
        `);

        // Test customers
        await connection.execute(`
            INSERT IGNORE INTO customers (name, email, phone, city, status) VALUES
            ('Ahmet Yılmaz', 'ahmet@test.com', '05551234567', 'İstanbul', 'active'),
            ('Mehmet Kaya', 'mehmet@test.com', '05551234568', 'Ankara', 'active'),
            ('Ayşe Demir', 'ayse@test.com', '05551234569', 'İzmir', 'active'),
            ('Fatma Çelik', 'fatma@test.com', '05551234570', 'Bursa', 'active'),
            ('Ali Özkan', 'ali@test.com', '05551234571', 'Antalya', 'active')
        `);

        // Test orders (son 30 gün içinde farklı tarihlerde)
        const orders = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const orderCount = Math.floor(Math.random() * 5) + 1;
            
            for (let j = 0; j < orderCount; j++) {
                const amount = (Math.random() * 500 + 50).toFixed(2);
                const customerEmails = ['ahmet@test.com', 'mehmet@test.com', 'ayse@test.com', 'fatma@test.com', 'ali@test.com'];
                const email = customerEmails[Math.floor(Math.random() * customerEmails.length)];
                const names = ['Ahmet Yılmaz', 'Mehmet Kaya', 'Ayşe Demir', 'Fatma Çelik', 'Ali Özkan'];
                const name = names[customerEmails.indexOf(email)];
                
                orders.push([name, email, amount, 'delivered', date.toISOString().slice(0, 19).replace('T', ' ')]);
            }
        }

        for (const order of orders) {
            await connection.execute(
                'INSERT INTO orders (customer_name, customer_email, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?)',
                order
            );
        }

        console.log('✅ Test verileri başarıyla eklendi!');
        console.log(`📦 ${orders.length} sipariş eklendi`);
        console.log('🎯 Artık raporlama sayfasını test edebilirsiniz');
        
    } catch (error) {
        console.error('❌ Test verisi ekleme hatası:', error.message);
    } finally {
        await connection.end();
    }
}

addTestData();
