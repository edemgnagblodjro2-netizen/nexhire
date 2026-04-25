#!/bin/bash
set -e

pnpm install --frozen-lockfile

# Run drizzle-kit push from the workspace root using pnpm exec so that
# the (potentially hoisted) drizzle-kit binary is resolved correctly even
# when stale per-package bin symlinks exist under lib/db/node_modules/.bin.
pnpm exec drizzle-kit push --config ./lib/db/drizzle.config.ts
