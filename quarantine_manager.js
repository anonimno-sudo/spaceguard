'use strict';
/**
 * SPACEGuard Sovereign Edition
 * Quarantine Manager — AES-256 şifrelemeli karantina kasası
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const QUARANTINE_DIR = path.join(app.getPath('userData'), 'quarantine');
const QUARANTINE_DB  = path.join(app.getPath('userData'), 'quarantine_db.json');
const AES_KEY        = crypto.scryptSync('SPACEGuard-Sovereign-2025', 'sg-salt-v1', 32);

// Ensure dir exists
if (!fs.existsSync(QUARANTINE_DIR)) fs.mkdirSync(QUARANTINE_DIR, { recursive: true });

function loadDB() {
    try {
        if (fs.existsSync(QUARANTINE_DB)) return JSON.parse(fs.readFileSync(QUARANTINE_DB, 'utf8'));
    } catch (e) {}
    return [];
}

function saveDB(data) {
    fs.writeFileSync(QUARANTINE_DB, JSON.stringify(data, null, 2), 'utf8');
}

function encryptFile(srcPath) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, iv);
    const input  = fs.readFileSync(srcPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    // Format: [16 bytes IV][encrypted data]
    return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(buf) {
    const iv        = buf.slice(0, 16);
    const data      = buf.slice(16);
    const decipher  = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

const quarantineManager = {
    /**
     * Move a file into quarantine (encrypted).
     * Returns { success, item } or { success:false, error }
     */
    addToQuarantine(filePath, threatName) {
        try {
            if (!fs.existsSync(filePath)) return { success: false, error: 'Dosya bulunamadı: ' + filePath };

            const id = crypto.randomUUID();
            const qFileName = id + '.qvault';
            const qFilePath = path.join(QUARANTINE_DIR, qFileName);

            const stat = fs.statSync(filePath);
            const md5  = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');

            // Encrypt & write to quarantine dir
            const encrypted = encryptFile(filePath);
            fs.writeFileSync(qFilePath, encrypted);

            // Remove original
            try { fs.unlinkSync(filePath); } catch (e) { /* may be locked */ }

            const item = {
                id,
                threatName: threatName || 'Unknown',
                originalPath: filePath,
                quarantinedPath: qFilePath,
                size: stat.size,
                md5,
                date: new Date().toISOString(),
            };

            const db = loadDB();
            db.push(item);
            saveDB(db);

            return { success: true, item };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /**
     * List all quarantined items.
     */
    list() {
        return loadDB();
    },

    /**
     * Restore a quarantined file to its original location.
     */
    restore(id) {
        try {
            const db   = loadDB();
            const item = db.find(x => x.id === id);
            if (!item) return { success: false, error: 'Kayıt bulunamadı: ' + id };

            if (!fs.existsSync(item.quarantinedPath))
                return { success: false, error: 'Karantina dosyası eksik.' };

            const enc = fs.readFileSync(item.quarantinedPath);
            const dec = decryptBuffer(enc);

            // Ensure target dir exists
            const targetDir = path.dirname(item.originalPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            fs.writeFileSync(item.originalPath, dec);
            fs.unlinkSync(item.quarantinedPath);

            const newDB = db.filter(x => x.id !== id);
            saveDB(newDB);

            return { success: true, restoredPath: item.originalPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /**
     * Permanently delete a quarantined file.
     */
    remove(id) {
        try {
            const db   = loadDB();
            const item = db.find(x => x.id === id);
            if (!item) return { success: false, error: 'Kayıt bulunamadı: ' + id };

            if (fs.existsSync(item.quarantinedPath)) {
                // Overwrite before delete (secure wipe)
                const size = fs.statSync(item.quarantinedPath).size;
                const fd   = fs.openSync(item.quarantinedPath, 'r+');
                fs.writeSync(fd, crypto.randomBytes(size), 0, size, 0);
                fs.closeSync(fd);
                fs.unlinkSync(item.quarantinedPath);
            }

            const newDB = db.filter(x => x.id !== id);
            saveDB(newDB);

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    count() {
        return loadDB().length;
    }
};

module.exports = quarantineManager;
