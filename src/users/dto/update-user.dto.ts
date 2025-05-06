import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsBoolean,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address (must be unique)',
    example: 'john.doe.updated@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @ApiPropertyOptional({
    description:
      'User password (at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character)',
    example: 'P@sswOrd123!',
    required: true,
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password too weak. Must contain uppercase, lowercase, number, and special character.',
  })
  password: string;

  // Password updates are typically handled via a separate endpoint/DTO (e.g., ChangePasswordDto)
  // Do not include password here unless specifically intended.

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User address',
    example: '123 Main St, Anytown',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255) // Example max length
  address?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20) // Example max length
  phone?: string;

  @ApiPropertyOptional({
    description: 'User activation status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'UUID of the role assigned to the user',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Role ID must be a valid UUID.' })
  roleId?: string;

  // Tokens and timestamps are managed by the backend.
}
