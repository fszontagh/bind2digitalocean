#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const DO_API_TOKEN = process.env.DO_API_TOKEN;
if (!DO_API_TOKEN) {
    console.error("ERROR: DO_API_TOKEN env variable is missing.");
    process.exit(1);
}

const IS_LIVE = process.argv.includes("--live");

const parseZoneFile = (filename) => {
    const content = fs.readFileSync(filename, "utf-8");
    const lines = content.split(/\r?\n/);
    const records = [];

    const originMatch = content.match(/^\$ORIGIN\s+([^\s]+)$/m);
    let origin = originMatch ? originMatch[1] : "";

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith(";") || line.startsWith("$")) continue;

        const parts = line.split(/\s+/);
        if (parts.length < 4) continue;

        let name = parts[0];
        const type = parts[2];
        const data = parts.slice(3).join(" ");

        if (name === "@") {
            name = origin;
        } else if (!name.endsWith(".")) {
            name += "." + origin;
        }

        records.push({ name, type, data });
    }

    return { origin, records };
};

const getZoneNameFromFile = (filename) => {
    const match = filename.match(/\/([^\/]+)\.hosts$/);
    return match ? match[1] : null;
};

const createZone = async (zone) => {

    if (!IS_LIVE) {
        console.log(`[SIMULATION] Zone created: ${zone} JSON: ` + JSON.stringify({ name: zone }));
        return true;
    } else {
        console.log(`Zone created: ${zone} JSON: ` + JSON.stringify({ name: zone }));
    }

    const res = await fetch("https://api.digitalocean.com/v2/domains", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${DO_API_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: zone })
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`Failed to create the zone: (${zone}): ${err}`);
        return false;
    }

    console.log(`Zone created: ${zone}`);
    return true;
};

async function createRecord(domain, record) {
    let name = record.name.replace(`.${domain}.`, "").replace(/\.$/, "");
    if (name === domain) name = "@";

    let data = record.data;

    if (["A", "AAAA"].includes(record.type)) {
        data = record.data.trim();
    }

    const body = {
        type: record.type,
        name,
    };

    if (record.type == "NS") {
        if (body.name == '') {
            body.name = '@';
        }
    }

    if (record.type == "MX") {
        let t = data.split(" ");
        if (t.length == 2) {
            const [priority, _data] = t;
            data = _data;
            body.priority = parseInt(priority);
        }
    }


    if (record.type === "CAA") {
        const caaParts = data.split(/\s+/);
        if (caaParts.length >= 3) {
            const [flagsStr, tag, ...rest] = caaParts;
            const flags = parseInt(flagsStr, 10);
            const value = rest.join(" ");

            body.flags = flags;
            body.tag = tag;
            body.data = value + ".";
            if (body.name == "" || body.name == domain) {
                body.name = '@';
            }
        } else {
            console.error(`Invalid CAA record: ${record.name} -> ${data}`);
            return;
        }
    } else {
        body.data = data;
    }


    if (!IS_LIVE) {
        console.log(`[SIMULATION] [${domain}] Record: ${record.type} ${name} -> ${data} JSON: ` + JSON.stringify(body));
        return;
    } else {
        console.log(`[${domain}] Record: ${record.type} ${name} -> ${data} JSON: ` + JSON.stringify(body));
    }

    try {
        const response = await fetch(`https://api.digitalocean.com/v2/domains/${domain}/records`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DO_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();
        if (!response.ok) {
            console.error(`Can not create record: ${record.name} ${record.type} -> ${data}:`, result);
        } else {
            console.log(`Record done: ${record.name} ${record.type} -> ${data}`);
        }
    } catch (error) {
        console.error("Error on the request", error.message);
    }
}


const main = async () => {
    const args = process.argv.slice(2).filter(arg => arg !== "--live");
    if (args.length === 0) {
        console.error("Usage: ./import-bind-zone.js zone1.hosts [zone2.hosts ...] [--live]");
        process.exit(1);
    }

    for (const file of args) {
        console.log(`\nParsing: ${file}`);
        const zoneName = getZoneNameFromFile(file);
        if (!zoneName) {
            console.error(`Can not get the zone name from the zone file: ${file}`);
            continue;
        }

        const { records } = parseZoneFile(file);
        const created = await createZone(zoneName);
        if (!created) continue;

        for (const record of records) {
            if (["SOA", "RRSIG", "DNSKEY", "IN", "SSHFP"].includes(record.type)) continue;
            await createRecord(zoneName, record);
        }
    }
};

main();
