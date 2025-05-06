import { ApiProperty } from '@nestjs/swagger'; // Optional: For Swagger documentation
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'; // Import validation decorators

export class CreateRoleDto {
  /**
   * The name of the role. Must be unique.
   * @example 'Administrator'
   */
  @ApiProperty({
    description: 'The unique name of the role',
    example: 'Administrator',
    maxLength: 30, // Match potential DB constraints
  })
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name should not be empty.' })
  @MaxLength(30, { message: 'Name must not exceed 30 characters.' }) // Example max length
  readonly name: string; // Use readonly for immutability where appropriate

  /**
   * An optional description for the role.
   * @example 'Has full access to all system features.'
   */
  @ApiProperty({
    description: 'An optional description for the role',
    example: 'Has full access to all system features.',
    required: false, // Indicate optionality in Swagger
  })
  @IsString({ message: 'Description must be a string.' })
  @IsOptional() // Marks the field as optional
  @MaxLength(255, { message: 'Description must not exceed 255 characters.' }) // Example max length
  readonly description?: string;

  // Note: We explicitly DO NOT include 'id', 'createdAt', 'updatedAt', or relation fields like 'users'.
  // The client should only provide the necessary data to create the resource.
}
