export const MIN_SALARY = 20_000;

export const DEPT_PUML = `@startuml
skinparam classBackgroundColor White
skinparam classBorderColor Black
skinparam arrowColor #333
class Department {
  budget: Int
}
class Employee {
  name: String
  salary: Int
}
Department "1" -- "*" Employee : employees
@enduml`;
