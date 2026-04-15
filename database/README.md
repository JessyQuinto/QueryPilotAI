# Base de Datos

Este directorio contiene:
- tablas core del dominio fraude,
- vistas certificadas para consultas del agente,
- tablas de auditoría,
- seguridad lógica,
- datos semilla.

## Orden sugerido de ejecución
1. `schema/001_tables.sql`
2. `schema/002_relationships.sql`
3. `schema/003_views.sql`
4. `schema/004_security.sql`
5. `seed/001_seed_reference.sql`
6. `seed/002_seed_transactions.sql`
7. `seed/003_seed_audit.sql`
