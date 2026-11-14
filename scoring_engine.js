/**
 * SPACEGuard — Sovereign Edition
 * MODULE 6 & 8: Central Threat Scoring Engine & MITRE ATT&CK Mapper
 * 
 * Aggregates events from all security modules, calculates risk scores (0-100),
 * maps activities to MITRE ATT&CK tactics/techniques, and makes automated
 * remediation decisions.
 */

'use strict';

const EventEmitter = require('events');

// ── MITRE ATT&CK Mapping & Base Scores ─────────────────────────────────────
const MITRE_MAP = {
    HONEYPOT_HIT: {
        id: "T1486",
        tactic: "Impact",
        technique: "Data Encrypted for Impact",
        baseScore: 100, // Instant critical
        autoKill: true
    },
    THREAT_CONNECTION: {
        id: "T1071",
        tactic: "Command and Control",
        technique: "Application Layer Protocol",
        baseScore: 60,
        autoKill: true // NetworkGuard already blocks it, but we should kill the PID
    },
    DGA_DETECTED: {
        id: "T1568.002",
        tactic: "Command and Control",
        technique: "Domain Generation Algorithms",
        baseScore: 75,
        autoKill: false
    },
    ANOMALY_HEURISTIC: {
        id: "T1059",
        tactic: "Execution",
        technique: "Command and Scripting Interpreter or Anomaly",
        baseScore: 40,  // Might need multiple hits to reach 80
        autoKill: false
    },
    USB_THREAT_HIDDEN_EXE: {
        id: "T1091",
        tactic: "Initial Access",
        technique: "Replication Through Removable Media",
        baseScore: 80,
        autoKill: false // Just file detection
    },
    RANSOMWARE_SUSPECTED: {
        id: "T1486",
        tactic: "Impact",
        technique: "Data Encrypted for Impact",
        baseScore: 90,
        autoKill: true
    },
    INTEL_THREAT: {
        id: "T1204",
        tactic: "User Execution",
        technique: "Malicious File",
        baseScore: 85,
        autoKill: false
    }
};

// ── Scoring Engine Class ──────────────────────────────────────────────────
class ScoringEngine extends EventEmitter {
    constructor() {
        super();
        this.entityScores = new Map(); // tracks score per PID or file path
        this.THRESHOLD_CRITICAL = 80;  // Score at which we take automatic action
        this.DECAY_RATE = 5;           // How much score drops assuming inactivity (optional future feature)
    }

    /**
     * Feed a raw JSON event from the IPC bridge into the scoring engine.
     */
    processEvent(event) {
        if (!event || !event.type) return;

        const mapping = MITRE_MAP[event.type];
        if (!mapping) {
            // Unmapped event (e.g. system logs, start/stop events), just pass it through
            return;
        }

        // Determine the entity tracking key (PID is best, fallback to file path/domain)
        const entityId = event.pid ? `PID:${event.pid}` : 
                         event.path ? `FILE:${event.path}` : 
                         event.domain ? `DOMAIN:${event.domain}` : `UNKNOWN`;

        // Calculate dynamic score (some modules provide their own confidence score to add)
        let eventScore = mapping.baseScore;
        if (event.score && typeof event.score === 'number' && event.score <= 1.0) {
            // Convert 0.0-1.0 confidence to a 0-100 scale addition
            eventScore += (event.score * 20); 
        }

        // Accumulate score
        let currentScore = this.entityScores.get(entityId) || 0;
        currentScore += eventScore;
        
        // Cap at 100
        if (currentScore > 100) currentScore = 100;
        
        this.entityScores.set(entityId, currentScore);

        // Build the enriched Alert Object
        const alert = {
            id: `ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            sourceModule: event._module || 'unknown',
            entityId: entityId,
            rawEvent: event,
            mitre: {
                id: mapping.id,
                tactic: mapping.tactic,
                technique: mapping.technique
            },
            score: currentScore,
            severity: this._getSeverity(currentScore),
            actionTaken: 'LOGGED'
        };

        // Automated Response Logic
        if (currentScore >= this.THRESHOLD_CRITICAL || mapping.autoKill) {
            alert.actionTaken = this._executeRemediation(entityId, event);
        }

        console.log(`[ScoringEngine] Threat Detected: [${alert.mitre.id}] Score: ${alert.score} Entity: ${entityId}`);
        
        // Emit enriched alert to be sent to Electron UI
        this.emit('threat-alert', alert);
    }

    _getSeverity(score) {
        if (score >= 80) return 'CRITICAL';
        if (score >= 50) return 'HIGH';
        if (score >= 30) return 'MEDIUM';
        return 'LOW';
    }

    _executeRemediation(entityId, event) {
        // If it's a PID, kill it
        if (entityId.startsWith('PID:')) {
            const pid = parseInt(entityId.split(':')[1], 10);
            if (!pid) return 'FAILED';
            
            try {
                // Node.js process kill
                process.kill(pid, 'SIGKILL');
                return 'PROCESS_KILLED';
            } catch (err) {
                // It might already be dead, or we lack permissions (Anti-Tamper handles PPL bypasses)
                return 'KILL_FAILED_OR_DEAD';
            }
        }
        
        // If it's a File, we could quarantine it (stretch goal)
        if (entityId.startsWith('FILE:')) {
            return 'MARKED_FOR_QUARANTINE';
        }

        // If it's a Domain, NetworkGuard already blocked it.
        if (entityId.startsWith('DOMAIN:')) {
            return 'NETWORK_BLOCKED';
        }

        return 'NO_ACTION_MAPPED';
    }

    // Call this periodically to decay old scores (e.g. every minute)
    decayScores() {
        for (const [entityId, score] of this.entityScores.entries()) {
            let newScore = score - this.DECAY_RATE;
            if (newScore <= 0) {
                this.entityScores.delete(entityId);
            } else {
                this.entityScores.set(entityId, newScore);
            }
        }
    }
}

module.exports = new ScoringEngine();
