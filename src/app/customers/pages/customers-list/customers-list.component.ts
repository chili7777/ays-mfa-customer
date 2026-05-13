import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../interfaces/customer.interface';

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

  customers = signal<Customer[]>([]);
  searchControl = new FormControl('', { nonNullable: true });
  searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteId = signal<string>('');
  userRole = signal<string>(this.getInitialRole());
  currentClientId = signal<string | null>(localStorage.getItem('clientId') || sessionStorage.getItem('clientId'));

  isRedirecting = signal<boolean>(false);
  isAdmin = computed(() => {
    const role = this.userRole().toUpperCase();
    const hasAdminRole = role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') || role.includes('MANAGER');
    // Si no hay un clientId específico en el storage, probablemente somos un admin gestionando todo
    const noClientRestricted = !localStorage.getItem('clientId') && !sessionStorage.getItem('clientId');
    // Depuración interna (el usuario no la ve, pero ayuda a asegurar que el botón aparezca)
    const isActuallyAdmin = hasAdminRole || noClientRestricted;
    return isActuallyAdmin;
  });

  private getInitialRole(): string {
    // 1. Intentar desde localStorage (varias llaves comunes)
    const rawRole = localStorage.getItem('userRole') ||
                    localStorage.getItem('role') ||
                    localStorage.getItem('user_role') ||
                    localStorage.getItem('roleName');
    if (rawRole) return rawRole.trim().toUpperCase();

    // 2. Intentar desde sessionStorage
    const sessionRole = sessionStorage.getItem('userRole') || sessionStorage.getItem('role');
    if (sessionRole) return sessionRole.trim().toUpperCase();

    // 3. Intentar parsear objeto 'user' o 'auth'
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

    // 4. Intentar desde cookies
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
    // También permitimos recibir el clientId por query params para consistencia con cuentas
    this.route.queryParams.subscribe(params => {
      const cid = params['clientId'] || params['client'];
      if (cid) {
        this.currentClientId.set(cid);
      }

      // Si no es admin, redirigir directamente al detalle del usuario (sus datos)
      if (!this.isAdmin() && this.currentClientId()) {
        this.isRedirecting.set(true);
        this.goToDetail(this.currentClientId()!);
        return;
      }

      // Cargar clientes después de tener el clientId
      this.loadCustomers();
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
    this.router.navigate(['/customers/create']);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/customers/detail', id]);
  }

  goToEdit(id: string): void {
    this.router.navigate(['/customers/edit', id]);
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
