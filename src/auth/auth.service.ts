import {
  Inject,
  Injectable,
  Logger, // Import Logger
  NotFoundException,
  UnauthorizedException,
  ConflictException, // For potential conflicts like token reuse
  InternalServerErrorException,
  ForbiddenException, // For unexpected errors
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { jwtConstants } from './constants';
import { User } from '@prisma/client'; // Import User type
import { LoginResponse } from './auth.controller';

interface UserPayload {
  // userId: string;
  id: string;
  email: string;
}

// Define clearer payload structure for JWTs
interface AccessTokenPayload {
  sub: string; // User ID (subject)
  email: string;
}

interface RefreshTokenPayload extends AccessTokenPayload {
  // Potentially add a refresh token specific identifier if needed
  // jti?: string;
}

// Define return type for login
/* interface LoginResponse {
  access_token: string;
  refresh_token: string;
} */

// Define return type for profile (excluding sensitive info)
// Consider creating a UserProfileDto
type UserProfile = Omit<
  User,
  | 'password'
  | 'refreshToken'
  | 'refreshTokenExpires'
  | 'activationToken'
  | 'resetToken'
  | 'resetTokenExpires'
>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name); // Initialize Logger

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService, // For access tokens
    // Inject the refresh token specific JwtService instance
    @Inject('refresh') private readonly refreshJwtService: JwtService,
  ) {}

  /**
   * Validates user credentials for the LocalStrategy.
   * @param email - User's email
   * @param pass - User's plain text password
   * @returns The user object without password if valid, otherwise null.
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    // this.logger.log(`Validating user: ${email}`);
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (user && user.isActive === false) {
      this.logger.warn(`Login attempt failed for inactive user: ${email}`);
      // Throw specific error or return null based on desired behavior for inactive users
      throw new ForbiddenException({
        error: 'Account Inactive',
        message:
          'Account is not active. Please check your email for activation instructions.',
        email: user.email,
        activationTokenExpires: user.activationTokenExpires,
        resolution: 'Check your email or contact us for assistance.',
        statusCode: 403,
      });

      /*throw new UnauthorizedException(
        'Account is not active. Please check your email for activation instructions.',
      ); */
      /* throw new ForbiddenException(
        'Account is not active. Please check your email for activation instructions.',
      ); */
    }

    if (user && (await bcrypt.compare(pass, user.password))) {
      this.logger.log(`User validation successful for: ${email}`);
      const { password, ...result } = user; // Exclude password
      return result;
    }

    this.logger.warn(`User validation failed for: ${email}`);
    return null; // Indicate validation failure
  }

  /**
   * Generates access and refresh tokens upon successful login.
   * Stores the refresh token hash (best practice) or the token itself.
   * @param user - The validated user object (without password).
   * @returns Access and Refresh tokens.
   */
  async login(user: UserPayload): Promise<LoginResponse> {
    this.logger.log(`Generating tokens for user ID: ${user.id}`);
    const accessPayload: AccessTokenPayload = {
      email: user.email,
      sub: user.id,
    };
    const refreshPayload: RefreshTokenPayload = {
      email: user.email,
      sub: user.id,
    };

    // Sign tokens
    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.refreshJwtService.sign(refreshPayload);

    // Store the refresh token (or its hash) in the database
    // Hashing the refresh token before storing is more secure
    // const hashedRefreshToken = await bcrypt.hash(refreshToken, 10); // Example hashing

    try {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          // refreshToken: hashedRefreshToken, // Store hash if implementing hashing
          refreshToken: refreshToken, // Storing plain token as per original code
          refreshTokenExpires: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          ), // Use constant
        },
      });
      this.logger.log(`Refresh token stored for user ID: ${user.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to store refresh token for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to complete login process.',
      );
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Logs out a user by invalidating their refresh token.
   * @param userId - The ID of the user to log out.
   */
  async logout(userId: string): Promise<{ message: string }> {
    this.logger.log(`Attempting to log out user ID: ${userId}`);
    try {
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          refreshToken: null,
          refreshTokenExpires: null,
        },
      });
      this.logger.log(`User ID ${userId} logged out successfully.`);
      return { message: 'Logout successful' };
    } catch (error) {
      // Handle case where user might not be found, though typically logout should succeed even then
      if (error.code === 'P2025') {
        // Prisma code for record not found
        this.logger.warn(`Logout attempt for non-existent user ID: ${userId}`);
        // Still return success, as the desired state (no token) is achieved
        return { message: 'Logout successful' };
      }
      this.logger.error(
        `Failed to clear refresh token for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to process logout.');
    }
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * Implements basic refresh token validation (existence, expiry).
   * Consider adding refresh token rotation for enhanced security.
   * @param refreshToken - The refresh token provided by the client (optional, depending on guard).
   * @returns New Access and potentially Refresh tokens.
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    // Verify the refresh token exists and is valid
    const dbUser = await this.prismaService.user.findUnique({
      where: {
        refreshToken,
        refreshTokenExpires: { gt: new Date() },
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify JWT signature
    try {
      this.refreshJwtService.verify(refreshToken, {
        secret: jwtConstants.refreshSecret,
      });
    } catch (error) {
      await this.prismaService.user.update({
        where: { id: dbUser.id },
        data: { refreshToken: null, refreshTokenExpires: null },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const newPayload = { email: dbUser.email, sub: dbUser.id };
    const newAccessToken = this.jwtService.sign(newPayload);
    const newRefreshToken = this.refreshJwtService.sign(newPayload);

    // Update refresh token in database
    await this.prismaService.user.update({
      where: { id: dbUser.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Retrieves the profile for the authenticated user.
   * @param userId - The ID of the user whose profile is requested.
   * @returns User profile data (excluding sensitive fields).
   */
  async getProfile(user: UserPayload): Promise<UserProfile> {
    const userFound = await this.prismaService.user.findUnique({
      where: { email: user.email },
      include: { role: true },
    });

    if (!userFound) {
      throw new NotFoundException(`User con ID ${user.id} no encontrado`);
    }
    return userFound;
  }

  // Note: The actual implementation for password reset, activation, etc.,
  // should reside in the UsersService as they primarily deal with user entity
  // state changes, not just authentication state. AuthService might coordinate
  // or validate tokens, but UsersService should handle DB updates and business logic.
  // The controller correctly injects and calls UsersService for these.
}
