# 🚀 bind2digitalocean - DNS Sync & DYNDNS for DigitalOcean

A practical Node.js-based toolset for:
- Seamlessly importing `BIND9` zone files into DigitalOcean's DNS system
- **DYNDNS**: Automatically keeping your A/AAAA records up to date with your current IP address

---

## 🌐 DYNDNS - Dynamic DNS Updates

The `dynamic-dns.js` script allows you to automatically update DNS records when your public IP changes.

### ⚙️ Configuration

Run the script with no parameters to select which records to update:

```bash
./dynamic-dns.js
```

You'll be prompted with a simple menu to choose the records (only `A` or `AAAA` types are supported):

#### 📋 Main Menu
```
1) List domains to select record for DYNDNS
2) DYNDNS list
b) Exit
```

#### 🌍 Domain Selection
```
1) domain.com
2) xyz.tld
3) example.tld
b) Back
```

#### 📡 DYNDNS List
```
1) xyz.domain.tld [A]
    ↳ Current IP: 89.147.65.217
    ↳ TTL: 900
    ↳ Last checked: 2025. 04. 23. 19:19:06
    ↳ Last updated: 2025. 04. 23. 19:23:10

b) Back
d) Delete an entry
t) Set TTL for an entry
```

### 🕒 Cron Mode

Once you've selected your records, run the script in cron mode:

```bash
./dynamic-dns.js --cron
```

This will fetch your public IP from `https://api.ipify.org` and update the chosen records.
It's recommended to schedule this via `cron` (e.g., every 5 minutes).

---

## 📦 Import BIND9 Zone Files into DigitalOcean

The `import-bind-zone.js` script lets you migrate BIND9-style zone files into DigitalOcean's DNS system.

### ⚙️ Setup

1. Clone the repo:
```bash
git clone https://github.com/fszontagh/bind2digitalocean.git
cd bind2digitalocean
```

2. Install dependencies:
```bash
npm install
```

3. Set up the required API token as an environment variable:
```bash
export DO_API_TOKEN="your_digitalocean_token"
```

---

### ▶️ Usage

#### Dry-run (test import):

```bash
./import-bind-zone.js <path_to_the_zone_file>
```

#### Live migration (create records on DigitalOcean):

```bash
./import-bind-zone.js <path_to_the_zone_file> --live
```

---

## 💬 Feedback & Contributions

Feel free to open issues, suggest improvements, or fork the repo to contribute!

---
