# Deadlock API Assets Worker

## Setup
```
pnpm install
pnpm dev
```

## Seeding data

This will seed your local r2 bucket which is used by pnpm dev

```
wrangler r2 object put assets/assets-api-data/latest_version.txt --local --file test-r2-data/assets-api-data/latest_version.txt
wrangler r2 object put assets/assets-api-data/versions/1234/heroes/english.json --local --file test-r2-data/assets-api-data/versions/1234/heroes/english.json
```

## Build
