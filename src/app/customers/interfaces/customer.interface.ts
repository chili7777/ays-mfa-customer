export interface Customer {
  id: string;
  name: string;
  identification: string;
  email: string;
  phone: string;
  address: string;
  status: boolean;
  password?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
}
