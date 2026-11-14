'use strict';
/**
 * SPACEGuard Sovereign Edition
 * Config Signer — signatures.json dosyası için RSA-SHA256 doğrulama
 *
 * Eğer public key dosyası yoksa doğrulamayı geç (geliştirme modu).
 */

const fs     = require('fs');
const crypto = require('crypto');

const ConfigSigner = {
    /**
     * Verify that a JSON file's `_signature` field matches its content
     * signed with the RSA private key corresponding to the given public key PEM.
     *
     * Format inside JSON: { ..data.., "_signature": "<base64 sig>" }
     *
     * @param {string} filePath   - Path to the JSON file
     * @param {string} pubKeyPath - Path to the RSA public key PEM file
     * @returns {boolean}
     */
    verifyFile(filePath, pubKeyPath) {
        try {
            // If public key doesn't exist → skip verification (dev mode)
            if (!fs.existsSync(pubKeyPath)) {
                console.warn('[ConfigSigner] Public key not found, skipping verification (dev mode).');
                return true;
            }

            const raw     = fs.readFileSync(filePath, 'utf8');
            const parsed  = JSON.parse(raw);
            const sigB64  = parsed._signature;

            if (!sigB64) {
                console.warn('[ConfigSigner] No _signature field in file — treating as unsigned.');
                return true; // allow unsigned in dev
            }

            // Build canonical payload (file content without _signature field)
            const payload = Object.assign({}, parsed);
            delete payload._signature;
            const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());

            const pubKey = fs.readFileSync(pubKeyPath, 'utf8');
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(payloadStr, 'utf8');
            const ok = verify.verify(pubKey, sigB64, 'base64');

            if (!ok) console.error('[ConfigSigner] Signature INVALID for', filePath);
            return ok;

        } catch (e) {
            console.error('[ConfigSigner] Error during verification:', e.message);
            // In dev / if key infrastructure not yet set up, allow loading
            return true;
        }
    },

    /**
     * Sign a JSON file (for use during build / update server).
     * Requires a private key PEM file path.
     */
    signFile(filePath, privKeyPath) {
        try {
            const raw    = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw);

            // Remove old signature if present
            delete parsed._signature;

            const payloadStr = JSON.stringify(parsed, Object.keys(parsed).sort());
            const privKey    = fs.readFileSync(privKeyPath, 'utf8');
            const sign       = crypto.createSign('RSA-SHA256');
            sign.update(payloadStr, 'utf8');
            const sig = sign.sign(privKey, 'base64');

            parsed._signature = sig;
            fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error('[ConfigSigner] Sign error:', e.message);
            return false;
        }
    }
};

module.exports = ConfigSigner;
