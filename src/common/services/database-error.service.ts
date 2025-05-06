import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class DatabaseErrorService {
  private readonly logger = new Logger(DatabaseErrorService.name);

  /**
   * Handle Prisma unique constraint errors
   * @param error - The caught error
   * @param entityName - The name of the entity (e.g., 'Category')
   * @param fieldName - The name of the field causing the conflict
   * @param fieldValue - The value that caused the conflict
   */
  handleUniqueConstraintError(
    error: unknown,
    entityName: string,
    fieldName: string,
    fieldValue: string | number,
  ): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `${entityName} with ${fieldName} ${fieldValue} already exists`,
        );
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`${entityName} not found`);
      }
    }
    this.handleDatabaseError(
      error,
      `An unexpected error occurred with ${entityName}`,
    );
  }

  /**
   * Handle database errors with consistent logging and error throwing
   * @param error - The caught error
   * @param errorMessage - The error message to log and throw
   */
  handleDatabaseError(error: unknown, errorMessage: string): never {
    const message = this.getErrorMessage(error);
    const stack = this.getErrorStack(error);
    this.logger.error(`${errorMessage}: ${message}`, stack);
    throw new InternalServerErrorException(errorMessage);
  }

  /**
   * Get error message safely from any error
   * @param error - The error to extract message from
   * @returns The error message or 'Unknown error'
   */
  private getErrorMessage(error: unknown): string {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
    return 'Unknown error';
  }

  /**
   * Get error stack safely from any error
   * @param error - The error to extract stack from
   * @returns The error stack or empty string
   */
  private getErrorStack(error: unknown): string {
    if (
      error &&
      typeof error === 'object' &&
      'stack' in error &&
      typeof error.stack === 'string'
    ) {
      return error.stack;
    }
    return '';
  }
}
