const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { spawn } = require('child_process');
const { promisePool } = require('./db');

/**
 * Backup Service - Sistem yedekleme ve geri yükleme işlemleri
 * 
 * Özellikler:
 * - Tüm tenant dosyalarının yedeklenmesi (public, uploads, storage)
 * - Tüm MariaDB veritabanlarının mysqldump ile yedeklenmesi
 * - Timestamp'li backup klasörleri
 * - Detaylı logging
 * - Güvenli restore işlemi
 */
class BackupService {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.logDir = path.join(this.backupDir, 'logs');
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: 'root', // Root user for full database access
            password: 'c9c9d73f86c82534'
        };
        
        // Backup directories to include (complete application)
        this.backupDirectories = [
            'src',          // All application source code
            'views',        // All EJS templates  
            'public',       // Static assets (CSS, JS, images)
            'uploads',      // User uploaded files
            'storage',      // Application storage
            'flutter_app'   // Mobile app source code
        ];

        // Individual files to backup (configuration and important files)
        this.backupConfigFiles = [
            'package.json',
            'package-lock.json', 
            'index.js',
            'README.md',
            'rule.md',
            'SWAGGER.md',
            'BACKUP_SYSTEM.md',
            'IMPLEMENTATION_SUMMARY.md',
            'migrate-affiliate-system.js',
            'test-data.js'
        ];

        // Directories to exclude from backup
        this.excludeDirectories = [
            'node_modules',     // Dependencies (can be restored with npm install)
            'backups',          // Don't backup backups
            '.cursor',          // IDE files
            '.git',             // Git history
            '.well-known',      // SSL certificates
            'logs'              // Runtime logs
        ];
        
        // Ensure backup directories exist
        this.ensureDirectories();
    }

    /**
     * Initialize backup directories
     */
    async ensureDirectories() {
        try {
            await fs.ensureDir(this.backupDir);
            await fs.ensureDir(this.logDir);
            
            // Create backup directories if they don't exist
            for (const dir of this.backupDirectories) {
                const dirPath = path.join(process.cwd(), dir);
                await fs.ensureDir(dirPath);
            }
            
            console.log('✅ Backup directories initialized');
        } catch (error) {
            console.error('❌ Failed to initialize backup directories:', error.message);
            throw error;
        }
    }

    /**
     * Generate timestamp for backup folder
     */
    generateTimestamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/:/g, '-')
            .replace(/\..+/, '')
            .replace('T', '_');
    }

    /**
     * Sanitize filename for backup naming
     */
    sanitizeFileName(filename) {
        return filename
            .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50); // Limit length
    }

    /**
     * Log backup operations
     */
    async log(operation, message, isError = false) {
        const timestamp = new Date().toISOString();
        const logLevel = isError ? 'ERROR' : 'INFO';
        const logMessage = `[${timestamp}] ${logLevel}: ${message}\n`;
        
        const logFile = path.join(this.logDir, `${operation}.log`);
        await fs.appendFile(logFile, logMessage);
        
        if (isError) {
            console.error(`❌ ${operation}: ${message}`);
        } else {
            console.log(`✅ ${operation}: ${message}`);
        }
    }

    /**
     * Get all tenant databases
     */
    async getTenantDatabases() {
        try {
            const [databases] = await promisePool.execute('SHOW DATABASES');
            return databases
                .map(db => db.Database)
                .filter(dbName => dbName.startsWith('saas_'))
                .concat(['saas']); // Include main database
        } catch (error) {
            await this.log('backup', `Failed to get tenant databases: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * Create database backup using mysqldump
     */
    async backupDatabase(backupPath) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.log('backup', 'Starting database backup...');
                
                // Get all tenant databases
                const databases = await this.getTenantDatabases();
                await this.log('backup', `Found ${databases.length} databases: ${databases.join(', ')}`);

                const sqlFile = path.join(backupPath, 'all_databases.sql');
                const mysqldumpPath = 'mysqldump'; // Assumes mysqldump is in PATH

                const args = [
                    `--host=${this.dbConfig.host}`,
                    `--port=${this.dbConfig.port}`,
                    `--user=${this.dbConfig.user}`,
                    `--password=${this.dbConfig.password}`,
                    '--single-transaction',
                    '--routines',
                    '--triggers',
                    '--lock-tables=false',
                    '--add-drop-database',
                    '--databases',
                    ...databases
                ];

                const mysqldump = spawn(mysqldumpPath, args);
                const writeStream = fs.createWriteStream(sqlFile);

                mysqldump.stdout.pipe(writeStream);

                let errorOutput = '';
                mysqldump.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                mysqldump.on('close', async (code) => {
                    if (code === 0) {
                        const stats = await fs.stat(sqlFile);
                        await this.log('backup', `Database backup completed. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                        resolve(sqlFile);
                    } else {
                        await this.log('backup', `Database backup failed with code ${code}: ${errorOutput}`, true);
                        reject(new Error(`mysqldump failed with code ${code}: ${errorOutput}`));
                    }
                });

                mysqldump.on('error', async (error) => {
                    await this.log('backup', `Database backup process error: ${error.message}`, true);
                    reject(error);
                });

            } catch (error) {
                await this.log('backup', `Database backup setup error: ${error.message}`, true);
                reject(error);
            }
        });
    }

    /**
     * Create files backup using archiver
     */
    async backupFiles(backupPath) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.log('backup', 'Starting files backup...');
                
                const archivePath = path.join(backupPath, 'files.tar.gz');
                const output = fs.createWriteStream(archivePath);
                const archive = archiver('tar', {
                    gzip: true,
                    gzipOptions: {
                        level: 6
                    }
                });

                output.on('close', async () => {
                    const stats = await fs.stat(archivePath);
                    await this.log('backup', `Files backup completed. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                    resolve(archivePath);
                });

                archive.on('error', async (error) => {
                    await this.log('backup', `Files backup error: ${error.message}`, true);
                    reject(error);
                });

                archive.on('warning', async (warning) => {
                    await this.log('backup', `Files backup warning: ${warning.message}`);
                });

                archive.pipe(output);

                // Add directories to archive
                for (const dir of this.backupDirectories) {
                    const dirPath = path.join(process.cwd(), dir);
                    
                    if (await fs.pathExists(dirPath)) {
                        const stats = await fs.stat(dirPath);
                        if (stats.isDirectory()) {
                            archive.directory(dirPath, dir);
                            await this.log('backup', `Added directory to archive: ${dir}`);
                        }
                    } else {
                        await this.log('backup', `Directory not found, creating empty: ${dir}`);
                        await fs.ensureDir(dirPath);
                        archive.directory(dirPath, dir);
                    }
                }

                // Add individual files to archive
                for (const file of this.backupConfigFiles) {
                    const filePath = path.join(process.cwd(), file);
                    
                    if (await fs.pathExists(filePath)) {
                        const stats = await fs.stat(filePath);
                        if (stats.isFile()) {
                            archive.file(filePath, { name: file });
                            await this.log('backup', `Added file to archive: ${file}`);
                        }
                    } else {
                        await this.log('backup', `File not found, skipping: ${file}`);
                    }
                }

                await archive.finalize();

            } catch (error) {
                await this.log('backup', `Files backup setup error: ${error.message}`, true);
                reject(error);
            }
        });
    }

    /**
     * Create full system backup
     */
    async createBackup(customName = null) {
        const timestamp = this.generateTimestamp();
        const backupId = customName ? `${timestamp}_${this.sanitizeFileName(customName)}` : timestamp;
        const backupPath = path.join(this.backupDir, backupId);
        
        try {
            await this.log('backup', `Starting full system backup: ${backupId}${customName ? ` (${customName})` : ''}`);
            
            // Create backup directory
            await fs.ensureDir(backupPath);
            
            // Backup database and files in parallel for better performance
            const [sqlFile, archiveFile] = await Promise.all([
                this.backupDatabase(backupPath),
                this.backupFiles(backupPath)
            ]);

            // Create backup info file
            const backupInfo = {
                id: backupId,
                timestamp: timestamp,
                name: customName,
                created: new Date().toISOString(),
                databases: await this.getTenantDatabases(),
                directories: this.backupDirectories,
                configFiles: this.backupConfigFiles,
                files: {
                    database: path.basename(sqlFile),
                    archive: path.basename(archiveFile)
                }
            };

            await fs.writeJson(path.join(backupPath, 'backup-info.json'), backupInfo, { spaces: 2 });
            
            await this.log('backup', `Backup completed successfully: ${backupId}${customName ? ` (${customName})` : ''}`);
            
            return {
                success: true,
                backupId: backupId,
                path: backupPath,
                info: backupInfo
            };

        } catch (error) {
            await this.log('backup', `Backup failed: ${error.message}`, true);
            
            // Clean up failed backup
            if (await fs.pathExists(backupPath)) {
                await fs.remove(backupPath);
            }
            
            throw error;
        }
    }

    /**
     * Restore database from SQL file
     */
    async restoreDatabase(sqlFile) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.log('restore', `Starting database restore from: ${sqlFile}`);
                
                const mysqlPath = 'mysql'; // Assumes mysql is in PATH
                
                const args = [
                    `--host=${this.dbConfig.host}`,
                    `--port=${this.dbConfig.port}`,
                    `--user=${this.dbConfig.user}`,
                    `--password=${this.dbConfig.password}`,
                    '--force' // Continue even if errors occur
                ];

                const mysql = spawn(mysqlPath, args);
                const readStream = fs.createReadStream(sqlFile);

                readStream.pipe(mysql.stdin);

                let errorOutput = '';
                mysql.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                mysql.on('close', async (code) => {
                    if (code === 0) {
                        await this.log('restore', 'Database restore completed successfully');
                        resolve();
                    } else {
                        await this.log('restore', `Database restore failed with code ${code}: ${errorOutput}`, true);
                        reject(new Error(`mysql restore failed with code ${code}: ${errorOutput}`));
                    }
                });

                mysql.on('error', async (error) => {
                    await this.log('restore', `Database restore process error: ${error.message}`, true);
                    reject(error);
                });

            } catch (error) {
                await this.log('restore', `Database restore setup error: ${error.message}`, true);
                reject(error);
            }
        });
    }

    /**
     * Restore files from archive
     */
    async restoreFiles(archiveFile) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.log('restore', `Starting files restore from: ${archiveFile}`);
                
                const tar = require('tar');
                
                // Extract archive to project root
                await tar.extract({
                    file: archiveFile,
                    cwd: process.cwd(),
                    overwrite: true
                });

                await this.log('restore', 'Files restore completed successfully');
                resolve();

            } catch (error) {
                await this.log('restore', `Files restore error: ${error.message}`, true);
                reject(error);
            }
        });
    }

    /**
     * Restore from backup
     */
    async restoreBackup(backupId) {
        const backupPath = path.join(this.backupDir, backupId);
        
        try {
            await this.log('restore', `Starting system restore from backup: ${backupId}`);
            
            // Check if backup exists
            if (!(await fs.pathExists(backupPath))) {
                throw new Error(`Backup not found: ${backupId}`);
            }

            // Check backup integrity
            const infoFile = path.join(backupPath, 'backup-info.json');
            const sqlFile = path.join(backupPath, 'all_databases.sql');
            const archiveFile = path.join(backupPath, 'files.tar.gz');

            if (!(await fs.pathExists(infoFile)) || 
                !(await fs.pathExists(sqlFile)) || 
                !(await fs.pathExists(archiveFile))) {
                throw new Error('Backup is incomplete or corrupted');
            }

            const backupInfo = await fs.readJson(infoFile);
            
            // Restore database and files
            await this.restoreDatabase(sqlFile);
            await this.restoreFiles(archiveFile);
            
            await this.log('restore', `System restore completed successfully: ${backupId}`);
            
            return {
                success: true,
                backupId: backupId,
                restoredInfo: backupInfo
            };

        } catch (error) {
            await this.log('restore', `Restore failed: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * List all available backups
     */
    async listBackups() {
        try {
            const backupDirs = await fs.readdir(this.backupDir);
            const backups = [];

            for (const dir of backupDirs) {
                if (dir === 'logs') continue; // Skip logs directory
                
                const backupPath = path.join(this.backupDir, dir);
                const stat = await fs.stat(backupPath);
                
                if (stat.isDirectory()) {
                    const infoFile = path.join(backupPath, 'backup-info.json');
                    
                    let backupInfo = {
                        id: dir,
                        created: stat.mtime.toISOString(),
                        size: 0
                    };

                    if (await fs.pathExists(infoFile)) {
                        const info = await fs.readJson(infoFile);
                        backupInfo = { ...backupInfo, ...info };
                    }

                    // Calculate total backup size
                    const files = await fs.readdir(backupPath);
                    for (const file of files) {
                        const filePath = path.join(backupPath, file);
                        const fileStat = await fs.stat(filePath);
                        if (fileStat.isFile()) {
                            backupInfo.size += fileStat.size;
                        }
                    }

                    backups.push(backupInfo);
                }
            }

            return backups.sort((a, b) => new Date(b.created) - new Date(a.created));

        } catch (error) {
            console.error('Failed to list backups:', error.message);
            return [];
        }
    }

    /**
     * Rename a backup
     */
    async renameBackup(backupId, newName) {
        try {
            const backupPath = path.join(this.backupDir, backupId);
            
            if (!await fs.pathExists(backupPath)) {
                return false;
            }

            // Read current backup info
            const infoFile = path.join(backupPath, 'backup-info.json');
            let backupInfo = {};
            
            if (await fs.pathExists(infoFile)) {
                backupInfo = await fs.readJson(infoFile);
            }

            // Update the name in backup info
            backupInfo.name = newName;
            
            // If the original backup ID was timestamp-based and we're adding a name, update the ID
            if (newName && !backupInfo.name) {
                const timestamp = backupInfo.timestamp || this.generateTimestamp();
                const newBackupId = `${timestamp}_${this.sanitizeFileName(newName)}`;
                const newBackupPath = path.join(this.backupDir, newBackupId);
                
                // Rename the directory
                await fs.move(backupPath, newBackupPath);
                backupInfo.id = newBackupId;
                
                // Write updated info to new location
                await fs.writeJson(path.join(newBackupPath, 'backup-info.json'), backupInfo, { spaces: 2 });
                
                await this.log('backup', `Backup renamed from ${backupId} to ${newBackupId} (${newName})`);
                
                return { newBackupId, name: newName };
            } else {
                // Just update the name without changing directory
                await fs.writeJson(infoFile, backupInfo, { spaces: 2 });
                
                await this.log('backup', `Backup name updated for ${backupId}: ${newName}`);
                
                return { newBackupId: backupId, name: newName };
            }

        } catch (error) {
            await this.log('backup', `Failed to rename backup ${backupId}: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * Delete backup
     */
    async deleteBackup(backupId) {
        try {
            const backupPath = path.join(this.backupDir, backupId);
            
            if (await fs.pathExists(backupPath)) {
                await fs.remove(backupPath);
                await this.log('backup', `Backup deleted: ${backupId}`);
                return true;
            }
            
            return false;
        } catch (error) {
            await this.log('backup', `Failed to delete backup ${backupId}: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * Get backup logs
     */
    async getBackupLogs(operation = 'backup', lines = 100) {
        try {
            const logFile = path.join(this.logDir, `${operation}.log`);
            
            if (await fs.pathExists(logFile)) {
                const content = await fs.readFile(logFile, 'utf8');
                const logLines = content.split('\n').filter(line => line.trim() !== '');
                
                // Return last N lines
                return logLines.slice(-lines);
            }
            
            return [];
        } catch (error) {
            console.error(`Failed to read ${operation} logs:`, error.message);
            return [];
        }
    }
}

module.exports = BackupService; 