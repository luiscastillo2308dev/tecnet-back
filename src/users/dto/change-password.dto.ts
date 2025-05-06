// src/auth/dto/change-password.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  // This token field is used for password reset via token,
  // not for changing password when logged in.
  // Keep it optional or remove if this DTO is *only* for logged-in changes.
  // For clarity, let's assume the /update-password/:resetToken endpoint
  // will use a different DTO or just extract the newPassword.
  // Let's refine this DTO for the /change-password/:userId endpoint.

  @ApiProperty({
    description: 'The current password of the user',
    example: 'P@sswOrd123!',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password cannot be empty.' })
  currentPassword: string;

  @ApiProperty({
    description:
      'The new password (at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character)',
    example: 'NewP@sswOrd1!',
    required: true,
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'New password cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password too weak. Must contain uppercase, lowercase, number, and special character.',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of the new password',
    example: 'NewP@sswOrd1!',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation cannot be empty.' })
  newPasswordConfirm: string; // Add validation in service/controller to check if it matches newPassword
}
