#!/usr/bin/env sh
set -eu

command -v node >/dev/null 2>&1 || {
  echo 'Node.js 22.13 or newer is required: https://nodejs.org/' >&2
  exit 1
}

if ! command -v pnpm >/dev/null 2>&1; then
  echo 'pnpm was not found. Enabling it through Corepack...'
  corepack enable
  corepack prepare pnpm@10 --activate
fi

pnpm install --frozen-lockfile
pnpm build
pnpm desktop:renderer

if command -v cmake >/dev/null 2>&1 && command -v c++ >/dev/null 2>&1; then
  pnpm native:configure
  pnpm native:build
  pnpm native:test
else
  echo 'CMake/C++ compiler not detected. Native verification will run in GitHub CI.' >&2
fi

echo 'Openwave setup complete. Run: pnpm desktop:dev'
