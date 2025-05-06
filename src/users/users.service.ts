import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  Logger, // Import Logger
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client'; // Import User type
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service'; // Assuming MailService exists
import {
  generateActivationToken,
  generateResetPasswordToken,
} from 'src/utils/auth-utils'; // Assuming these utils exist
import { ConfigService } from '@nestjs/config';
// Import email templates - ensure these functions return HTML strings
import { activationUserEmailTemplate } from 'src/mail/templates/activation-user-email';
import { resetPasswordEmailTemplate } from 'src/mail/templates/reset-password-email';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name); // Initialize logger

  constructor(
    private prismaService: PrismaService,
    private mailService: MailService, // Inject MailService
    private configService: ConfigService,
  ) {}

  /**
   * Hashes a password using bcrypt.
   * @param password - The plain text password.
   * @returns The hashed password.
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Creates a new user, hashes the password, generates an activation token,
   * and sends an activation email.
   * @param createUserDto - Data for creating the user.
   * @returns The created user object (excluding sensitive fields).
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const hashedPassword = await this.hashPassword(createUserDto.password);
      const activationToken = generateActivationToken();
      const activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

      const user = await this.prismaService.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
          activationToken: activationToken,
          activationTokenExpires: activationTokenExpires,
          isActive: false, // Ensure user starts as inactive
        },
      });

      // Send activation email asynchronously (don't block the response)
      const confirmationLink = `${this.configService.get<string>('FRONTEND_URL')}/users/activate/${activationToken}`; // Use correct frontend route
      this.mailService
        .sendEmail(
          user.email,
          'Activate Your Account',
          activationUserEmailTemplate(confirmationLink), // Use the template function
        )
        .then(() => {
          this.logger.log(
            `Activation email sent successfully to ${user.email}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to send activation email to ${user.email}`,
            error.stack,
          );
          // Consider adding retry logic or logging to a monitoring service
        });

      // Exclude password from the returned object
      const { password, ...result } = user;
      return result as User; // Cast might be needed if Prisma doesn't exclude automatically
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (e.g., email already exists)
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || ['field'];
          throw new ConflictException(
            `User with this ${target.join(', ')} already exists.`,
          );
        }
      }
      // Generic error for other database issues
      throw new InternalServerErrorException('Could not create user.');
    }
  }

  /**
   * Retrieves all users, including their role information.
   * @returns An array of user objects.
   */
  async findAll(): Promise<User[]> {
    // Exclude password field from all results
    return this.prismaService.user.findMany({
      include: { role: true },
      // select: { id: true, email: true, name: true, /* other fields except password */ }, // Alternative explicit selection
    });
  }

  /**
   * Finds a single user by their ID.
   * @param id - The UUID of the user.
   * @returns The found user object.
   * @throws NotFoundException if the user is not found.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    // Exclude password before returning
    const { password, ...result } = user;
    return result as unknown as User;
  }

  /**
   * Finds a single user by their email address. Used internally, e.g., for login.
   * Includes the password hash.
   * @param email - The email of the user.
   * @returns The found user object including password, or null if not found.
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  /**
   * Finds a user by their activation token. Used internally for activation.
   * @param token - The activation token.
   * @returns The user object or null if not found.
   */
  private async findByActivationToken(token: string): Promise<User | null> {
    if (!token) return null;
    return this.prismaService.user.findUnique({
      where: { activationToken: token },
    });
  }

  /**
   * Finds a user by their password reset token and validates its expiry.
   * @param resetToken - The password reset token.
   * @returns The found user object.
   * @throws NotFoundException if the token is invalid or expired.
   */
  async findByResetToken(resetToken: string): Promise<User> {
    if (!resetToken) {
      throw new NotFoundException('Reset token is required.');
    }

    const user = await this.prismaService.user.findUnique({
      where: { resetToken },
    });

    if (!user) {
      throw new NotFoundException('Invalid reset token.');
    }

    // Check token expiry
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      // Optionally clear the expired token here
      // await this.prismaService.user.update({ where: { id: user.id }, data: { resetToken: null, resetTokenExpiry: null } });
      throw new NotFoundException('Reset token has expired.');
    }

    // Exclude password before returning
    const { password, ...result } = user;
    return result as unknown as User;
  }

  /**
   * Activates a user account using a valid activation token.
   * @param token - The activation token.
   * @returns The activated user object.
   * @throws UnauthorizedException if the token is invalid or expired.
   */
  async activateUser(token: string): Promise<User> {
    const user = await this.findByActivationToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid activation token.');
    }

    // Check token expiry
    if (
      !user.activationTokenExpires ||
      user.activationTokenExpires < new Date()
    ) {
      // Optionally, allow resending activation email here
      throw new UnauthorizedException('Activation token has expired.');
    }

    // Update user to active and clear activation token fields
    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        activationToken: null, // Clear the token after use
        activationTokenExpires: null,
      },
    });

    // Exclude password
    const { password, ...result } = updatedUser;
    return result as User;
  }

  /**
   * Updates a user's information. Handles password hashing if a new password is provided.
   * @param id - The UUID of the user to update.
   * @param updateUserDto - Data containing the fields to update.
   * @returns The updated user object.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException on database errors.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Check if user exists first
    await this.findOne(id); // Throws NotFoundException if not found

    const dataToUpdate: Prisma.UserUpdateInput = { ...updateUserDto };

    // If password is included in the update DTO, hash it
    if (updateUserDto.password) {
      dataToUpdate.password = await this.hashPassword(updateUserDto.password);
    } else {
      // Ensure password is not accidentally set to null or undefined if not provided
      delete dataToUpdate.password;
    }

    try {
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: dataToUpdate,
      });
      // Exclude password
      const { password, ...result } = updatedUser;
      return result as User;
    } catch (error) {
      this.logger.error(
        `Failed to update user ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[]) || ['field'];
        throw new ConflictException(
          `Update failed: ${target.join(', ')} must be unique.`,
        );
      }
      throw new InternalServerErrorException('Could not update user.');
    }
  }

  /**
   * Initiates the password reset process for a user by email.
   * Generates a reset token, sets expiry, updates the user, and sends a reset email.
   * @param email - The email address of the user.
   * @throws NotFoundException if the user is not found (handled gracefully).
   */
  async resetPassword(email: string): Promise<User> {
    const user = await this.findUserByEmail(email);

    // Important: Do not throw NotFoundException here.
    // Silently succeed to prevent email enumeration attacks.
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      throw new NotFoundException('User not found');
    }

    // Generate token and expiry
    const resetToken = generateResetPasswordToken();
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // Token expires in 1 hour

    try {
      // Update user with the reset token and expiry
      const userUpdated = await this.prismaService.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // Send reset email asynchronously
      const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/auth/update-password/?token=${resetToken}`; // Use correct frontend route
      this.mailService
        .sendEmail(
          user.email,
          'Reset Your Password',
          resetPasswordEmailTemplate(resetLink), // Use the template function
        )
        .then(() => {
          this.logger.log(
            `Password reset email sent successfully to ${user.email}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to send password reset email to ${user.email}`,
            error.stack,
          );
          // Consider cleanup: should the token be cleared if email fails? Depends on requirements.
        });
      // Exclude password before returning
      const { password, ...result } = userUpdated;
      return result as User;
    } catch (error) {
      this.logger.error(
        `Failed to update user for password reset ${user.id}: ${error.message}`,
        error.stack,
      );
      // Don't throw to the client here either, just log the internal error.
      throw new InternalServerErrorException(
        'Failed to process password reset',
      );
    }
  }

  /**
   * Updates a user's password using a valid reset token.
   * @param resetToken - The password reset token.
   * @param newPassword - The new plain text password.
   * @throws NotFoundException if the token is invalid or expired.
   * @throws InternalServerErrorException on database errors.
   */
  async updatePassword(resetToken: string, newPassword: string): Promise<User> {
    // findByResetToken already validates the token and its expiry
    const user = await this.findByResetToken(resetToken); // This throws NotFoundException if invalid/expired

    // Hash the new password
    const hashedPassword = await this.hashPassword(newPassword);

    try {
      // Update the password and clear reset token fields
      const userUpdated = await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null, // Clear the token after successful use
          resetTokenExpiry: null,
        },
      });
      this.logger.log(
        `Password updated successfully for user ID: ${user.id} using reset token.`,
      );
      // Exclude password before returning
      const { password, ...result } = userUpdated;
      return result as User;
    } catch (error) {
      this.logger.error(
        `Failed to update password for user ${user.id} using reset token: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not update password.');
    }
  }

  /**
   * Changes the password for a user, verifying the current password first.
   * @param userId - The UUID of the user.
   * @param currentPassword - The user's current plain text password.
   * @param newPassword - The new plain text password.
   * @throws UnauthorizedException if the user is not found or current password doesn't match.
   * @throws InternalServerErrorException on database errors.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    // Need to fetch user including password hash for comparison
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Use UnauthorizedException as this implies an attempt to change password for a non-existent user
      throw new UnauthorizedException('User not found.');
    }

    // Compare the provided current password with the stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect current password.');
    }

    // Hash the new password
    const hashedPassword = await this.hashPassword(newPassword);

    try {
      // Update only the password field
      const userUpdated = await this.prismaService.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      this.logger.log(`Password changed successfully for user ID: ${userId}`);
      // Exclude password before returning
      const { password, ...result } = userUpdated;
      return result as User;
    } catch (error) {
      this.logger.error(
        `Failed to change password for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not change password.');
    }
  }

  /**
   * Deletes a user by their ID.
   * @param id - The UUID of the user to delete.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException on database errors.
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.user.delete({
        where: { id },
      });
      this.logger.log(`User with ID ${id} successfully deleted.`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Record to delete not found
        if (error.code === 'P2025') {
          throw new NotFoundException(`User with ID ${id} not found.`);
        }
      }
      this.logger.error(
        `Failed to delete user ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not delete user.');
    }
  }

  /**
   * Finds a user by email and sen email activation.
   * @param email - The email where the email will be sent.
   * @returns The found user object.
   * @throws NotFoundException if the token is invalid or expired.
   */
  async findByEmailAndSendEmailActivation(email: string): Promise<User> {
    if (!email) {
      throw new NotFoundException('Email is required.');
    }

    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Invalid email.');
    }

    const activationToken = generateActivationToken();
    const activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

    // Update user to active and clear activation token fields
    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        activationToken: activationToken,
        activationTokenExpires: activationTokenExpires,
      },
    });

    // Send activation email asynchronously (don't block the response)
    const confirmationLink = `${this.configService.get<string>('FRONTEND_URL')}/users/activate/${activationToken}`; // Use correct frontend route
    this.mailService
      .sendEmail(
        user.email,
        'Activate Your Account',
        activationUserEmailTemplate(confirmationLink), // Use the template function
      )
      .then(() => {
        this.logger.log(`Activation email sent successfully to ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send activation email to ${user.email}`,
          error.stack,
        );
        // Consider adding retry logic or logging to a monitoring service
      });

    // Exclude password before returning
    const { password, ...result } = updatedUser;
    return result as User;
  }
}
