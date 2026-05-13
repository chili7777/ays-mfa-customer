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

  userRole = signal<string>(this.getInitialRole());
  isAdmin = computed(() => {
    const role = this.userRole().toUpperCase();
    const hasAdminRole = role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') || role.includes('MANAGER');

    // Si detectamos un rol de administrador, tiene permisos totales
    if (hasAdminRole) return true;

    // Si el rol es explícitamente USER o similar, NO es admin
    if (role === 'USER' || role === 'CLIENT' || role === 'CUSTOMER') return false;

    // Si no hay un clientId específico en el storage, probablemente somos un admin gestionando todo
    const noClientRestricted = !localStorage.getItem('clientId') && !sessionStorage.getItem('clientId');
    return noClientRestricted;
  });

  private getInitialRole(): string {
    const rawRole = localStorage.getItem('userRole') ||
                    localStorage.getItem('role') ||
                    localStorage.getItem('user_role') ||
                    localStorage.getItem('roleName');
    if (rawRole) return rawRole.trim().toUpperCase();

    const sessionRole = sessionStorage.getItem('userRole') || sessionStorage.getItem('role');
    if (sessionRole) return sessionRole.trim().toUpperCase();

    try {
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user') ||
                       localStorage.getItem('auth') || sessionStorage.getItem('auth');
      if (userData) {
        const user = JSON.parse(userData);
        const data = user.user || user.data || user;
        const roleValue = data.role || data.userRole || data.type || data.roleName || data.roles?.[0] || data.roleId;
        if (roleValue) return roleValue.toString().trim().toUpperCase();
      }
    } catch (e) {}

    try {
      const cookies = document.cookie.split(';');
      for (let c of cookies) {
        const parts = c.trim().split('=');
        if (parts.length === 2) {
          const key = parts[0];
          const value = parts[1];
          if (key === 'role' || key === 'userRole') return decodeURIComponent(value).trim().toUpperCase();
        }
      }
    } catch (e) {}

    return 'USER';
  }

  ngOnInit(): void {
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
      this.router.navigate(['/customers/edit', current.id]);
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
          this.router.navigate(['/customers']);
        },
        error: (err: any) => {
          this.errorMessage.set('No se pudo eliminar el cliente. Verifique dependencias.');
          this.showDeleteModal.set(false);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }
}
