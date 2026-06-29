export type Employee = {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly active: boolean;
};

export interface Department {
  readonly capacity: number;
  get activeCapacity(): boolean;
  addEmployee(e: Employee): void;
  removeEmployee(e: Employee): void;
}

export type EagerDepartment = {
  readonly employees: Set<Employee>;
  readonly capacity: number;
};
