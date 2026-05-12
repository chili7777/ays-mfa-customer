import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../interfaces/customer.interface';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-list.component.html'
})
export class CustomersListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);

  customers = signal<Customer[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteId = signal<string>('');

  filteredCustomers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const all = this.customers();
    if (!term) return all;
    return all.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.identification.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar clientes', err);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    // Ya no es estrictamente necesario gracias a computed(),
    // pero lo mantenemos para compatibilidad con el botón
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
        error: (err) => {
          console.error('Error al eliminar', err);
          alert('No se pudo eliminar el cliente. Verifique si tiene cuentas asociadas.');
          this.showDeleteModal.set(false);
        }
      });
    }
  }
}
