class AppError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  constructor(field: string, message: string) {
    super(`${field}: ${message}`, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, 'NOT_FOUND')
  }
}

class DuplicateError extends AppError {
  constructor(resource: string, field: string) {
    super(`${resource} with this ${field} already exists`, 'DUPLICATE_ERROR')
  }
}

class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR')
  }
}
