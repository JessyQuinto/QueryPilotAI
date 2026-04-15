# Modelo relacional

## Entidades
- `customers`: clientes analizados.
- `accounts`: cuentas por cliente.
- `merchants`: comercios.
- `devices`: huellas de dispositivo.
- `transactions`: hechos transaccionales.
- `chargebacks`: contracargos asociados a transacciones.
- `fraud_alerts`: alertas generadas por reglas.
- `risk_signals`: señales analíticas adicionales.
- `analytics_requests_audit`: auditoría de solicitudes del agente.
- `analytics_approvals`: decisiones de aprobación.

## Relaciones
- `customers 1..n accounts`
- `customers 1..n devices`
- `customers 1..n transactions`
- `accounts 1..n transactions`
- `merchants 1..n transactions`
- `devices 1..n transactions`
- `transactions 1..0..1 chargebacks`
- `customers 1..n fraud_alerts`
- `transactions 1..n fraud_alerts`
- `customers 1..n risk_signals`
- `analytics_requests_audit 1..n analytics_approvals`
