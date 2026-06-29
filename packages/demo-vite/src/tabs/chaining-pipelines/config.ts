export const TOTAL_INVENTORY_LIMIT = 500_000;

export const PIPELINE_PUML = `@startuml
skinparam classBackgroundColor White
skinparam classBorderColor Black
class Product {
  name: String
  price: Int
  quantity: Int
}
@enduml`;
