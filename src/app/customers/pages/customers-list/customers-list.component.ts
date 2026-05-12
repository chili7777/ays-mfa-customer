import { Component, OnInit, inject } from '@angular/core';
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

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchTerm: string = '';
  showDeleteModal: boolean = false;
  deleteId: string = '';

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.filteredCustomers = data;
      },
      error: (err) => console.error('Error al cargar clientes', err)
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCustomers = this.customers;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredCustomers = this.customers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.identification.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  }

  goToCreate(): void {
    this.router.navigate(['/customers/create']);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/customers/detail', id]);
  }

  confirmDelete(id: string): void {
    this.deleteId = id;
    this.showDeleteModal = true;
  }

  onDelete(): void {
    if (this.deleteId) {
      this.customerService.deleteCustomer(this.deleteId).subscribe({
        next: () => {
          this.customers = this.customers.filter(c => c.id !== this.deleteId);
          this.onSearch();
          this.showDeleteModal = false;
          alert('Cliente eliminado con éxito');
        },
        error: (err) => {
          console.error('Error al eliminar', err);
          alert('No se pudo eliminar el cliente. Verifique si tiene cuentas asociadas.');
          this.showDeleteModal = false;
        }
      });
    }
  }
}
