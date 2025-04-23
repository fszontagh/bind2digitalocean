#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.dynconf');
const DO_API_TOKEN = process.env.DO_API_TOKEN;

if (!DO_API_TOKEN) {
    console.error('ERROR: DigitalOcean API token not set in env (DO_API_TOKEN).');
    process.exit(1);
}

const api = axios.create({
    baseURL: 'https://api.digitalocean.com/v2/',
    headers: {
        'Authorization': `Bearer ${DO_API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

async function getPublicIP() {
    const response = await axios.get('https://api.ipify.org');
    return response.data.trim();
}

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return { domains: [] };
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function listDomains() {
    const res = await api.get('domains?per_page=200');
    return res.data.domains;
}

async function listRecords(domain) {
    const res = await api.get(`domains/${domain}/records?per_page=200`);
    return res.data.domain_records.filter(r => ['A', 'AAAA'].includes(r.type));
}

async function updateRecord(domain, recordId, type, name, data, ttl = undefined) {
    const payload = { type, name, data };
    if (ttl !== undefined) payload.ttl = ttl;

    await api.put(`domains/${domain}/records/${recordId}`, payload);
    console.log(`✔ Record updated: ${domain} -> ${data}${ttl ? ` (TTL=${ttl})` : ''}`);
}


function formatTime(unix) {
    const d = new Date(unix * 1000);
    return d.toLocaleString();
}

function clearScreen() {
    if (process.stdout.isTTY) {
        // Cross-platform clear screen
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            require('child_process').execSync('cls', { stdio: 'inherit' });
        } else {
            process.stdout.write('\x1Bc');
        }
    }
}

async function interactiveMenu() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q) => new Promise(res => rl.question(q, res));

    while (true) {
        clearScreen();
        console.log('\n1) List domains to select record for DYNDNS');
        console.log('2) DYNDNS list');
        console.log('b) Exit');
        const choice = await question('Please select an option: ');

        if (choice === '1') {
            clearScreen();
            const domains = await listDomains();
            domains.forEach((d, i) => console.log(`${i + 1}) ${d.name}`));
            console.log('b) Back');
            const domainInput = await question('Domain id: ');
            if (domainInput.toLowerCase() === 'b') continue;

            const dindex = parseInt(domainInput) - 1;
            if (isNaN(dindex) || dindex < 0 || dindex >= domains.length) {
                console.error('❌ Invalid domain selection.');
                continue;
            }

            const domain = domains[dindex].name;
            const records = await listRecords(domain);
            records.forEach((r, i) => {
                let name = r.name == "@" ? domain : `${r.name}.${domain}`;
                console.log(`${i + 1}) [${r.type}] ${name} -> ${r.data} TTL=${r.ttl} ID=${r.id}`);
            });
            console.log('b) Back');
            const recordInput = await question('Record id for DYNDNS (A/AAAA): ');
            if (recordInput.toLowerCase() === 'b') continue;

            const rindex = parseInt(recordInput) - 1;
            if (isNaN(rindex) || rindex < 0 || rindex >= records.length) {
                console.error('❌ Invalid record selection.');
                continue;
            }

            const record = records[rindex];
            if (!['A', 'AAAA'].includes(record.type)) {
                console.log('❌ Only \'A\' or \'AAAA\' type records.');
                continue;
            }

            const config = loadConfig();
            let existing = config.domains.find(d => d.record_id === record.id);
            if (existing) {
                if (!existing.history) existing.history = [];
                existing.history.push(existing.cached_ip);
                existing.last_updated = Date.now() / 1000;
                existing.cached_ip = record.data;
                existing.last_checked = Date.now() / 1000;
            } else {
                config.domains.push({
                    domain,
                    name: record.name,
                    record_id: record.id,
                    type: record.type,
                    ttl: record.ttl,
                    cached_ip: record.data,
                    last_checked: Date.now() / 1000,
                    last_updated: Date.now() / 1000,
                    history: []
                });
            }
            saveConfig(config);
            console.log('✔ DYNDNS record stored in: ' + CONFIG_PATH);

        } else if (choice === '2') {
            clearScreen();
            const config = loadConfig();
            if (config.domains.length === 0) {
                console.log('ℹ No records configured.');
                continue;
            }

            config.domains.forEach((d, i) => {
                const fqdn = d.name === "@" ? d.domain : `${d.name}.${d.domain}`;
                console.log(`\n${i + 1}) ${fqdn} [${d.type}]`);
                console.log(`    ↳ Current IP: ${d.cached_ip}`);
                console.log(`    ↳ TTL: ${d.ttl}`);
                console.log(`    ↳ Last checked: ${formatTime(d.last_checked)}`);
                console.log(`    ↳ Last updated: ${formatTime(d.last_updated || d.last_checked)}`);
                if (d.history && d.history.length > 0) {
                    console.log(`    ↳ Previous IPs: ${d.history.join(', ')}`);
                }
            });

            console.log('\nb) Back');
            console.log('d) Delete an entry');
            console.log('t) Set TTL for an entry');
            const subChoice = await question('Choice: ');

            if (subChoice.toLowerCase() === 't') {
                const which = await question('Enter record number to update TTL: ');
                const i = parseInt(which) - 1;
                if (!isNaN(i) && i >= 0 && i < config.domains.length) {
                    const ttlInput = await question('New TTL in seconds (e.g. 1800): ');
                    const ttl = parseInt(ttlInput);
                    if (!isNaN(ttl) && ttl >= 30) {
                        const entry = config.domains[i];
                        try {
                            await updateRecord(
                                entry.domain,
                                entry.record_id,
                                entry.type,
                                entry.name,
                                entry.cached_ip,
                                ttl
                            );
                            entry.ttl = ttl;
                            entry.last_updated = Date.now() / 1000;
                            saveConfig(config);
                            console.log(`✔ TTL updated to ${ttl} seconds (also on DigitalOcean).`);
                        } catch (err) {
                            console.error(`❌ Failed to update TTL on DigitalOcean: ${err.message}`);
                        }
                    } else {
                        console.error('❌ Invalid TTL.');
                    }
                } else {
                    console.error('❌ Invalid selection.');
                }
            }

            if (subChoice.toLowerCase() === 'b') {
                clearScreen();
                continue;
            }

            if (subChoice.toLowerCase() === 'd') {
                clearScreen();
                const toDelete = await question('Enter record number to delete: ');
                const delIndex = parseInt(toDelete) - 1;
                if (!isNaN(delIndex) && delIndex >= 0 && delIndex < config.domains.length) {
                    const removed = config.domains.splice(delIndex, 1);
                    saveConfig(config);
                    console.log(`✔ Removed ${removed[0].name}.${removed[0].domain} from config.`);
                } else {
                    console.error('❌ Invalid selection.');
                }
            }
        } else if (choice.toLowerCase() === 'b') {
            rl.close();
            break;
        } else {
            console.error('❌ Invalid choice.');
        }
    }
}
async function cronUpdate() {
    const config = loadConfig();
    const now = Date.now() / 1000;
    const publicIP = await getPublicIP();

    for (const entry of config.domains) {
        const expired = (now - entry.last_checked) > entry.ttl;
        if (!expired && entry.cached_ip === publicIP) continue;

        const record = (await listRecords(entry.domain)).find(r => r.id === entry.record_id);
        if (record.data !== publicIP) {
            await updateRecord(
                entry.domain,
                entry.record_id,
                entry.type,
                record.name,
                publicIP,
                entry.ttl
            );
            entry.cached_ip = publicIP;
            entry.last_updated = now;
        } else {
            console.log(`ℹ ${entry.domain} record is same.`);
        }
        entry.last_checked = now;
    }

    saveConfig(config);
}


(async () => {
    const args = process.argv.slice(2);
    if (args.includes('--cron')) {
        await cronUpdate();
    } else {
        await interactiveMenu();
    }
})();
