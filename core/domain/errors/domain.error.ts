export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, identifier?: string | number) {
    super(
      identifier !== undefined
        ? `${entityName} con identificador "${identifier}" no fue encontrado.`
        : `${entityName} no fue encontrado.`
    );
    this.name = 'EntityNotFoundError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Acceso no autorizado.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
