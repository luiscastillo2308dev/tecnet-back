import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger, // Import Logger for better error logging
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service'; // Assuming PrismaService path
// Import Prisma error codes and generated types
import { Prisma, Category } from '@prisma/client';

@Injectable()
export class CategoriesService {
  // Inject PrismaService
  constructor(private prismaService: PrismaService) {}

  // Optional: Initialize logger for this service context
  private readonly logger = new Logger(CategoriesService.name);

  /**
   * Creates a new category using Prisma.
   * @param createCategoryDto - Data for the new category.
   * @returns The created Category object.
   * @throws ConflictException if a category with the same name already exists (P2002).
   * @throws InternalServerErrorException for other database errors.
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.prismaService.category.create({
        data: createCategoryDto,
      });
    } catch (error) {
      // Check for Prisma's unique constraint violation error
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Log the specific conflict
        this.logger.warn(
          `Attempted to create category with existing name: ${createCategoryDto.name}`,
          error.stack,
        );
        throw new ConflictException(
          `Role with name '${createCategoryDto.name}' already exists`,
        );
      }
      // Log the unexpected error
      this.logger.error('Failed to create category', error.stack);
      // Throw a generic server error for other issues
      throw new InternalServerErrorException('Could not create category.');
    }
  }

  /**
   * Retrieves all categories from the database.
   * @returns An array of Role objects.
   */
  async findAll(): Promise<Category[]> {
    try {
      return await this.prismaService.category.findMany();
    } catch (error) {
      this.logger.error('Failed to fetch all categories', error.stack);
      throw new InternalServerErrorException('Could not retrieve categories.');
    }
  }

  /**
   * Retrieves a single category by its ID.
   * @param id - The UUID string of the category to find.
   * @returns The found Category object.
   * @throws NotFoundException if no category with the given ID is found.
   */
  async findOne(id: string): Promise<Category> {
    const categoryFound = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!categoryFound) {
      this.logger.warn(`Category with ID "${id}" not found.`);
      // Throw NotFoundException if the category doesn't exist
      // Consider using a more generic message or i18n for production
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return categoryFound;
  }

  /**
   * Updates an existing category by its ID.
   * @param id - The UUID string of the category to update.
   * @param updateCategoryDto - Data to update the category with.
   * @returns The updated Category object.
   * @throws NotFoundException if the category with the given ID is not found (P2025).
   * @throws ConflictException if the update violates a unique constraint (e.g., name) (P2002).
   * @throws InternalServerErrorException for other errors.
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // First, ensure the category exists (optional, as update can throw P2025, but good for clarity)
    // await this.findOne(id); // Let findOne handle the NotFoundException early

    try {
      return await this.prismaService.category.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Check for record not found error during update
        if (error.code === 'P2025') {
          this.logger.warn(
            `Attempted to update non-existent category with ID: ${id}`,
          );
          throw new NotFoundException(`Category with ID "${id}" not found`);
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
            `Cannot update category. The value for '${conflictingField}' is already in use.`,
          );
        }
      }
      // Log unexpected errors during update
      this.logger.error(
        `Failed to update category with ID: ${id}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not update category.');
    }
  }

  /**
   * Deletes a category by its ID.
   * @param id - The UUID string of the category to delete.
   * @returns void
   * @throws NotFoundException if the category with the given ID is not found (P2025).
   * @throws InternalServerErrorException for other errors.
   */
  async remove(id: string): Promise<void> {
    // First, ensure the role exists (optional, as delete can throw P2025)
    // await this.findOne(id); // Let findOne handle the NotFoundException early

    try {
      await this.prismaService.category.delete({
        where: { id },
      });
      // No return needed, successful deletion implies void
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025' // Record to delete not found
      ) {
        this.logger.warn(
          `Attempted to delete non-existent category with ID: ${id}`,
        );
        // Throw NotFoundException if the record to delete doesn't exist
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }
      // Log unexpected errors during deletion
      this.logger.error(
        `Failed to delete category with ID: ${id}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not delete category.');
    }
  }
}
