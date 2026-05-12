import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Customer } from '../interfaces/customer.interface';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/customers';

  private getHeaders(isJson = false): HttpHeaders {
    const headers: any = {
      'x-guid': '550e8400-e29b-41d4-a716-446655440000',
      'x-app': 'postman-test',
      'Accept': 'application/json'
    };

    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }

    return new HttpHeaders(headers);
  }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => {
        let customers = [];
        if (Array.isArray(response)) customers = response;
        else if (response && response.data && Array.isArray(response.data)) customers = response.data;
        else if (response && response.customers && Array.isArray(response.customers)) customers = response.customers;

        // Normalizar ID para asegurar navegación (Priorizar UUID sobre identificación)
        return customers.map((c: any) => {
          const uuid = c.uuid || c._id || c.customerId;
          return {
            ...c,
            id: uuid || c.id || c.identification
          };
        });
      })
    );
  }

  getCustomerById(id: string): Observable<Customer> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      map(response => {
        const data = response.data || response.customer || response;
        const uuid = data.uuid || data._id || data.customerId;
        return {
          ...data,
          id: uuid || data.id || id
        };
      })
    );
  }

  createCustomer(customer: Partial<Customer>): Observable<any> {
    return this.http.post(this.apiUrl, customer, { headers: this.getHeaders(true) });
  }

  updateCustomer(customer: Partial<Customer>, id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, customer, { headers: this.getHeaders(true) });
  }

  patchCustomer(customer: Partial<Customer>, id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, customer, { headers: this.getHeaders(true) });
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
