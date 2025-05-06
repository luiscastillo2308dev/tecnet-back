import {
  Controller,
  UseGuards,
  Request,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Body,
  Patch,
  Param,
  BadRequestException,
  ParseUUIDPipe, // Import ParseUUIDPipe for validation
  Logger,
  UnauthorizedException, // Import Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth, // For protected routes
  ApiParam,
} from '@nestjs/swagger'; // Import Swagger decorators

import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { Public } from 'src/decorators/public.decorator';
// Assume a RefreshTokenGuard exists that uses RefreshStrategy
import { RefreshTokenGuard } from './refresh-token.guard'; // Corrected Guard usage
import { RefreshTokenDto } from './dto/refresh-token.dto';

import { RefreshStrategy } from './refresh.strategy';

// --- Interface for Request object with user payload ---
// Consider creating a custom decorator (@CurrentUser) for cleaner access
interface RequestWithUser extends Request {
  user: {
    id: string; // Changed from userId for consistency
    email: string;
    // refreshToken might be present depending on the guard/strategy
    refreshToken?: string;
  };
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

@ApiTags('Authentication') // Group endpoints under 'Authentication' in Swagger UI
@Controller('auth')
export class AuthController {
  // Inject Logger
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService, // Inject UsersService
  ) {}

  // --- Standard Auth ---

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK) // Explicitly set OK status
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful, returns tokens.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials.',
  })
  async login(@Request() req: RequestWithUser): Promise<LoginResponse> {
    // this.logger.log(`Login attempt for user: ${req.user.email}`);
    return this.authService.login(req.user); // Pass only the user ID instead of the incomplete user object
  }

  @UseGuards(JwtAuthGuard) // Protected by JWT access token
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth() // Indicate JWT is needed in Swagger
  @ApiOperation({ summary: 'Log out the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logout successful.' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated.',
  })
  async logout(@Request() req: RequestWithUser) {
    // this.logger.log(`Logout request for user ID: ${req.user.id}`);
    // Ensure req.user.id is correctly populated by JwtAuthGuard
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User information not found in request.');
    }
    return this.authService.logout(req.user.id);
  }

  @Public()
  @UseGuards(RefreshStrategy) // Incorrect: Guards use Strategies
  // @UseGuards(RefreshTokenGuard) // Correct: Use a guard that employs the RefreshStrategy
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token.',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    // Get user from the RefreshTokenGuard
    //this.logger.log(`Token refresh requested for user ID: ${req.user.id}`);

    // The RefreshTokenGuard should validate the token and attach user/token info
    // We might need the refresh token itself if the guard doesn't handle rotation logic internally
    // For simplicity, assuming guard attaches user, and service handles finding the token if needed.
    // Adjust based on your RefreshTokenGuard implementation.
    // If the guard requires the token in the body AND validates it, you might need both @Body and @Request
    // Let's assume the guard provides the necessary user context (id, email) and the service
    // can retrieve the specific token from the request or user context if needed for rotation.

    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @UseGuards(JwtAuthGuard) // Protected by JWT access token
  @Get('profile')
  @ApiBearerAuth() // Indicate JWT is needed
  @ApiOperation({ summary: 'Get the profile of the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Returns user profile data.' /* type: UserProfileDto - Define if needed */,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated.',
  })
  async getProfile(@Request() req: RequestWithUser) {
    // this.logger.log(`Profile requested for user ID: ${req.user.id}`);
    // The user object (id, email) is attached by JwtAuthGuard
    return this.authService.getProfile(req.user); // Pass user ID
  }
}
