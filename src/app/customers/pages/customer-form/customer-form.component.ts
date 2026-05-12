import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);

  customerForm: FormGroup;
  isEdit = false;
  customerId: string | null = null;

  constructor() {
    this.customerForm = this.fb.group({
      name: ['', [Validators.required]],
      identification: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      gender: ['MALE', [Validators.required]],
      age: [18, [Validators.required, Validators.min(18)]],
      status: [true],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.isEdit = true;
      // En edición el password no suele ser obligatorio a menos que se quiera cambiar
      this.customerForm.get('password')?.clearValidators();
      this.customerForm.get('password')?.updateValueAndValidity();
      this.loadCustomer(this.customerId);
    }
  }

  loadCustomer(id: string): void {
    this.customerService.getCustomerById(id).subscribe({
      next: (customer) => {
        this.customerForm.patchValue({
          name: customer.name,
          identification: customer.identification,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          gender: customer.gender,
          age: customer.age,
          status: customer.status
        });
      },
      error: (err) => {
        console.error('Error al cargar cliente', err);
        alert('No se pudo cargar la información del cliente');
        this.goBack();
      }
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) return;

    const formValue = this.customerForm.value;

    if (this.isEdit) {
      this.customerService.updateCustomer(formValue, this.customerId!).subscribe({
        next: () => {
          alert('Cliente actualizado correctamente');
          this.goBack();
        },
        error: (err) => alert('Error al actualizar el cliente')
      });
    } else {
      this.customerService.createCustomer(formValue).subscribe({
        next: () => {
          alert('Cliente creado correctamente');
          this.goBack();
        },
        error: (err) => alert('Error al crear el cliente')
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }
}
