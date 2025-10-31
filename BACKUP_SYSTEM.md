# SaaS Platform Backup System

## Overview

Süper admin paneli için geliştirilmiş kapsamlı yedekleme sistemi. Tüm tenant dosyaları ve veritabanlarının otomatik yedeklenmesi ve geri yüklenmesi için tasarlanmıştır.

## Features

- **Full System Backup**: Tüm dosyalar (`/public`, `/uploads`, `/storage`) ve veritabanları
- **Compressed Archives**: `.tar.gz` formatında sıkıştırılmış dosya yedekleri
- **Database Dump**: `mysqldump` ile tüm tenant veritabanlarının yedeklenmesi
- **Timestamp Management**: Her backup benzersiz timestamp ile organizasyon
- **Web Interface**: Kullanıcı dostu admin panel arayüzü
- **Security**: Sadece süper admin erişimi, rate limiting
- **Logging**: Detaylı işlem logları
- **Restore Functionality**: Tek tıkla sistem geri yükleme

## Architecture

### Directory Structure
```
/backups/
├── 2025-01-28_14-22-51/
│   ├── files.tar.gz          # Compressed file archive
│   ├── all_databases.sql     # Database dump
│   ├── backup-info.json      # Backup metadata
│   └── backup.log           # Operation logs
├── 2025-01-28_15-30-12/
└── logs/
    ├── backup.log           # All backup operations
    └── restore.log          # All restore operations
```

### Components

#### 1. BackupService (`src/utils/backup.js`)
Core backup functionality:
- File compression using `archiver`
- Database backup using `mysqldump`
- Restore operations using `tar` and `mysql`
- Logging and error handling

#### 2. Admin Routes (`src/routes/backup.js`)
REST API endpoints:
- `GET /admin/backup` - Backup management page
- `POST /admin/backup/api/create` - Create new backup
- `POST /admin/backup/api/restore/:id` - Restore from backup
- `GET /admin/backup/api/list` - List all backups
- `DELETE /admin/backup/api/delete/:id` - Delete backup
- `GET /admin/backup/api/logs/:operation` - View logs

#### 3. Admin Authentication (`src/middleware/adminAuth.js`)
Security middleware:
- Super admin access control
- AJAX/HTMX request validation
- Rate limiting (3 operations per 5 minutes)
- Referrer validation

#### 4. Frontend UI (`views/admin/backup.ejs`)
Interactive web interface:
- Real-time backup list
- Progress indicators
- Log viewer
- Confirmation dialogs

## Installation

### 1. Dependencies
```bash
npm install archiver fs-extra tar
```

### 2. System Requirements
- `mysqldump` command available in PATH
- `mysql` command available in PATH
- Write permissions for `/backups` directory
- Root database access for full backup

### 3. Directory Setup
```bash
mkdir -p backups uploads storage
chmod 755 backups uploads storage
```

### 4. Integration
Add to `src/routes/admin.js`:
```javascript
const adminBackupRouter = require('./backup');
router.use('/backup', adminBackupRouter);
```

## Configuration

### Database Configuration
Update `src/utils/backup.js`:
```javascript
this.dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: 'root', // Root user for full access
    password: 'your_root_password'
};
```

### Backup Directories
Complete system backup includes:

**Application Source Code:**
```javascript
this.backupDirectories = [
    'src',         // Backend application code
    'views',       // EJS templates  
    'flutter_app', // Mobile app source
    'public',      // Static assets
    'uploads',     // User uploads
    'storage'      // System files
];
```

**Configuration Files:**
```javascript
this.backupFiles = [
    'package.json',              // NPM dependencies
    'index.js',                  // Main server file
    'README.md',                 // Documentation
    'BACKUP_SYSTEM.md',         // Backup documentation
    'IMPLEMENTATION_SUMMARY.md', // Implementation details
    'SWAGGER.md',               // API documentation
    '.env.example'              // Environment template
];
```

**Excluded Directories:**
```javascript
this.excludeDirectories = [
    'node_modules', // NPM packages (reinstalled from package.json)
    'backups',      // Prevents self-reference
    '.cursor',      // IDE configuration
    '.git',         // Version control
    'logs'          // Log files
];
```

## Usage

### Access Backup System
1. Navigate to admin panel: `https://your-domain.com/admin/dashboard`
2. Click on "Yedekleme" in the sidebar
3. Access backup page: `https://your-domain.com/admin/backup`

### Create Backup
1. (Optional) Enter backup name in text field
2. Click "Yedek Al" button
3. Wait for progress indicator
4. Backup will appear in the list with custom name or timestamp
5. New backup includes complete system: all source code, templates, configs, and data

### Restore System
1. Select backup from the list
2. Click "Geri Yükle" button
3. Confirm the operation (warning: overwrites current data)
4. Wait for completion and page reload

### View Logs
1. Click "Logları Görüntüle" button
2. View real-time operation logs
3. Monitor backup/restore progress

## API Usage

### Create Backup
```bash
curl -X POST https://your-domain.com/admin/backup/api/create \
  -H "Content-Type: application/json" \
  -H "HX-Request: true"
```

### List Backups
```bash
curl https://your-domain.com/admin/backup/api/list
```

### Restore Backup
```bash
curl -X POST https://your-domain.com/admin/backup/api/restore/2025-01-28_14-22-51 \
  -H "Content-Type: application/json" \
  -H "HX-Request: true"
```

## Security

### Access Control
- Only super admin can access backup functions
- Referrer header validation
- AJAX/HTMX request requirement

### Rate Limiting
- Maximum 3 backup operations per 5 minutes per IP
- Prevents system overload
- Returns 429 status code when exceeded

### Data Protection
- Backups stored locally only
- No external upload/download
- File system permissions protection

## Monitoring

### Log Files
- **Backup logs**: `/backups/logs/backup.log`
- **Restore logs**: `/backups/logs/restore.log`
- **Operation logs**: In each backup directory

### Log Format
```
[2025-01-28T14:22:51.000Z] INFO: Starting database backup...
[2025-01-28T14:22:52.000Z] INFO: Found 5 databases: saas, saas_test1, saas_demo, saas_dbtest, saas_main
[2025-01-28T14:22:55.000Z] INFO: Database backup completed. Size: 2.34 MB
```

## Troubleshooting

### Common Issues

#### 1. "mysqldump not found"
```bash
# Install MySQL client tools
sudo apt-get install mysql-client

# Verify installation
which mysqldump
```

#### 2. "Permission denied"
```bash
# Fix backup directory permissions
sudo chown -R www-data:www-data /path/to/backups
sudo chmod -R 755 /path/to/backups
```

#### 3. "Database connection failed"
- Verify root database credentials
- Check database server connectivity
- Ensure user has backup privileges

#### 4. "Rate limit exceeded"
- Wait 5 minutes between operations
- Check IP address restrictions
- Review rate limiting configuration

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 403 | Access denied | Verify admin authentication |
| 429 | Rate limit exceeded | Wait and retry |
| 500 | Server error | Check logs for details |
| 404 | Backup not found | Verify backup ID |

## Performance

### Optimization Tips
1. **Schedule backups during low traffic**
2. **Monitor disk space usage**
3. **Regular cleanup of old backups**
4. **Database size considerations**

### Resource Usage
- **CPU**: High during compression
- **Memory**: ~100-500MB depending on data size
- **Disk**: 2x data size temporarily during backup
- **Network**: Minimal (local operations only)

## Maintenance

### Regular Tasks
1. **Monitor disk space**: Backup directory growth
2. **Log rotation**: Prevent log files from growing too large
3. **Backup cleanup**: Remove old backups as needed
4. **Test restores**: Verify backup integrity periodically

### Automated Cleanup
Add to crontab for automatic cleanup:
```bash
# Remove backups older than 30 days
0 2 * * * find /path/to/backups -name "2*" -type d -mtime +30 -exec rm -rf {} \;
```

## Advanced Configuration

### Custom Backup Intervals
```javascript
// Auto-refresh every 30 seconds in UI
setInterval(() => {
    if (!isOperationInProgress) {
        refreshBackupList();
    }
}, 30000);
```

### Email Notifications
```javascript
// Add email notification after backup completion
async function sendBackupNotification(result) {
    // Implement email sending logic
}
```

### External Storage Integration
```javascript
// Extend BackupService for cloud storage
async function uploadToS3(backupPath) {
    // Implement S3 upload logic
}
```

## Support

### Documentation
- **System Requirements**: Check dependencies
- **Configuration**: Verify all settings
- **Logs**: Monitor operation logs

### Contact
- **Development Team**: Apollo12 Team
- **Issues**: Check system logs first
- **Feature Requests**: Submit through admin panel

---

## Version History

**v1.0.0** - Initial release
- Full backup/restore functionality
- Web interface
- Security implementation
- Logging system

---

**Last Updated**: January 28, 2025  
**Compatibility**: Node.js 18+, MySQL/MariaDB 8+ 