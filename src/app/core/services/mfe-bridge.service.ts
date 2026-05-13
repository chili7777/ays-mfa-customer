import { Injectable, signal, InjectionToken } from '@angular/core';

export interface SessionData {
  role: string | null;
  clientId: string | null;
  userName: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MfeBridgeService {
  private readonly _sessionData = signal<SessionData>({
    role: null,
    clientId: null,
    userName: null
  });

  // Lista de orígenes permitidos (Shells de confianza)
  private readonly trustedOrigins = [
    'http://localhost:4200',
    'https://ays-shl-account-management.ondigitalocean.app' // Ejemplo
  ];

  readonly sessionData = this._sessionData.asReadonly();

  constructor() {
    this.initMessageListener();
    this.sendHandshake();
  }

  private initMessageListener() {
    window.addEventListener('message', (event) => {
      // 1. Validación de seguridad: origen
      if (!this.isTrustedOrigin(event.origin)) {
        // console.warn('[MFE Bridge] Mensaje ignorado de origen no confiable:', event.origin);
        return;
      }

      // 2. Validación de estructura
      const { type, payload } = event.data || {};

      if (type === 'SHELL_SESSION_DATA' && payload) {
        const current = this._sessionData();
        // Solo actualizar si hay cambios reales para evitar re-ejecuciones de effects innecesarias
        if (
          current.role === (payload.role || 'USER') &&
          current.clientId === (payload.clientId || null) &&
          current.userName === (payload.userName || 'Usuario')
        ) {
          return;
        }

        // console.log('[MFE Bridge] Datos de sesión actualizados:', payload);
        this._sessionData.set({
          role: payload.role || 'USER',
          clientId: payload.clientId || null,
          userName: payload.userName || 'Usuario'
        });
      }
    });
  }

  private sendHandshake() {
    // Si el MFE se carga lento, avisa a la Shell que ya está listo para recibir datos
    console.log('[MFE Bridge] Enviando MFE_READY a la Shell');
    window.parent.postMessage({ type: 'MFE_READY' }, '*');
    // Nota: Usamos '*' para el handshake inicial si no conocemos el origen exacto de la shell,
    // pero la Shell responderá validando su propia seguridad.
  }

  /**
   * Solicita a la Shell navegar a una ruta específica con parámetros.
   * Útil para navegación entre Microfrontends.
   */
  navigateTo(path: string, queryParams?: any) {
    console.log('[MFE Bridge] Solicitando navegación a la Shell:', { path, queryParams });
    window.parent.postMessage({
      type: 'MFE_NAVIGATE',
      payload: { path, queryParams }
    }, '*');
  }

  private isTrustedOrigin(origin: string): boolean {
    // En producción esto debería ser más estricto
    return this.trustedOrigins.includes(origin) ||
           origin.endsWith('.ondigitalocean.app') ||
           origin.includes('localhost');
  }
}
