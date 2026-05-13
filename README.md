# ays-mfa-customer (Micro-frontend de Gestión de Clientes)

Este proyecto es un Micro-frontend (MFE) desarrollado con Angular, encargado de la gestión de clientes dentro del ecosistema **AYS**.

## 🚀 Cómo correr el proyecto

### Requisitos previos
- **Node.js**: v20+ (recomendado)
- **npm**: v10+
- **Docker**: (Opcional, para ejecución en contenedores)

### Desarrollo Local
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm start
   ```
   El proyecto estará disponible en `http://localhost:5002`.

### Ejecución con Docker
Para simular el entorno de producción localmente:
```bash
docker-compose up --build
```
El MFE será accesible en `http://localhost:8082`.

---

## 🏗️ Arquitectura

Este proyecto sigue una arquitectura de **Micro-frontends**. No está diseñado para funcionar de forma aislada, sino para ser consumido por una **Shell Application** (Contenedor principal).

### Componentes Clave:
- **MfeBridgeService**: Es el núcleo de la comunicación. Utiliza el protocolo `window.postMessage` para:
  - Recibir datos de sesión (token, rol, usuario) desde la Shell.
  - Notificar a la Shell cuando el MFE está listo (`MFE_READY`).
  - Solicitar navegaciones inter-MFE (ej. navegar a la sección de "Cuentas" que reside en otro MFE).
- **Angular 19+**: Utiliza las últimas características de Angular como **Signals** para la gestión de estado reactiva y componentes independientes (Standalone).
- **Estilos**: Sistema de diseño basado en SCSS con soporte para temas oscuros y utilidades personalizadas (en `src/styles.scss`).

### Flujo de Navegación:
Cuando un usuario hace clic en un cliente para ver sus cuentas, el MFE solicita a la Shell realizar el cambio de contexto pasando los parámetros necesarios (como `clientId`).

---

## 💡 Qué se debe tener en cuenta

1. **Puerto de Desarrollo**: El puerto asignado es el `5002`. Este puerto debe coincidir con lo configurado en la Shell para la carga del MFE.
2. **Seguridad de Origen**: El `MfeBridgeService` valida que los mensajes provengan de orígenes de confianza (localhost o dominios `.ondigitalocean.app`) para prevenir ataques de inyección de mensajes.
3. **Roles y Permisos**: Las funcionalidades administrativas (Editar, Eliminar, Cambiar estado) dependen del rol recibido en los datos de sesión.
4. **Navegación Preservada**: Se utilizan estrategias de `queryParamsHandling: 'preserve' | 'merge'` para mantener los tokens y contexto de la sesión durante la navegación.
5. **Proxy**: Existe un archivo `proxy.conf.json` para evitar problemas de CORS durante el desarrollo local al apuntar a APIs externas.

---

## 🌐 Despliegue

El proyecto está configurado para desplegarse automáticamente en **Digital Ocean App Platform**.

- **URL Principal (Shell/Login)**: [https://ays-shl-account-manage-35jnj.ondigitalocean.app/login](https://ays-shl-account-manage-35jnj.ondigitalocean.app/login)
- **Infraestructura**:
  - **Servidor Web**: Nginx 1.27 (Alpine) configurado para aplicaciones SPA.
  - **CI/CD**: GitHub Actions gestiona los builds y despliegues por rama (`main` -> producción).
  - **Registro de Imágenes**: GitHub Container Registry (GHCR).

---

## 📂 Ecosistema de Proyectos

Este micro-frontend forma parte de un ecosistema más amplio. A continuación, se detallan los proyectos relacionados:

- **[ays-shl-account-management](https://github.com/chili7777/ays-shl-account-management)**: Aplicación **Shell** principal que orquesta y contiene todos los micro-frontends.
- **[ays-mfa-customer](https://github.com/chili7777/ays-mfa-customer)**: Micro-frontend para la gestión de **clientes** (este repositorio).
- **[ays-mfa-account](https://github.com/chili7777/ays-mfa-account)**: Micro-frontend dedicado a la administración de **cuentas** bancarias.
- **[ays-mfa-movements](https://github.com/chili7777/ays-mfa-movements)**: Micro-frontend para la visualización y gestión de **movimientos** y transacciones.
- **[ays-msa-dm-cuaa-cr-account](https://github.com/chili7777/ays-msa-dm-cuaa-cr-account)**: Microservicio (Backend) encargado de la lógica de negocio de **cuentas**.
- **[ays-msa-dm-pain-cr-movement](https://github.com/chili7777/ays-msa-dm-pain-cr-movement)**: Microservicio (Backend) encargado de procesar **movimientos** y transacciones.
- **[ays-custom-instructions](https://github.com/chili7777/ays-custom-instructions)**: Repositorio con instrucciones personalizadas y configuraciones transversales del proyecto.

---

## 🔐 Credenciales de Acceso

Para probar las diferentes funcionalidades según el rol, se pueden utilizar las siguientes credenciales:

### Perfil Administrador (BackOffice)
- **Usuario:** `0103322228`
- **Contraseña:** `asdfghjk`

### Perfil Usuario (App de Transferencias)
- **Opción 1:**
  - **Usuario:** `1718048232`
  - **Contraseña:** `qwertyui`
- **Opción 2:**
  - **Usuario:** `1718048315`
  - **Contraseña:** `zxcvbnmq`

---

## 🛠️ Comandos Útiles

- **Build de producción**: `npm run build`
- **Linting**: `npm run lint` (si está configurado)
- **Pruebas unitarias**: `npm test` (usa Vitest)
