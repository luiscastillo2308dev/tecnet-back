import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  /**
   * The updated name of the role. Must be unique.
   * @example 'Super Administrator'
   */
  @ApiProperty({
    description: 'The updated name of the role',
    example: 'Super Administrator',
    maxLength: 30,
    required: false, // Now optional for updates
  })
  @IsOptional() // Added for partial updates
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name should not be empty.' })
  @MaxLength(30, { message: 'Name must not exceed 30 characters.' })
  readonly name?: string;

  /**
   * An updated description for the role.
   * @example 'Has full access with additional privileges'
   */
  @ApiProperty({
    description: 'An updated description for the role',
    example: 'Has full access with additional privileges',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(255, { message: 'Description must not exceed 255 characters.' })
  readonly description?: string;
}
