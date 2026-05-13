export interface ErrorDetail {
  code: string;
  message: string;
  businessMessage: string;
}

export interface ErrorModelDto {
  title: string;
  detail: string;
  component: string;
  errors?: ErrorDetail[];
}
