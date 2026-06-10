#!/usr/bin/env bash
# Maison CRM — Arnés de Verificación Global
# Ejecuta compilación estática antes de cualquier sesión de desarrollo.
# Exit Code 0 = entorno sano. Cualquier otro código = detener y reportar.

set -euo pipefail

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Utilidades ────────────────────────────────────────────────────────────────
pass() { echo -e "  ${GREEN}✔${RESET}  $1"; }
fail() { echo -e "  ${RED}✘${RESET}  $1"; }
info() { echo -e "  ${CYAN}→${RESET}  $1"; }
warn() { echo -e "  ${YELLOW}!${RESET}  $1"; }

ERRORS=0

run_step() {
  local label="$1"
  shift
  info "$label"
  if "$@" > /tmp/maison_step.log 2>&1; then
    pass "$label"
  else
    fail "$label"
    echo -e "${RED}--- stdout/stderr ---${RESET}"
    cat /tmp/maison_step.log
    echo -e "${RED}---------------------${RESET}"
    ERRORS=$(( ERRORS + 1 ))
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║      Maison CRM — Arnés de Verificación         ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ── 0. Pre-flight: Gate C1 (Arnés Configurado) ────────────────────────────────
echo -e "${BOLD}[0/5] Pre-flight — Gate C1${RESET}"

if ! command -v pnpm &>/dev/null; then
  fail "pnpm no encontrado. Instálalo con: npm install -g pnpm"
  exit 1
fi
pass "pnpm $(pnpm --version) disponible"

# C1: Archivos base y documentación operativa
C1_REQUIRED_FILES=(
  CLAUDE.md AGENTS.md CHECKPOINTS.md feature_list.json init.sh CHANGELOG.md
  docs/architecture.md docs/conventions.md docs/db-schema.md docs/design.md
  .claude/rules/backend.md .claude/rules/frontend.md
  progress/current.md progress/history.md
)
C1_MISSING=()
for f in "${C1_REQUIRED_FILES[@]}"; do
  [ -f "$f" ] || C1_MISSING+=("$f")
done
if [ ${#C1_MISSING[@]} -eq 0 ]; then
  pass "Archivos base de control, docs operativos, skills y bitácoras presentes (C1)"
else
  fail "C1: faltan archivos requeridos: ${C1_MISSING[*]}"
  ERRORS=$(( ERRORS + 1 ))
fi

# C1: apps/server/.env existe con claves mínimas
ENV_FILE="apps/server/.env"
if [ -f "$ENV_FILE" ]; then
  ENV_REQUIRED_VARS=(CLERK_SECRET_KEY MONGODB_URI FRONTEND_URL)
  ENV_MISSING=()
  for var in "${ENV_REQUIRED_VARS[@]}"; do
    value=$(grep -E "^${var}=" "$ENV_FILE" | head -n1 | cut -d'=' -f2-)
    [ -n "$value" ] || ENV_MISSING+=("$var")
  done
  if [ ${#ENV_MISSING[@]} -eq 0 ]; then
    pass "apps/server/.env contiene todas las claves requeridas y no vacías (C1)"
  else
    fail "C1: apps/server/.env — faltan o están vacías: ${ENV_MISSING[*]}"
    ERRORS=$(( ERRORS + 1 ))
  fi
else
  fail "C1: apps/server/.env no existe"
  ERRORS=$(( ERRORS + 1 ))
fi

# ── 1. Compilación estática — Backend (Express) ──────────────────────────────
echo ""
echo -e "${BOLD}[1/5] Compilación estática — Server (Express + TypeScript)${RESET}"
run_step "pnpm --filter @estetica/server build" pnpm --filter @estetica/server build
echo ""

# ── 2. Compilación estática — Frontend (Vite + React) ───────────────────────
echo -e "${BOLD}[2/5] Compilación estática — Client (Vite + React + TypeScript)${RESET}"
run_step "pnpm --filter @estetica/client build" pnpm --filter @estetica/client build
echo ""

# ── 3. Lint — Frontend ──────────────────────────────────────────────────────
echo -e "${BOLD}[3/5] Lint — Client (ESLint)${RESET}"
run_step "pnpm --filter @estetica/client lint" pnpm --filter @estetica/client lint
echo ""

# ── 4. Suite de pruebas — API ───────────────────────────────────────────────
echo -e "${BOLD}[4/5] Tests — Server${RESET}"
run_step "pnpm --filter @estetica/server test" pnpm --filter @estetica/server test --passWithNoTests
echo ""

# ── 5. Suite de pruebas — Frontend ──────────────────────────────────────────
echo -e "${BOLD}[5/5] Tests — Client${RESET}"
run_step "pnpm --filter @estetica/client test" pnpm --filter @estetica/client test --passWithNoTests
echo ""

# ── Resultado final ───────────────────────────────────────────────────────────
echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}ESTADO: VERDE — Monorepo sano. Exit Code 0.${RESET}"
  echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
  echo ""
  exit 0
else
  echo -e "  ${RED}${BOLD}ESTADO: ROJO — ${ERRORS} paso(s) fallaron. Detén la sesión.${RESET}"
  echo -e "${BOLD}═══════════════════════════════════════════════════${RESET}"
  echo ""
  exit 1
fi
