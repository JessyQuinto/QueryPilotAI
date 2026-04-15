# 🚀 Despliegue de Infraestructura con Bicep

Este repositorio contiene una implementación de **Infraestructura como Código (IaC)** utilizando **Bicep** para desplegar una solución completa en Azure.

Incluye soporte para:

- Arquitectura modular
- Estrategia de naming reutilizable
- Manejo de ambientes mediante parámetros
- Suffix estable o aleatorio
- Recursos de aplicación, datos, monitoreo, seguridad e IA
- Importación automatizada de base de datos `.bacpac`

---

# 📁 Estructura del Proyecto

```text
├── bicep/
│   ├── main.bicep
│   └── modules/
│       ├── ai-services.bicep
│       ├── appserviceplan-linux.bicep
│       ├── appserviceplan-windows.bicep
│       ├── functionapp-windows-dotnet.bicep
│       ├── keyvault.bicep
│       ├── keyvault-rbac.bicep
│       ├── keyvault-secrets.bicep
│       ├── monitoring.bicep
│       ├── naming.bicep
│       ├── sql.bicep
│       ├── storage.bicep
│       └── webapp-linux-node.bicep
├── dbs/
│   └── Clinic.bacpac
├── parameters/
│   └── dev.parameters.json
├── scripts/
│   ├── deploy.ps1
│   ├── deploy.sh
│   └── import-bacpac.ps1
└── README.md
```

---

# 🏗️ Arquitectura Desplegada

La solución despliega:

- Azure Storage Account  
- Azure Key Vault  
- Azure SQL Server & Database  
- Azure OpenAI  
- Azure AI Content Safety  
- Application Insights  
- Log Analytics Workspace  
- Azure Function App (.NET / Windows)  
- Azure Web App (Node.js / Linux)  
- App Service Plans (Windows & Linux)

### 🔐 Seguridad

- Acceso a secretos mediante **RBAC en Key Vault**
- Secrets centralizados

---

# 🧩 Estrategia de Naming

Se utiliza un módulo `naming.bicep` para generar nombres consistentes.

### 🔹 Recursos con guiones

<workload>-<environment>-<resourceType>-<suffix>

Ejemplo:

insightforge-dev-func-ab123  
insightforge-dev-sql-ab123  

### 🔹 Recursos con restricciones (ej. Storage)

<workload><environment><resourceType><suffix>

Ejemplo:

insightforgedevstab123  

---

# 🔁 Estrategia de Suffix

| Tipo       | Descripción |
|------------|------------|
| Estable    | Basado en Resource Group |
| Aleatorio  | Generado por ejecución |

### ✔ Recomendación

Usar `RandomSuffix` cuando:

- Estás probando  
- Existen recursos en soft-delete  
- Necesitas evitar colisiones  

---

# ⚙️ Requisitos Previos

- Azure CLI  
- Bicep CLI  

```bash
az login
az account show
```

---

# 📄 Parámetros

Archivo:

```
./parameters/dev.parameters.json
```

Contiene:

- workloadName  
- environmentName  
- openAiDeploymentName  
- webLinuxFxVersion  
- etc.  

⚠️ La contraseña SQL **NO** se almacena aquí.

---

# 🚀 Despliegue de Infraestructura

## 🔍 What-If (Suffix Estable)

```powershell
.\scripts\deploy.ps1 `
  -Location swedencentral `
  -SqlAdminPassword (Read-Host "SQL Password" -AsSecureString) `
  -ParametersFile './parameters/dev.parameters.json' `
  -WhatIf
```

---

## ✅ Deploy (Suffix Estable)

```powershell
.\scripts\deploy.ps1 `
  -Location swedencentral `
  -SqlAdminPassword (Read-Host "SQL Password" -AsSecureString) `
  -ParametersFile './parameters/dev.parameters.json'
```

---

## 🔍 What-If (Random Suffix)

```powershell
.\scripts\deploy.ps1 `
  -Location swedencentral `
  -SqlAdminPassword (Read-Host "SQL Password" -AsSecureString) `
  -ParametersFile './parameters/dev.parameters.json' `
  -RandomSuffix `
  -WhatIf
```

---

## ✅ Deploy (Random Suffix)

```powershell
.\scripts\deploy.ps1 `
  -Location swedencentral `
  -SqlAdminPassword (Read-Host "SQL Password" -AsSecureString) `
  -ParametersFile './parameters/dev.parameters.json' `
  -RandomSuffix
```

---

# 🐧 Despliegue con Bash

```bash
export DEPLOY_MODE=create
export RANDOM_SUFFIX=true

./scripts/deploy.sh swedencentral ./bicep/main.bicep ./parameters/dev.parameters.json
```

---

# 🗄️ Importación de Base de Datos

Archivo:

```
./dbs/Clinic.bacpac
```

Script:

```
./scripts/import-bacpac.ps1
```

## ▶ Ejecución básica

```powershell
.\scripts\import-bacpac.ps1 `
  -SqlAdminPassword (Read-Host "SQL Password" -AsSecureString) `
  -ParametersFile './parameters/dev.parameters.json'
```

## ▶ Ejecución avanzada

```powershell
.\scripts\import-bacpac.ps1 `
  -SqlAdminPassword (Read-Host "SQL Password" -AsSecureString) `
  -ParametersFile './parameters/dev.parameters.json' `
  -BacpacFile './dbs/Clinic.bacpac' `
  -DatabaseName 'ClinicDB' `
  -ServiceObjective 'S0'
```

---

# ✅ Validaciones Post-Despliegue

### Infraestructura

- Resource Group  
- Storage Account  
- Key Vault  
- SQL Server & DB  
- OpenAI & Content Safety  
- Monitoring (App Insights + Log Analytics)  

### Key Vault

- Secrets creados correctamente  

### Aplicaciones

- Function App (.NET)  
- Web App (Node.js)  

### Base de Datos

- Creación exitosa  
- Importación `.bacpac` correcta  

---

# ⚠️ Consideraciones Importantes

## Soft-delete (OpenAI / Cognitive Services)

- Puede causar errores en despliegues  

Solución:

- Usar `-RandomSuffix`  
- O purgar recursos  

## Seguridad

- Nunca almacenar passwords en repositorio  

## Linter Warnings

- Uso de `listKeys()` en outputs  
- Recomendado: eliminar exposición de secretos  

---