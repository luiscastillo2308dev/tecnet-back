import { PartialType } from '@nestjs/mapped-types'; // Or @nestjs/swagger
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreateQuoteRequestDto, QuoteStatus } from './create-quote-request.dto';

/**
 * Data Transfer Object for updating an existing QuoteRequest.
 * Extends CreateQuoteRequestDto with all fields marked as optional for Swagger.
 * Includes the 'status' field for updates.
 */
export class UpdateQuoteRequestDto extends PartialType(CreateQuoteRequestDto) {
  // Add @ApiProperty({ required: false }) to inherited properties for Swagger clarity
  @ApiPropertyOptional({
    required: false,
    description: 'Updated name (optional).',
    example: 'Jane Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string.' })
  @MaxLength(100, { message: 'Name cannot be longer than 100 characters.' })
  name?: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Updated email (optional).',
    example: 'jane.doe@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Updated subject (optional).',
    example: 'Updated Quote Request',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Subject must be a string.' })
  @MaxLength(255, { message: 'Subject cannot be longer than 255 characters.' })
  subject?: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Updated message (optional).',
    example: 'Adding more details to my request...',
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string.' })
  message?: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Updated phone number (optional).',
    example: '+15559876543',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string.' })
  // @IsPhoneNumber(null, { message: 'Please provide a valid phone number.' }) // Uncomment and configure if needed
  @MaxLength(20, {
    message: 'Phone number cannot be longer than 20 characters.',
  })
  phone?: string;

  /**
   * The updated status of the quote request.
   */
  @ApiProperty({
    description: 'The updated status of the quote request.',
    enum: QuoteStatus,
    example: QuoteStatus.IN_PROGRESS,
    required: true, // Status is optional for updates
  })
  @IsEnum(QuoteStatus, {
    message: `Status must be one of the following values: ${Object.values(QuoteStatus).join(', ')}`,
  })
  status?: QuoteStatus;

  // Note: Validation rules (@IsString, @IsEmail, etc.) are automatically inherited
  // and applied by class-validator even with PartialType, but they only trigger
  // if the field is actually present in the request payload.
  // The @ApiProperty decorators here primarily enhance Swagger documentation.
}
