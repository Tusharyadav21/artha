# Engineering Rules — Backend Application (Python 3.12)

This project prioritizes:
- **Scalability**: Decoupled architecture using Service-Repository patterns.
- **Maintainability**: Clear separation of concerns (SOLID principles).
- **Type Safety**: Strict use of Python 3.12 type hints and Pydantic validation.
- **Performance**: Asynchronous execution (FastAPI + AsyncPG).
- **Predictability**: Stateless handlers and clear error boundaries.

---

# Core Principles

## 1. Python 3.12 Standard
- Use modern Python syntax (e.g., `|` for unions, `typing` shorthand).
- Strictly enforce type hinting on all function signatures.
- Use `uv` for dependency management and environment execution.

## 2. SOLID & OOP Principles
- **S**ingle Responsibility: Each class/module does one thing (e.g., a Repository only handles DB access).
- **O**pen/Closed: Design for extension (using Protocols/Interfaces) without modifying existing logic.
- **L**iskov Substitution: Subclasses must be substitutable for their base classes.
- **I**nterface Segregation: Use `typing.Protocol` to define small, focused interfaces.
- **D**ependency Inversion: High-level modules should not depend on low-level modules. Use Dependency Injection (DI).

---

# Backend Architecture

```txt
src/
  api/          # FastAPI Routes & Dependencies
  core/         # Config, Security, Constants
  models/       # Database Models (SQLAlchemy)
  schemas/      # Pydantic Models (Request/Response)
  services/     # Business Logic (The "How")
  repositories/ # Data Access (The "Where")
  workers/      # Background Tasks (Arq)
  utils/        # Shared Helper Functions
```

## Folder Responsibilities

### repositories/
Direct interaction with the database. No business logic here.
- Rule: One repository per database table/aggregate.
- Pattern: Return domain models or SQLAlchemy objects.

### services/
Where the business logic lives.
- Rule: Orchestrates repositories, external APIs, and computations.
- Pattern: Methods should be idempotent where possible.

### api/
Entry points for HTTP requests.
- Rule: Only handles request parsing, DI, and response formatting.
- Pattern: Call a Service method, don't write logic in routes.

---

# Coding Standards

## 1. Asynchronous by Default
Use `async def` for all I/O bound operations (DB calls, API requests).

## 2. Pydantic for Validation
All data entering or leaving the system must be validated via Pydantic schemas.

## 3. Error Handling
- Use custom exception classes inheriting from a base `AppException`.
- Handle exceptions in FastAPI middleware or global exception handlers.
- Never return raw stack traces to the client.

## 4. Documentation
- Every public function/method must have a docstring (Google style).
- Use descriptive variable and function names (snake_case).

---

# AI Agent Instructions
When generating backend code:
1. **Follow the Service-Repository Pattern**: Do not put business logic in API routes or DB logic in Services.
2. **Strict Typing**: Always include type hints for parameters and return types.
3. **DI Compliance**: Use `fastapi.Depends` for injecting services and repositories.
4. **SOLID Compliance**: If a class grows too large, split it following the Single Responsibility Principle.
5. **Python 3.12 Features**: Use latest syntax (e.g., `list[str]` instead of `List[str]`).
6. **No Patching**: Refactor the architecture if a feature feels "tacked on."

---

# Related Documentation
- [Architecture Details](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
- [API Specification](./docs/API.md)
- [Testing Strategy](./docs/TESTING.md)
