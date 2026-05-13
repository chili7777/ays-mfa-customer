import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MfeBridgeService } from '../services/mfe-bridge.service';
import { ErrorModelDto } from '../interfaces/error.interface';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const bridge = inject(MfeBridgeService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocurrió un error inesperado';
      let errorTitle = 'Error';
      const errorData: ErrorModelDto = error.error;

      // Intentar extraer información del esquema ErrorModelDto
      if (errorData && typeof errorData === 'object') {
        errorMessage = errorData.detail || errorMessage;
        errorTitle = errorData.title || errorTitle;
      }

      switch (error.status) {
        case 400:
          // Manejo de Errores de Negocio (HTTP 400)
          // Se muestra notificación con el texto de detail
          bridge.showNotification({
            title: errorTitle,
            message: errorMessage,
            type: 'warning'
          });
          break;

        case 401:
          // Unauthorized: El usuario debe ser redirigido automáticamente al login
          bridge.logout();
          break;

        case 404:
          // Not Found: Si es una búsqueda de cliente/cuenta
          bridge.showNotification({
            title: 'No encontrado',
            message: 'El registro solicitado no existe',
            type: 'info'
          });
          break;

        case 500:
          // Internal Server Error: Mensaje de contingencia
          bridge.showNotification({
            title: 'Error del Servidor',
            message: 'Hubo un problema en el servidor. Nuestro equipo técnico ha sido notificado.',
            type: 'error'
          });
          break;

        default:
          // Otros errores >= 400
          if (error.status >= 400) {
            bridge.showNotification({
              title: errorTitle,
              message: errorMessage,
              type: 'error'
            });
          }
          break;
      }

      // Se retorna el error para que el componente pueda manejar errores de validación de campos
      // (mapeo de businessMessage a inputs) si la lista 'errors' está presente.
      return throwError(() => error);
    })
  );
};
