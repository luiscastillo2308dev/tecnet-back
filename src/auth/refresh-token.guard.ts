import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'; // Import specific JWT errors

@Injectable()
// Use the strategy name ('refresh') defined in RefreshStrategy
export class RefreshTokenGuard extends AuthGuard('refresh') {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add custom logic before calling super.canActivate() if needed
    this.logger.log('RefreshTokenGuard activated.');
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): any {
    // You can throw an exception based on either "info" or "err" arguments
    if (info) {
      // Log specific JWT errors
      if (info instanceof TokenExpiredError) {
        this.logger.warn(`Refresh token expired: ${info.message}`);
        throw new UnauthorizedException('Refresh token has expired.');
      }
      if (info instanceof JsonWebTokenError) {
        this.logger.warn(`Invalid refresh token: ${info.message}`);
        throw new UnauthorizedException('Invalid refresh token.');
      }
      // Handle cases where ExtractJwt couldn't find the token (e.g., missing body field)
      if (info.message === 'No auth token') {
        this.logger.warn('Refresh token missing from request body.');
        // Note: The strategy might throw BadRequestException first if passReqToCallback is true
        // and it checks req.body directly. This handles cases where extraction itself fails.
        throw new UnauthorizedException('Refresh token is required.');
      }
      this.logger.warn(`Refresh token authentication error: ${info.message}`);
    }

    if (err || !user) {
      this.logger.error(
        `Refresh token authentication failed. Error: ${err?.message || 'No user object returned'}`,
      );
      // Ensure a consistent UnauthorizedException is thrown
      throw (
        err ||
        new UnauthorizedException(
          'Authentication required: Invalid or missing refresh token.',
        )
      );
    }

    // If validation is successful, Passport attaches the user object returned by
    // the strategy's validate() method to the request.
    this.logger.log(
      `Refresh token validated. User ID: ${user.id} attached to request.`,
    );
    return user; // Return the user object to be attached to request.user
  }
}
