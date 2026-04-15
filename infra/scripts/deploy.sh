#!/usr/bin/env bash
set -euo pipefail

LOCATION="${1:?Debes indicar la ubicación, por ejemplo: swedencentral}"
TEMPLATE_FILE="${2:-./bicep/main.bicep}"
PARAMETERS_FILE="${3:-./parameters/dev.parameters.json}"
DEPLOY_MODE="${DEPLOY_MODE:-create}"
RANDOM_SUFFIX="${RANDOM_SUFFIX:-false}"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "ERROR: No existe el archivo template: $TEMPLATE_FILE"
  exit 1
fi

if [[ ! -f "$PARAMETERS_FILE" ]]; then
  echo "ERROR: No existe el archivo de parámetros: $PARAMETERS_FILE"
  exit 1
fi

if [[ -z "${SQL_ADMIN_PASSWORD:-}" ]]; then
  read -s -p "SQL Password: " SQL_ADMIN_PASSWORD
  echo
fi

if [[ -z "$SQL_ADMIN_PASSWORD" ]]; then
  echo "ERROR: SQL_ADMIN_PASSWORD está vacío"
  exit 1
fi

# Requiere jq para leer JSON
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq no está instalado. Es necesario para leer $PARAMETERS_FILE"
  exit 1
fi

WORKLOAD_NAME="$(jq -r '.parameters.workloadName.value // empty' "$PARAMETERS_FILE")"
ENVIRONMENT_NAME="$(jq -r '.parameters.environmentName.value // empty' "$PARAMETERS_FILE")"

if [[ -z "$WORKLOAD_NAME" ]]; then
  echo "ERROR: workloadName no está definido en $PARAMETERS_FILE"
  exit 1
fi

if [[ -z "$ENVIRONMENT_NAME" ]]; then
  echo "ERROR: environmentName no está definido en $PARAMETERS_FILE"
  exit 1
fi

RESOURCE_GROUP_NAME="rg-${WORKLOAD_NAME}-${ENVIRONMENT_NAME}"
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

if [[ "$RANDOM_SUFFIX" == "true" ]]; then
  if command -v uuidgen >/dev/null 2>&1; then
    UNIQUE_SEED="$(uuidgen)"
  else
    UNIQUE_SEED="$(python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
)"
  fi
  echo "Modo RandomSuffix habilitado. uniqueSeed generado: $UNIQUE_SEED"
else
  UNIQUE_SEED="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP_NAME}"
  echo "Modo suffix estable. uniqueSeed calculado: $UNIQUE_SEED"
fi

echo "Creando/validando resource group ${RESOURCE_GROUP_NAME} en ${LOCATION}..."
az group create --name "${RESOURCE_GROUP_NAME}" --location "${LOCATION}" >/dev/null

echo "Ejecutando despliegue Bicep..."

if [[ "$DEPLOY_MODE" == "what-if" ]]; then
  az deployment group what-if \
    --resource-group "${RESOURCE_GROUP_NAME}" \
    --template-file "${TEMPLATE_FILE}" \
    --parameters @"${PARAMETERS_FILE}" \
    --parameters sqlAdminPassword="${SQL_ADMIN_PASSWORD}" \
    --parameters uniqueSeed="${UNIQUE_SEED}" \
    --parameters location="${LOCATION}"
else
  az deployment group create \
    --resource-group "${RESOURCE_GROUP_NAME}" \
    --template-file "${TEMPLATE_FILE}" \
    --parameters @"${PARAMETERS_FILE}" \
    --parameters sqlAdminPassword="${SQL_ADMIN_PASSWORD}" \
    --parameters uniqueSeed="${UNIQUE_SEED}" \
    --parameters location="${LOCATION}"
fi