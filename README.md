# Import bind9 zone file into Digital Ocean

`import-bind-zone.js` - A simple script to migrate DNS records from `bind9` into `Digital Ocean`  
`dynamic-dns.js`      - A simple script to dynamic update one or more DNS record


## Setup

Clone the repo:

```bash
git clone https://github.com/fszontagh/bind2digitalocean.git
cd bind2digitalocean
```

Install node dependencies:

```bash
npm install
```

Prepare the environment variable `DO_API_TOKEN`, which is needed to auth at the Digital Ocean API

```bash
export DO_API_TOKEN="..."
```

## Usage - testing
```
./import-bind-zone.js <path_to_the_zone_file>

```

## Usage - migrate
```
./import-bind-zone.js <path_to_the_zone_file> --live

```


# DYNDNS

To configure which IP wolud you like update from cron, please start the script without any parameter. The script will show a simple menu:

```bash
./dynamic-dns.js
```

Then select one or more record. Only `AAAA` or `A` records allowed. 

When you are ready, you can check it:

```bash
./dynamic-dns.js --cron
```
This will update the selected record(s) with your current public IO, which is fetched from `https://api.ipify.org` 

You can setup a cron job to do it autoamitc.  

### Initial menu

```
1) List domains to select record for DYNDNS
2) DYNDNS list
b) Exit
```

### Domain list
```
Please select an option: 1
1) domain.com
2) zbaz.tld
3) xy.abc.tld
4) abcdefg.tld
5) xyz.tld
6) yyyyyyy.tld
7) xxxx.tld
8) xxxx.domain.tld
b) Back

```
### DYNDNS list 
```
Please select an option: 2

1) xyz.domain.tld [A]
    ↳ Current IP: 89.147.65.217
    ↳ TTL: 900
    ↳ Last checked: 2025. 04. 23. 19:19:06
    ↳ Last updated: 2025. 04. 23. 19:23:10

b) Back
d) Delete an entry
t) Set TTL for an entry
```



