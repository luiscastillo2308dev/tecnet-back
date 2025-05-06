import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * DTO for refreshing the access token using the refresh token.
 * @example
 * {
 *   "refresh
 *
 *  **/
export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token previously issued.' })
  @IsString()
  refresh_token: string;
}
