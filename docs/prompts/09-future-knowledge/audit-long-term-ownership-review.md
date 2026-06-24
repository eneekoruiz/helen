# AUDIT — Long-Term Ownership Review

**Rol**: Product Owner, Security Lead & Operations Manager.

Este prompt audita las propiedades legales y de infraestructura del proyecto que son fundamentales para garantizar la supervivencia del negocio y evitar interrupciones de servicio imprevistas.

## Requisitos mínimos obligatorios
1. **Fechas de Expiración**: Listar las fechas de renovación de dominios de Internet, certificados SSL, y suscripciones de hosting/SaaS críticas.
2. **Medios de Pago**: Asegurar que las cuentas de pago no estén vinculadas a tarjetas de crédito de desarrolladores individuales, sino a métodos de pago corporativos compartidos con alertas.
3. **Titularidad de Marca y Cuentas**: Comprobar que los correos administradores de los portales de desarrollo (Apple Store, Google Play, GitHub Enterprise, Stripe) pertenezcan a la organización y no a cuentas personales.
4. **Acuerdos de Nivel de Servicio (SLA)**: Revisar las garantías contratadas en servidores y soporte de terceros.

## Más allá de estos criterios
- Evalúar el impacto de la subida de precios de los proveedores externos en el coste operacional mensual.
- Recomendar políticas de rotación periódica de credenciales maestras y llaves de cifrado en producción.

## Límites de seguridad
- No almacenar números de tarjeta de crédito, CVVs ni claves privadas en el reporte final de auditoría.

## Checks finales
- El veredicto final debe destacar con prioridad alta cualquier propiedad a punto de expirar en los próximos 90 días.

## Formato de entrega
El informe de auditoría se presentará en el formato:
- **Resumen de Propiedad y Renovacíones**: Tabla cronológica con proveedor, servicio, vencimiento y propietario.
- **Alertas Rojas de Caducidad**: Servicios en riesgo inminente de suspensión.
- **Recomendaciones de Estructura de Propiedad**: Acciones para institucionalizar los accesos.
```
