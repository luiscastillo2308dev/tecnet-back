import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger, // Import Logger
  NotFoundException, // Import exceptions
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/decorators/public.decorator'; // Assuming this decorator exists
import { ResetPasswordDto } from './dto/reset-password.dto'; // DTO for initiating reset
import { ChangePasswordDto } from './dto/change-password.dto'; // DTO for setting new password (both cases)
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth, // If using JWT auth for protected routes
} from '@nestjs/swagger';
import { User } from '@prisma/client'; // Import User type for responses
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Users') // Group endpoints under 'Users' tag
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name); // Initialize logger

  constructor(private readonly usersService: UsersService) {}

  @Public() // Mark as public if user creation doesn't require auth
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The user has been successfully created.',
    type: CreateUserDto, // Use Prisma model or a specific UserResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists.',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(
      `Attempting to create user with email: ${createUserDto.email}`,
    );
    // Password confirmation logic can be added here or in the service if needed
    return this.usersService.create(createUserDto);
  }

  // Consider protecting this endpoint if it's not meant for public access
  // @ApiBearerAuth() // Add if protected by JWT AuthGuard
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all users' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved all users.',
    type: [CreateUserDto], // Array of users
  })
  async findAll(): Promise<User[]> {
    this.logger.log('Request received to find all users');
    return this.usersService.findAll();
  }

  // Consider protecting this endpoint
  // @ApiBearerAuth()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a specific user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved the user.',
    type: CreateUserDto, // Replace with a DTO or interface representing the user response
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format.',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    this.logger.log(`Request received to find user with ID: ${id}`);
    const user = await this.usersService.findOne(id);
    // Service already throws NotFoundException, no need to check here again
    return user;
  }

  // Consider protecting this endpoint
  // @ApiBearerAuth()
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: String,
    format: 'uuid',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully updated the user.',
    type: UpdateUserDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or UUID format.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    this.logger.log(`Request received to update user with ID: ${id}`);
    // The service handles the update logic, including password hashing if present
    return this.usersService.update(id, updateUserDto);
  }

  // Consider protecting this endpoint
  // @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted the user.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Request received to delete user with ID: ${id}`);
    await this.usersService.remove(id);
    // No return needed for NO_CONTENT
  }

  // --- Activation and Password Management ---

  @Public()
  @Patch('activate/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user account using activation token' })
  @ApiParam({
    name: 'token',
    description: 'Activation token from email',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User account successfully activated.',
    type: CreateUserDto, // Replace with a DTO representing the user response
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token.',
  })
  async activate(@Param('token') token: string): Promise<User> {
    this.logger.log(
      `Attempting to activate user with token: ${token.substring(0, 10)}...`,
    );
    return this.usersService.activateUser(token);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK) // Or ACCEPTED if processing is async
  @ApiOperation({ summary: 'Initiate password reset process' })
  @ApiBody({ type: ResetPasswordDto }) // Use DTO for email
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent if user exists.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email format.',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<User> {
    this.logger.log(
      `Password reset requested for email: ${resetPasswordDto.email}`,
    );
    // Service handles finding user and sending email. Avoid confirming user existence here for security.
    return await this.usersService.resetPassword(resetPasswordDto.email);
  }

  @Public()
  @Get('check-token/:resetToken') // Renamed param for clarity
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if a password reset token is valid' })
  @ApiParam({
    name: 'resetToken',
    description: 'Password reset token',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token is valid.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired token.',
  })
  async checkResetToken(
    @Param('resetToken') resetToken: string,
  ): Promise<User> {
    this.logger.log(`Checking reset token: ${resetToken.substring(0, 10)}...`);
    return await this.usersService.findByResetToken(resetToken); // Service throws if invalid/expired
  }

  @Public()
  @Patch('update-password/:resetToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update password using a reset token' })
  @ApiParam({
    name: 'resetToken',
    description: 'Password reset token',
    type: String,
  })
  @ApiBody({ type: UpdatePasswordDto }) // Use the specific DTO
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired token.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Passwords do not match or invalid input.',
  })
  async updatePasswordWithToken(
    @Param('resetToken') resetToken: string,
    @Body() updatePasswordDto: UpdatePasswordDto, // Use the DTO
  ): Promise<User> {
    this.logger.log(
      `Attempting password update with token: ${resetToken.substring(0, 10)}...`,
    );
    if (
      updatePasswordDto.newPassword !== updatePasswordDto.newPasswordConfirm
    ) {
      throw new BadRequestException('Passwords do not match.');
    }
    return await this.usersService.updatePassword(
      resetToken,
      updatePasswordDto.newPassword,
    );
  }

  // This endpoint assumes the user is authenticated (e.g., changing their own password)
  // Add @UseGuards(AuthGuard('jwt')) or similar if needed
  // @ApiBearerAuth()
  @Patch('change-password/:userId') // Or perhaps get userId from JWT payload instead of param
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for an authenticated user' })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    type: String,
    format: 'uuid',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password successfully changed.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Incorrect current password or user not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Passwords do not match or invalid input.',
  })
  async changePassword(
    @Param('userId', ParseUUIDPipe) userId: string, // Validate UUID
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<User> {
    this.logger.log(`Attempting password change for user ID: ${userId}`);
    if (
      changePasswordDto.newPassword !== changePasswordDto.newPasswordConfirm
    ) {
      throw new BadRequestException('New passwords do not match.');
    }
    return await this.usersService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Public()
  @Get('inactive-user-and-send-email/:email') // Renamed param for clarity
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Check if the user is found and send a new email to activate their account',
  })
  @ApiParam({
    name: 'email',
    description: 'Password reset token',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User found and send email.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired token.',
  })
  async checkEmailAndSendEmailActivation(
    @Param('email') email: string,
  ): Promise<User> {
    return await this.usersService.findByEmailAndSendEmailActivation(email);
  }
}
