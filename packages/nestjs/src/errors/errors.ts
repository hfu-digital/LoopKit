export abstract class LoopKitError extends Error {
    abstract readonly code: string;

    constructor(
        message: string,
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class EntityNotFoundError extends LoopKitError {
    readonly code = 'ENTITY_NOT_FOUND';

    constructor(entity: string, id: string, cause?: Error) {
        super(`${entity} with id '${id}' not found`, cause);
    }
}

export class DuplicateEntityError extends LoopKitError {
    readonly code = 'DUPLICATE_ENTITY';

    constructor(entity: string, detail: string, cause?: Error) {
        super(`Duplicate ${entity}: ${detail}`, cause);
    }
}

export class ValidationError extends LoopKitError {
    readonly code = 'VALIDATION_ERROR';
}

export class StorageConnectionError extends LoopKitError {
    readonly code = 'STORAGE_CONNECTION_ERROR';
}

export class ConcurrencyConflictError extends LoopKitError {
    readonly code = 'CONCURRENCY_CONFLICT';
}

export class InvalidGradeError extends LoopKitError {
    readonly code = 'INVALID_GRADE';

    constructor(grade: string) {
        super(`Invalid grade: '${grade}'. Must be one of: again, hard, good, easy`);
    }
}

export class SessionNotActiveError extends LoopKitError {
    readonly code = 'SESSION_NOT_ACTIVE';

    constructor() {
        super('No active review session');
    }
}

export class UndoNotAvailableError extends LoopKitError {
    readonly code = 'UNDO_NOT_AVAILABLE';

    constructor() {
        super('No review available to undo');
    }
}
