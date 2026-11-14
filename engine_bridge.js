/**
 * SPACEGuard — Sovereign Edition
 * ENGINE BRIDGE — All modules in the same folder as this file.
 */

'use strict';

const { spawn }    = require('child_process');
const path         = require('path');
const readline     = require('readline');
const EventEmitter = require('events');
const scoringEngine = require('./scoring_engine');

// All modules live in the same directory as engine_bridge.js (project root)
const ROOT = path.join(__dirname);

const PYTHON = process.env.PYTHON_EXE || 'python';

// ── Module definitions ────────────────────────────────────────────────────────
const MODULE_DEFS = {
    realtime_monitor: {
        exe:  path.join(ROOT, 'realtime_monitor.exe'),
        args: [process.env.MONITOR_PATH || process.env.USERPROFILE || 'C:\\Users\\Public'],
        restartOnCrash: true,
    },
    anti_tamper: {
        exe:  path.join(ROOT, 'anti_tamper.exe'),
        args: [],
        restartOnCrash: false,
    },
    device_control: {
        exe:  path.join(ROOT, 'device_control.exe'),
        args: [],
        restartOnCrash: true,
    },
    honeypot: {
        exe:  path.join(ROOT, 'honeypot.exe'),
        args: [process.env.USERPROFILE || 'C:\\Users\\Public'], // Watch user directory
        restartOnCrash: true,
    },
    behavior_engine: {
        exe:  PYTHON,
        args: [path.join(ROOT, 'behavior_engine.py'), '--monitor', '--interval', '5'],
        restartOnCrash: true,
    },
    net_anomaly: {
        exe:  PYTHON,
        args: [path.join(ROOT, 'net_anomaly.py'), '--interval', '10'],
        restartOnCrash: true,
    },
    ai_engine: {
        exe:  PYTHON,
        args: [path.join(ROOT, 'ai_engine.py')],
        restartOnCrash: true,
    },
    memory_scanner: {
        exe:  PYTHON,
        args: [path.join(ROOT, 'memory_scanner.py')],
        restartOnCrash: true,
    },
    network_guard: {
        exe:  path.join(ROOT, 'NetworkGuard.exe'),
        args: ['5000'],
        restartOnCrash: true,
    },
};

// ── Bridge class ──────────────────────────────────────────────────────────────
class EngineBridge extends EventEmitter {
    constructor() {
        super();
        this._procs = new Map();
    }

    start(name) {
        const def = MODULE_DEFS[name];
        if (!def) return null;

        console.log(`[Bridge] Starting: ${name}`);

        const proc = spawn(def.exe, def.args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });

        this._procs.set(name, proc);

        const rl = readline.createInterface({ input: proc.stdout });
        rl.on('line', (line) => {
            if (!line.trim()) return;
            try {
                const ev = JSON.parse(line);
                ev._module = name;
                
                // Route to scoring engine
                scoringEngine.processEvent(ev);

                // Still emit raw events for debugging/UI if needed
                this.emit('engine-event', ev);
                this.emit(ev.type, ev);
            } catch {
                this.emit('engine-log', { _module: name, msg: line });
            }
        });

        proc.stderr.on('data', (d) =>
            this.emit('engine-log', { _module: name, level: 'error', msg: d.toString() }));

        proc.on('close', (code) => {
            this._procs.delete(name);
            this.emit('module-stopped', { name, code });
            if (def.restartOnCrash && code !== 0) {
                console.log(`[Bridge] Restarting ${name} in 3s…`);
                setTimeout(() => this.start(name), 3000);
            }
        });

        proc.on('error', (err) =>
            this.emit('engine-error', { _module: name, error: err.message }));

        return proc;
    }

    startAll() {
        for (const name of Object.keys(MODULE_DEFS)) {
            this.start(name);
        }
    }

    stop(name) {
        const p = this._procs.get(name);
        if (p) { p.kill('SIGTERM'); this._procs.delete(name); }
    }

    stopAll() {
        for (const n of this._procs.keys()) this.stop(n);
    }

    // On-demand: scan a single hash via cloud_intel.py
    async scanHash(hash) {
        return new Promise((resolve) => {
            const proc = spawn(PYTHON, [path.join(ROOT, 'cloud_intel.py'), '--hash', hash],
                               { stdio: 'pipe', windowsHide: true });
            let result = null;
            readline.createInterface({ input: proc.stdout }).on('line', (line) => {
                try {
                    const ev = JSON.parse(line);
                    if (['INTEL_THREAT','INTEL_CLEAN','INTEL_CACHE_HIT'].includes(ev.type))
                        result = ev;
                } catch {}
            });
            proc.on('close', () => resolve(result));
        });
    }

    // On-demand: shred a file
    async shredFile(filePath, mode = 'dod') {
        return new Promise((resolve) => {
            const flag = mode === 'zero' ? '--zero' : '--dod';
            const proc = spawn(path.join(ROOT, 'shredder.exe'), [filePath, flag],
                               { stdio: 'pipe', windowsHide: true });
            let result = null;
            readline.createInterface({ input: proc.stdout }).on('line', (line) => {
                try { result = JSON.parse(line); } catch {}
            });
            proc.on('close', () => resolve(result));
        });
    }

    // On-demand: static analysis of a PE file
    async analyzePE(filePath) {
        return new Promise((resolve) => {
            const proc = spawn(path.join(ROOT, 'pe_analyzer.exe'), [filePath],
                               { stdio: 'pipe', windowsHide: true });
            let result = null;
            readline.createInterface({ input: proc.stdout }).on('line', (line) => {
                try { result = JSON.parse(line); } catch {}
            });
            proc.on('close', () => resolve(result));
        });
    }

    // Launch SafePay sandbox browser
    openSafePay(url) {
        const proc = spawn(path.join(ROOT, 'SafePay.exe'), [url],
                           { stdio: 'pipe', windowsHide: true });
        readline.createInterface({ input: proc.stdout }).on('line', (line) => {
            try { this.emit('engine-event', { ...JSON.parse(line), _module: 'safepay' }); } catch {}
        });
    }

    // On-demand: Dump full process memory to disk using forensics.py
    async dumpMemory(pid, outPath = 'memory_dump.dmp') {
        return new Promise((resolve) => {
            const proc = spawn(PYTHON, [path.join(ROOT, 'forensics.py'), '--dump', pid, '--out', outPath],
                               { stdio: 'pipe', windowsHide: true });
            let result = null;
            readline.createInterface({ input: proc.stdout }).on('line', (line) => {
                try {
                    const ev = JSON.parse(line);
                    if (ev.type.startsWith('FORENSICS_')) result = ev;
                } catch {}
            });
            proc.on('close', () => resolve(result));
        });
    }

    // On-demand: Scan a file or dump with YARA-lite
    async scanYara(filePath) {
        return new Promise((resolve) => {
            const proc = spawn(PYTHON, [path.join(ROOT, 'forensics.py'), '--scan', filePath],
                               { stdio: 'pipe', windowsHide: true });
            let result = null;
            readline.createInterface({ input: proc.stdout }).on('line', (line) => {
                try {
                    const ev = JSON.parse(line);
                    if (ev.type === 'FORENSICS_SCAN_COMPLETE') result = ev;
                } catch {}
            });
            proc.on('close', () => resolve(result));
        });
    }

    // AI Engine API: Send a payload to the persistent AI Engine process
    async askAI(action, payload, filePath) {
        const proc = this._procs.get('ai_engine');
        if (!proc || !proc.stdin) {
            console.error('[EngineBridge] AI Engine not running or stdin unavailable.');
            return null;
        }

        return new Promise((resolve) => {
            // Because ai_engine is asynchronous and handles multiple requests, 
            // we create a temporary listener on standard output.
            // A more robust implementation would use request IDs, but for now this works.
            const onLine = (data) => {
                const str = data.toString();
                if (str.includes(filePath) || str.includes('AI_')) {
                    try {
                        const res = JSON.parse(str.trim());
                        proc.stdout.removeListener('data', onLine);
                        resolve(res);
                    } catch {}
                }
            };
            proc.stdout.on('data', onLine);
            
            // Timeout to prevent hanging
            setTimeout(() => {
                proc.stdout.removeListener('data', onLine);
                resolve({ error: "timeout", score: 0, classification: "UNKNOWN" });
            }, 5000);

            // Send payload to AI stdin
            const req = { action: action, payload: payload, path: filePath };
            proc.stdin.write(JSON.stringify(req) + '\n');
        });
    }

    status() {
        const res = {};
        for (const [name, proc] of this._procs.entries())
            res[name] = { pid: proc.pid, running: !proc.killed };
        return res;
    }
}

module.exports = new EngineBridge();
