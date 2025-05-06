import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'john.doe@example.com',
    required: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @ApiProperty({
    description:
      'User password (at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character)',
    example: 'P@sswOrd123!',
    required: true,
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password too weak. Must contain uppercase, lowercase, number, and special character.',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name cannot be empty.' })
  @MaxLength(50)
  lastName: string;

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

  @ApiProperty({
    description: 'UUID of the role assigned to the user',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    required: true,
  })
  @IsUUID('4', { message: 'Role ID must be a valid UUID.' })
  @IsNotEmpty({ message: 'Role ID cannot be empty.' })
  roleId: string;

  // Optional fields from schema (address, phone) are not included here
  // as they might not be required during initial creation.
  // Fields like isActive, tokens, createdAt, updatedAt are managed by the backend.
}
