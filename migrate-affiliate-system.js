const { migrateAffiliateSystemToAllTenants } = require('./src/utils/db');

/**
 * Affiliate Sistem Migration Scripti
 * Bu script mevcut tüm tenant veritabanlarına affiliate sistemi tablolarını ekler
 */
async function runAffiliateMigration() {
    try {
        console.log('🚀 Affiliate sistem migration başlatılıyor...');
        console.log('═══════════════════════════════════════════════');
        
        const result = await migrateAffiliateSystemToAllTenants();
        
        if (result.success) {
            console.log('✅ Migration başarıyla tamamlandı!');
            console.log(`📊 Toplam tenant: ${result.total}`);
            console.log(`✅ Başarılı: ${result.migrated}`);
            console.log(`❌ Hatalı: ${result.errors}`);
        } else {
            console.error('❌ Migration başarısız:', result.error);
        }
        
        console.log('═══════════════════════════════════════════════');
        console.log('🎯 Migration tamamlandı. Artık affiliate sistemi kullanabilirsiniz!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration script hatası:', error.message);
        process.exit(1);
    }
}

// Migration'ı çalıştır
runAffiliateMigration(); 