import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsPhoneNumber,
  IsEnum, // Consider using a more specific validator if needed
} from 'class-validator';

// Define the enum locally or import it if your setup allows
// If importing from Prisma client: import { QuoteStatus } from '@prisma/client';
// Otherwise, define it here to match the schema:
export enum QuoteStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/**
 * Data Transfer Object for creating a new QuoteRequest.
 * Defines the shape, validation rules, and Swagger documentation for incoming quote request data.
 */
export class CreateQuoteRequestDto {
  /**
   * The name of the person submitting the quote request.
   */
  @ApiProperty({
    description: 'The name of the person submitting the quote request.',
    example: 'John Doe',
    maxLength: 100,
    required: true,
  })
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name should not be empty.' })
  @MaxLength(100, { message: 'Name cannot be longer than 100 characters.' })
  name: string;

  /**
   * The email address of the person submitting the request.
   */
  @ApiProperty({
    description: 'The email address of the person submitting the request.',
    example: 'john.doe@example.com',
    required: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email should not be empty.' })
  email: string;

  /**
   * The subject line of the quote request.
   */
  @ApiProperty({
    description: 'The subject line of the quote request.',
    example: 'Website Development Quote',
    maxLength: 255,
    required: true,
  })
  @IsString({ message: 'Subject must be a string.' })
  @IsNotEmpty({ message: 'Subject should not be empty.' })
  @MaxLength(255, { message: 'Subject cannot be longer than 255 characters.' })
  subject: string;

  /**
   * The detailed message or description of the quote request.
   */
  @ApiProperty({
    description: 'The detailed message or description of the quote request.',
    example: 'I need a quote for developing a new e-commerce platform...',
    required: true,
  })
  @IsString({ message: 'Message must be a string.' })
  @IsNotEmpty({ message: 'Message should not be empty.' })
  message: string;

  /**
   * The phone number of the person submitting the request.
   */
  @ApiProperty({
    description: 'The phone number of the person submitting the request.',
    example: '+15551234567',
    maxLength: 20,
    required: true,
  })
  @IsString({ message: 'Phone number must be a string.' })
  @IsNotEmpty({ message: 'Phone number should not be empty.' })
  // @IsPhoneNumber(null, { message: 'Please provide a valid phone number.' }) // Uncomment and configure if needed
  @MaxLength(20, {
    message: 'Phone number cannot be longer than 20 characters.',
  })
  phone: string;

  @ApiProperty({
    description: 'The status of the project.',
    enum: QuoteStatus,
    example: QuoteStatus.PENDING,
    required: true, // Status is optional for updates
  })
  @IsEnum(QuoteStatus, {
    message: `Status must be one of the following values: ${Object.values(QuoteStatus).join(', ')}`,
  })
  status: QuoteStatus;

  /**
   * Optional: A path or identifier for an uploaded requirements file.
   * Based on the schema `requirementsFile String`, this is required.
   * If it should be optional, add `@IsOptional()` and change `required: true` to `required: false`.
   */
  /*  @ApiProperty({
    description: 'A path or identifier for an uploaded requirements file.',
    example: '/uploads/requirements_doc.pdf',
    required: true, // Assuming it's required based on Prisma schema `String` type without `?`
    // required: false, // Use this if the field is optional
  })
  @IsString({ message: 'Requirements file path must be a string.' })
  @IsNotEmpty({ message: 'Requirements file path should not be empty.' }) // Add if required
  // @IsOptional() // Add this decorator if the field is optional
  requirementsFile: string; // Change to `requirementsFile?: string;` if optional  */

  /*
   * Note: 'status' is not included here because it has a default value ('PENDING')
   * defined in the Prisma schema. It will be set automatically upon creation.
   * 'id', 'createdAt', and 'updatedAt' are also managed by the database/Prisma.
   */
}
