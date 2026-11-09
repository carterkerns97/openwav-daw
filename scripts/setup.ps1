$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js 22.13 or newer is required: https://nodejs.org/'
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host 'pnpm was not found. Enabling it through Corepack...'
  corepack enable
  corepack prepare pnpm@10 --activate
}

pnpm install --frozen-lockfile
pnpm build
pnpm desktop:renderer

if ((Get-Command cmake -ErrorAction SilentlyContinue) -and
    ((Get-Command cl -ErrorAction SilentlyContinue) -or
     (Get-Command clang++ -ErrorAction SilentlyContinue))) {
  pnpm native:configure
  pnpm native:build
  pnpm native:test
} else {
  Write-Warning 'CMake/C++ compiler not detected. Web and desktop verification passed; native verification will run in GitHub CI.'
}

Write-Host 'Openwave setup complete. Run: pnpm desktop:dev'
