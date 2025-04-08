# Deadlock API Assets Worker

## Setup
```
pnpm install
pnpm dev
```

## Seeding data

This will seed your local r2 bucket which is used by pnpm dev

```
find test-r2-data -type f -exec sh -c \
    'wrangler r2 object put "preview-assets/${1#test-r2-data/}" --local --file "$1"' sh {} \;
```

## Build
