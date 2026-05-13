import { Routes } from '@angular/router';
import { CustomersListComponent } from './customers/pages/customers-list/customers-list.component';
import { CustomerFormComponent } from './customers/pages/customer-form/customer-form.component';
import { CustomerDetailComponent } from './customers/pages/customer-detail/customer-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' },
  { path: 'customers', component: CustomersListComponent },
  { path: 'customers/create', component: CustomerFormComponent },
  { path: 'customers/edit/:id', component: CustomerFormComponent },
  { path: 'customers/detail/:id', component: CustomerDetailComponent },
  { path: '**', redirectTo: 'customers' }
];
