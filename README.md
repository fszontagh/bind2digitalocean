# Import bind9 zone file into Digital Ocean

A simple script to migare from `bind9` into `Digital Ocean`


## Setup

clone the repo:

```bash
git clone https://github.com/fszontagh/bind2digitalocean.git
cd bind2digitalocean
```

Install node deps:

```bash
npm install
```

Prepare the environment variable `DO_API_TOKEN`, which is a Digital Ocean API key.

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

