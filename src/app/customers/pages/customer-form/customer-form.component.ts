import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { MfeBridgeService } from '../../../core/services/mfe-bridge.service';

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
  private readonly mfeBridge = inject(MfeBridgeService);

  customerForm: FormGroup;
  isEdit = false;
  customerId: string | null = null;
  userRole = computed(() => (this.mfeBridge.sessionData().role || 'USER').toUpperCase());
  isAdmin = computed(() => {
    const role = this.userRole().toUpperCase();
    const hasAdminRole = role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') || role.includes('MANAGER');

    if (hasAdminRole) return true;
    if (role === 'USER' || role === 'CLIENT' || role === 'CUSTOMER') return false;
    return !this.mfeBridge.sessionData().clientId;
  });
  currentStep = 1;
  totalSteps = 3;
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor() {
    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      identification: ['', [Validators.required, Validators.pattern('^[0-9]{10,13}$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      gender: ['MALE', [Validators.required]],
      age: [18, [Validators.required, Validators.min(18), Validators.max(120)]],
      status: [true],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Getters para facilitar el acceso en el template
  get f() { return this.customerForm.controls; }

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.isEdit = true;
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
      error: (err: any) => {
        console.error('Error al cargar cliente', err);
        this.showErrorMessage('No se pudo cargar la información del cliente');
        this.goBack();
      }
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.showErrorMessage('Por favor, complete todos los campos requeridos correctamente.');
      return;
    }

    const formValue = { ...this.customerForm.value };

    if (this.isEdit) {
      this.customerService.updateCustomer(formValue, this.customerId!).subscribe({
        next: () => {
          this.showSuccessMessage('Cliente actualizado correctamente');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err: any) => {
          console.error('Error al actualizar', err);
          const errorMsg = err.error?.detail || err.error?.errors?.[0]?.businessMessage || err.error?.message || 'Error desconocido';

          if (errorMsg.includes('identificación ya existe')) {
            this.customerForm.get('identification')?.setErrors({ duplicate: true });
            this.currentStep = 1; // Volver al primer paso para que vea el error
          }

          this.showErrorMessage('Error al actualizar el cliente: ' + errorMsg);
        }
      });
    } else {
      this.customerService.createCustomer(formValue).subscribe({
        next: () => {
          this.showSuccessMessage('Cliente creado correctamente');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err: any) => {
          console.error('Error al crear', err);
          const errorMsg = err.error?.detail || err.error?.errors?.[0]?.businessMessage || err.error?.message || 'Error desconocido';

          if (errorMsg.includes('identificación ya existe')) {
            this.customerForm.get('identification')?.setErrors({ duplicate: true });
            this.currentStep = 1; // Volver al primer paso para que vea el error
          }

          this.showErrorMessage('Error al crear el cliente: ' + errorMsg);
        }
      });
    }
  }

  private showErrorMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => {
      if (this.errorMessage() === message) this.errorMessage.set(null);
    }, 8000);
  }

  private showSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      if (this.successMessage() === message) this.successMessage.set(null);
    }, 5000);
  }

  nextStep(): void {
    if (this.isStepValid()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    } else {
      this.markStepAsTouched();
    }
  }

  isStepValid(): boolean {
    const controls = this.getStepControls(this.currentStep);
    return controls.every(controlName => this.customerForm.get(controlName)?.valid);
  }

  markStepAsTouched(): void {
    const controls = this.getStepControls(this.currentStep);
    controls.forEach(controlName => this.customerForm.get(controlName)?.markAsTouched());
  }

  private getStepControls(step: number): string[] {
    switch (step) {
      case 1: return ['name', 'identification', 'gender', 'age'];
      case 2: return ['email', 'phone', 'address'];
      case 3: return ['password'];
      default: return [];
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goBack(): void {
    this.router.navigate(['/customers'], { queryParamsHandling: 'preserve' });
  }
}
