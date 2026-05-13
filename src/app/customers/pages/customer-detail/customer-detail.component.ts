import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../interfaces/customer.interface';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);

  customer = signal<Customer | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  showDeleteModal = signal(false);

  userRole = signal<string>('USER');
  isAdmin = computed(() => {
    const role = this.userRole().toUpperCase();
    const hasAdminRole = role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') || role.includes('MANAGER');

    // Si detectamos un rol de administrador, tiene permisos totales
    if (hasAdminRole) return true;

    // Si el rol es explícitamente USER o similar, NO es admin
    if (role === 'USER' || role === 'CLIENT' || role === 'CUSTOMER') return false;

    // Por defecto en detalle, si no es admin, no tiene permisos administrativos
    return false;
  });


  ngOnInit(): void {
    // Obtenemos el rol desde la Shell a través de queryParams (Requerimiento MFE)
    this.route.queryParams.subscribe(params => {
      const role = params['role'] || 'USER';
      this.userRole.set(role); // Rol tal cual viene del Shell
      console.log('Datos recibidos del Shell en Detalle:', { role: this.userRole() });
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCustomer(id);
    } else {
      this.errorMessage.set('No se proporcionó un ID de cliente válido');
      this.loading.set(false);
    }
  }

  loadCustomer(id: string): void {
    this.loading.set(true);
    this.customerService.getCustomerById(id).subscribe({
      next: (data) => {
        this.customer.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set('Error al cargar la información del cliente.');
        this.loading.set(false);
      }
    });
  }

  goToEdit(): void {
    const current = this.customer();
    if (current) {
      this.router.navigate(['/customers/edit', current.id], { queryParamsHandling: 'preserve' });
    }
  }

  toggleStatus(): void {
    if (!this.isAdmin()) return;
    const current = this.customer();
    if (current) {
      const newStatus = !current.status;
      this.customerService.patchCustomer({ status: newStatus }, current.id).subscribe({
        next: () => {
          this.customer.update(prev => prev ? { ...prev, status: newStatus } : null);
        },
        error: (err: any) => {
          console.error('Error al actualizar estado', err);
          alert('No se pudo actualizar el estado del cliente.');
        }
      });
    }
  }

  onDelete(): void {
    if (!this.isAdmin()) return;
    const current = this.customer();
    if (current) {
      this.customerService.deleteCustomer(current.id).subscribe({
        next: () => {
          this.showDeleteModal.set(false);
          this.router.navigate(['/customers'], {
            queryParamsHandling: 'preserve',
            state: { returning: true }
          });
        },
        error: (err: any) => {
          this.errorMessage.set('No se pudo eliminar el cliente. Verifique dependencias.');
          this.showDeleteModal.set(false);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/customers'], {
      queryParamsHandling: 'preserve',
      state: { returning: true }
    });
  }
}
