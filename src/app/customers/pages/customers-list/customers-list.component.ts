import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../interfaces/customer.interface';
import { MfeBridgeService } from '../../../core/services/mfe-bridge.service';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customers-list.component.html'
})
export class CustomersListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly mfeBridge = inject(MfeBridgeService);

  customers = signal<Customer[]>([]);
  searchControl = new FormControl('', { nonNullable: true });
  searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteId = signal<string>('');

  // Datos sincronizados desde el Bridge
  userRole = computed(() => (this.mfeBridge.sessionData().role || 'USER').toUpperCase());
  currentClientId = computed(() => this.mfeBridge.sessionData().clientId);
  isRedirecting = signal<boolean>(false);

  constructor() {
    // Reaccionar a cambios en los datos de sesión sincronizados
    effect(() => {
      const role = this.userRole();
      const clientId = this.currentClientId();

      if (role && clientId) {
        console.log('[MFE] Datos sincronizados recibidos:', { role, clientId });

        // Si no es admin, redirigir directamente al detalle (Requerimiento previo)
        if (!this.isAdmin()) {
          this.isRedirecting.set(true);
          this.goToDetail(clientId);
        } else {
          this.loadCustomers();
        }
      }
    });
  }

  isAdmin = computed(() => {
    const role = this.userRole().toUpperCase();
    const hasAdminRole = role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') || role.includes('MANAGER');

    // Si detectamos un rol de administrador, tiene permisos totales
    if (hasAdminRole) return true;

    // Si el rol es explícitamente USER o similar, NO es admin
    if (role === 'USER' || role === 'CLIENT' || role === 'CUSTOMER') return false;

    // Si no hay un clientId específico, probablemente somos un admin o gestor genérico
    return !this.currentClientId();
  });


  filteredCustomers = computed(() => {
    let list = this.customers();

    // Filtro por rol
    if (!this.isAdmin() && this.currentClientId()) {
      list = list.filter(c => c.id === this.currentClientId());
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.identification.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    // Escuchamos queryParams solo por si hay navegación interna,
    // pero el rol y clientId vienen del BridgeService.
    this.route.queryParams.subscribe(() => {
      if (this.isAdmin() || !this.currentClientId()) {
        this.loadCustomers();
      }
    });
  }

  loadCustomers(): void {
    this.loading.set(true);

    // Si es USER, cargar solo su perfil específico
    if (!this.isAdmin() && this.currentClientId()) {
      this.customerService.getCustomerById(this.currentClientId()!).subscribe({
        next: (data) => {
          this.customers.set([data]);
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('Error al cargar perfil', err);
          this.loading.set(false);
        }
      });
      return;
    }

    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar clientes', err);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    // Ya no es estrictamente necesario gracias a computed(),
    // pero lo mantenemos para compatibilidad con el botón
  }

  onStatusClick(event: MouseEvent, customer: Customer): void {
    event.stopPropagation();
    if (this.isAdmin()) {
      this.toggleStatus(customer);
    }
  }

  goToCreate(): void {
    this.router.navigate(['/customers/create'], { queryParamsHandling: 'preserve' });
  }

  goToDetail(id: string): void {
    this.router.navigate(['/customers/detail', id], { queryParamsHandling: 'preserve' });
  }

  goToAccounts(id: string): void {
    this.router.navigate(['/accounts'], { queryParams: { clientId: id }, queryParamsHandling: 'merge' });
  }

  goToEdit(id: string): void {
    this.router.navigate(['/customers/edit', id], { queryParamsHandling: 'preserve' });
  }

  confirmDelete(id: string): void {
    this.deleteId.set(id);
    this.showDeleteModal.set(true);
  }

  onDelete(): void {
    const id = this.deleteId();
    if (id) {
      this.customerService.deleteCustomer(id).subscribe({
        next: () => {
          this.customers.update(prev => prev.filter(c => c.id !== id));
          this.showDeleteModal.set(false);
          alert('Cliente eliminado con éxito');
        },
        error: (err: any) => {
          console.error('Error al eliminar', err);
          alert('No se pudo eliminar el cliente. Verifique si tiene cuentas asociadas.');
          this.showDeleteModal.set(false);
        }
      });
    }
  }

  toggleStatus(customer: Customer): void {
    const newStatus = !customer.status;
    this.customerService.patchCustomer({ status: newStatus }, customer.id).subscribe({
      next: () => {
        this.customers.update(prev =>
          prev.map(c => c.id === customer.id ? { ...c, status: newStatus } : c)
        );
      },
      error: (err: any) => {
        console.error('Error al actualizar estado', err);
        alert('No se pudo actualizar el estado del cliente.');
      }
    });
  }
}
