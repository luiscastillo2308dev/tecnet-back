import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger, // Import Logger for better error logging
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.service'; // Assuming PrismaService path
// Import Prisma error codes and generated types
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class RolesService {
  // Inject PrismaService
  constructor(private prismaService: PrismaService) {}

  // Optional: Initialize logger for this service context
  private readonly logger = new Logger(RolesService.name);

  /**
   * Creates a new role using Prisma.
   * @param createRoleDto - Data for the new role.
   * @returns The created Role object.
   * @throws ConflictException if a role with the same name already exists (P2002).
   * @throws InternalServerErrorException for other database errors.
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      return await this.prismaService.role.create({
        data: createRoleDto,
      });
    } catch (error) {
      // Check for Prisma's unique constraint violation error
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Log the specific conflict
        this.logger.warn(
          `Attempted to create role with existing name: ${createRoleDto.name}`,
          error.stack,
        );
        throw new ConflictException(
          `Role with name '${createRoleDto.name}' already exists`,
        );
      }
      // Log the unexpected error
      this.logger.error('Failed to create role', error.stack);
      // Throw a generic server error for other issues
      throw new InternalServerErrorException('Could not create role.');
    }
  }

  /**
   * Retrieves all roles from the database.
   * @returns An array of Role objects.
   */
  async findAll(): Promise<Role[]> {
    try {
      return await this.prismaService.role.findMany();
    } catch (error) {
      this.logger.error('Failed to fetch all roles', error.stack);
      throw new InternalServerErrorException('Could not retrieve roles.');
    }
  }

  /**
   * Retrieves a single role by its ID.
   * @param id - The UUID string of the role to find.
   * @returns The found Role object.
   * @throws NotFoundException if no role with the given ID is found.
   */
  async findOne(id: string): Promise<Role> {
    const roleFound = await this.prismaService.role.findUnique({
      where: { id },
    });

    if (!roleFound) {
      this.logger.warn(`Role with ID "${id}" not found.`);
      // Throw NotFoundException if the role doesn't exist
      // Consider using a more generic message or i18n for production
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return roleFound;
  }

  /**
   * Updates an existing role by its ID.
   * @param id - The UUID string of the role to update.
   * @param updateRoleDto - Data to update the role with.
   * @returns The updated Role object.
   * @throws NotFoundException if the role with the given ID is not found (P2025).
   * @throws ConflictException if the update violates a unique constraint (e.g., name) (P2002).
   * @throws InternalServerErrorException for other errors.
   */
  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    // First, ensure the role exists (optional, as update can throw P2025, but good for clarity)
    // await this.findOne(id); // Let findOne handle the NotFoundException early

    try {
      return await this.prismaService.role.update({
        where: { id },
        data: updateRoleDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Check for record not found error during update
        if (error.code === 'P2025') {
          this.logger.warn(
            `Attempted to update non-existent role with ID: ${id}`,
          );
          throw new NotFoundException(`Role with ID "${id}" not found`);
        }
        // Check for unique constraint violation on update
        if (error.code === 'P2002') {
          // Extract the field causing the conflict if possible (depends on error meta)
          const conflictingField =
            (error.meta?.target as string[])?.join(', ') || 'name';
          this.logger.warn(
            `Update failed due to conflict on field(s): ${conflictingField} for role ID: ${id}`,
          );
          throw new ConflictException(
            `Cannot update role. The value for '${conflictingField}' is already in use.`,
          );
        }
      }
      // Log unexpected errors during update
      this.logger.error(`Failed to update role with ID: ${id}`, error.stack);
      throw new InternalServerErrorException('Could not update role.');
    }
  }

  /**
   * Deletes a role by its ID.
   * @param id - The UUID string of the role to delete.
   * @returns void
   * @throws NotFoundException if the role with the given ID is not found (P2025).
   * @throws InternalServerErrorException for other errors.
   */
  async remove(id: string): Promise<void> {
    // First, ensure the role exists (optional, as delete can throw P2025)
    // await this.findOne(id); // Let findOne handle the NotFoundException early

    try {
      await this.prismaService.role.delete({
        where: { id },
      });
      // No return needed, successful deletion implies void
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025' // Record to delete not found
      ) {
        this.logger.warn(
          `Attempted to delete non-existent role with ID: ${id}`,
        );
        // Throw NotFoundException if the record to delete doesn't exist
        throw new NotFoundException(`Role with ID "${id}" not found`);
      }
      // Log unexpected errors during deletion
      this.logger.error(`Failed to delete role with ID: ${id}`, error.stack);
      throw new InternalServerErrorException('Could not delete role.');
    }
  }
}
