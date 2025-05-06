import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  Logger, // Import Logger
  BadRequestException, // Import for handling missing token
} from '@nestjs/common';
import { jwtConstants } from './constants';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

// Define the expected JWT payload structure for refresh tokens
interface RefreshTokenPayload {
  sub: string; // User ID
  email: string;
  // Add other relevant fields if included during signing
}

// Define the structure of the user object attached to the request after validation
export interface ValidatedUserPayload {
  id: string; // Renamed from userId for consistency
  email: string;
  refreshToken: string; // Include the token itself for potential use in the service
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  // Use 'refresh' as the strategy name
  private readonly logger = new Logger(RefreshStrategy.name); // Initialize Logger

  constructor(private prismaService: PrismaService) {
    super({
      // Extract token from the 'refresh_token' field in the request body
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false, // Validate token expiration
      secretOrKey: jwtConstants.refreshSecret, // Use the refresh token secret
      passReqToCallback: true, // Pass the request object to the validate method
    });
    this.logger.log('RefreshStrategy initialized');
  }

  /**
   * Validates the refresh token payload and the token itself against the database.
   * @param req - The incoming request object.
   * @param payload - The decoded JWT payload.
   * @returns The validated user object with the refresh token.
   * @throws UnauthorizedException if the token is invalid, expired, or not found.
   * @throws BadRequestException if the token is missing from the request body.
   */
  async validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): Promise<ValidatedUserPayload> {
    const refreshToken = req.body.refresh_token;
    this.logger.log(`Validating refresh token for user ID: ${payload.sub}`);

    // Ensure the token was actually extracted and passed
    if (!refreshToken) {
      this.logger.warn('Refresh token missing from request body.');
      // Throw BadRequest because the client didn't send the required field
      throw new BadRequestException('Refresh token is required.');
    }

    // Check if token exists in the database, belongs to the user, and is not expired
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          id: payload.sub, // Match user ID from token payload
          refreshToken: refreshToken, // Match the actual token string
          refreshTokenExpires: { gt: new Date() }, // Ensure token hasn't expired in DB
        },
      });

      if (!user) {
        this.logger.warn(
          `Refresh token validation failed for user ID: ${payload.sub}. Token mismatch or expired.`,
        );
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      this.logger.log(
        `Refresh token validated successfully for user ID: ${payload.sub}`,
      );
      // Return the necessary user info, matching RequestWithUser structure
      return {
        id: payload.sub,
        email: payload.email,
        refreshToken: refreshToken, // Pass the validated token back
      };
    } catch (error) {
      // Catch potential DB errors or other unexpected issues
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error; // Re-throw known exceptions
      }
      this.logger.error(
        `Error during refresh token validation for user ${payload.sub}: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Could not validate refresh token.'); // Generic error for safety
    }
  }
}
