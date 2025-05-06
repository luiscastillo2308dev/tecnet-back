import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class UpdatePasswordDto {
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
  newPasswordConfirm: string;
}
