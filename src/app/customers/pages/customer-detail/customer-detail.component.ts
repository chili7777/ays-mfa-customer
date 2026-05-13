import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../interfaces/customer.interface';
import { MfeBridgeService } from '../../../core/services/mfe-bridge.service';

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
  private readonly mfeBridge = inject(MfeBridgeService);

  customer = signal<Customer | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  showDeleteModal = signal(false);

  userRole = computed(() => (this.mfeBridge.sessionData().role || 'USER').toUpperCase());
  isAdmin = computed(() => {
    const role = this.userRole().toUpperCase();
    const hasAdminRole = role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') || role.includes('MANAGER');

    if (hasAdminRole) return true;
    if (role === 'USER' || role === 'CLIENT' || role === 'CUSTOMER') return false;
    return !this.mfeBridge.sessionData().clientId;
  });


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
      this.router.navigate(['/customers/edit', current.id], { queryParamsHandling: 'preserve' });
    }
  }

  goToAccounts(): void {
    const current = this.customer();
    if (current) {
      // Usamos el Bridge para navegar a la Shell
      this.mfeBridge.navigateTo('/accounts', { client: current.id });
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
          this.router.navigate(['/customers'], { queryParamsHandling: 'preserve' });
        },
        error: (err: any) => {
          this.errorMessage.set('No se pudo eliminar el cliente. Verifique dependencias.');
          this.showDeleteModal.set(false);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/customers'], { queryParamsHandling: 'preserve' });
  }
}
