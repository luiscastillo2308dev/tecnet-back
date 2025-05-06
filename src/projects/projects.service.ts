import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Project } from '@prisma/client';
import { S3Service } from 'src/common/services/aws-s3.service';
import { DatabaseErrorService } from 'src/common/services/database-error.service';
import { sanitizeFilename } from 'src/utils/sanitize-filenames-utils';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
    private readonly dbErrorService: DatabaseErrorService,
  ) {}

  /**
   * Creates a new project, uploads associated images and video to S3,
   * and saves the project details (including S3 keys) to the database.
   *
   * @param createProjectDto - Data Transfer Object containing project details (name, description, etc.).
   * @param images - An array of image files (Express.Multer.File) to be uploaded.
   * @param video - A single video file (Express.Multer.File) to be uploaded.
   * @returns A Promise resolving to the newly created Project object.
   * @throws {InternalServerErrorException} If there's an issue during file upload or database operation.
   * @throws {BadRequestException} If a unique constraint (e.g., project name) is violated.
   */
  async create(
    createProjectDto: CreateProjectDto,
    images: Express.Multer.File[],
    video: Express.Multer.File,
  ): Promise<Project> {
    try {
      // --- Sanitize filenames before generating keys ---
      const sanitizedImageFilenames = images.map((image) =>
        sanitizeFilename(image.originalname),
      );
      const sanitizedVideoFilename = sanitizeFilename(video.originalname);

      // Generate S3 keys using sanitized filenames
      const imageKeys = sanitizedImageFilenames.map(
        (safeName) => `projects/images/${Date.now()}-${safeName}`,
      );
      const videoKey = `projects/videos/${Date.now()}-${sanitizedVideoFilename}`;

      // Upload images to S3 using the generated keys
      await Promise.all(
        images.map((image, index) =>
          this.s3Service.uploadFileToS3(image, imageKeys[index]),
        ),
      );

      // Upload video to S3
      await this.s3Service.uploadFileToS3(video, videoKey);

      // Convert weeksWorked to integer
      const projectData = {
        ...createProjectDto,
        weeksWorked: createProjectDto.weeksWorked
          ? parseInt(createProjectDto.weeksWorked.toString(), 10)
          : 0,
        // Store only the S3 keys, not the presigned URLs
        images: imageKeys,
        video: videoKey,
      };

      return await this.prismaService.project.create({
        data: projectData,
      });
    } catch (error) {
      this.dbErrorService.handleUniqueConstraintError(
        error,
        'Project',
        'name',
        createProjectDto.name,
      );
    }
  }

  /**
   * Retrieves all projects from the database, including their associated category details.
   *
   * @returns A Promise resolving to an array of Project objects.
   * @throws {InternalServerErrorException} If a database error occurs during fetching.
   */
  async findAll(): Promise<Project[]> {
    try {
      return await this.prismaService.project.findMany({
        include: { category: true },
      });
    } catch (error) {
      this.dbErrorService.handleDatabaseError(
        error,
        'Failed to fetch projects',
      );
    }
  }

  /**
   * Retrieves a single project by its unique ID, including its associated category.
   *
   * @param id - The UUID string of the project to find.
   * @returns A Promise resolving to the found Project object.
   * @throws {NotFoundException} If no project with the specified ID exists.
   * @throws {InternalServerErrorException} If a database error occurs during fetching.
   */
  async findOne(id: string): Promise<Project> {
    try {
      const projectFound = await this.prismaService.project.findUnique({
        where: { id },
        include: { category: true },
      });
      if (!projectFound) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      return projectFound;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.dbErrorService.handleDatabaseError(
        error,
        `Failed to fetch project with ID ${id}`,
      );
    }
  }

  /**
   * Retrieves a single project by ID and enhances it with pre-signed S3 URLs
   * for its associated images and video, allowing temporary public access.
   *
   * @param id - The UUID string of the project.
   * @returns A Promise resolving to an object containing the project data
   * along with `imageUrls` (array of strings) and `videoUrl` (string or null).
   * @throws {NotFoundException} If the project with the specified ID doesn't exist.
   * @throws {InternalServerErrorException} If there's an error fetching the project or generating URLs.
   */
  async getProjectWithPresignedUrls(id: string): Promise<any> {
    const project = await this.findOne(id);

    // Generate presigned URLs for images
    const imageUrls = await Promise.all(
      project.images.map((imageKey) =>
        this.s3Service.getPresignedUrl(imageKey),
      ),
    );

    // Generate presigned URL for video
    const videoUrl = project.video
      ? await this.s3Service.getPresignedUrl(project.video)
      : null;

    return {
      ...project,
      imageUrls,
      videoUrl,
    };
  }

  /**
   * Updates an existing project by its ID. Handles updating text fields,
   * replacing/adding/removing images, and replacing/removing the video in S3 and the database.
   *
   * @param id - The UUID string of the project to update.
   * @param updateProjectDto - DTO containing the fields to update. Includes optional
   * `existingImages` (array of keys/URLs to keep) and
   * `existingVideo` (key/URL to keep or null to remove).
   * @param imageFiles - Optional array of new image files (Express.Multer.File) to upload.
   * @param videoFile - Optional new video file (Express.Multer.File) to upload.
   * @returns A Promise resolving to the updated Project object.
   * @throws {NotFoundException} If the project with the specified ID doesn't exist.
   * @throws {BadRequestException} If `existingImages` has an invalid format.
   * @throws {InternalServerErrorException} If there's an error during file operations or database update.
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    imageFiles?: Express.Multer.File[],
    videoFile?: Express.Multer.File,
  ): Promise<Project | undefined> {
    try {
      const project = await this.findOne(id); // Ensure project exists
      const updateData: any = { ...updateProjectDto };

      // --- Image Handling ---
      let imagesToKeep: string[] = [];
      const imagesToDelete: string[] = [];
      const currentImageKeys = project.images || [];

      // Step 1: Process existing images
      if (
        updateData.existingImages &&
        Array.isArray(updateData.existingImages)
      ) {
        // Extract S3 keys from presigned URLs
        // const existingImageKeys = updateData.//existingImages.map(extractS3Key);
        const existingImageKeys = updateData.existingImages.map((imageKey) => {
          return this.s3Service.extractKeyFromUrl(imageKey);
        });
        this.logger.debug('Existing image keys:', existingImageKeys);

        // Find images to keep and delete
        project.images.forEach((imageKey) => {
          if (existingImageKeys.includes(imageKey)) {
            imagesToKeep.push(imageKey);
          } else {
            imagesToDelete.push(imageKey);
          }
        });
      } else {
        // If no existingImages provided, delete all existing images
        imagesToDelete.push(...project.images);
      }

      this.logger.debug(`Images to keep: ${imagesToKeep.join(', ')}`);
      this.logger.debug(`Images to delete: ${imagesToDelete.join(', ')}`);

      // Delete images marked for removal directly using the key
      await Promise.all(
        imagesToDelete.map(async (imageKey) => {
          try {
            this.logger.log(`Deleting image with key: ${imageKey}`);
            await this.s3Service.deleteFileByKey(imageKey); // Use the key directly
          } catch (error) {
            // Log error but potentially continue? Or should failure stop the update?
            this.logger.error(
              `Failed to delete image ${imageKey} from S3:`,
              error.stack,
            );
          }
        }),
      );

      // Upload new images
      const newImageKeys: string[] = [];
      if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (image) => {
          // *** Apply sanitization to new image filenames ***
          const sanitizedImageFilename = sanitizeFilename(image.originalname);
          const imageKey = `projects/images/${Date.now()}-${sanitizedImageFilename}`;
          this.logger.debug(`Uploading new image with key: ${imageKey}`);

          // uploadFileToS3 now returns the key
          return await this.s3Service.uploadFileToS3(image, imageKey);
        });
        newImageKeys.push(...(await Promise.all(uploadPromises)));
      }

      // Combine kept and new image keys
      updateData.images = [...imagesToKeep, ...newImageKeys];
      // Clean up DTO field if it exists
      if ('existingImages' in updateProjectDto)
        delete updateData.existingImages;

      // --- Video Handling ---
      if (videoFile) {
        const sanitizedVideoFilename = sanitizeFilename(videoFile.originalname);

        const videoKey = `projects/videos/${Date.now()}-${sanitizedVideoFilename}`;
        // Upload new video
        await this.s3Service.uploadFileToS3(videoFile, videoKey);
        updateData.video = videoKey;

        // Delete old video if it exists, using its key
        if (project.video) {
          try {
            this.logger.log(`Deleting old video with key: ${project.video}`);
            await this.s3Service.deleteFileByKey(project.video); // Use the key directly
          } catch (error) {
            this.logger.error(
              `Failed to delete old video ${project.video} from S3:`,
              error.stack,
            );
          }
        }
      } else if (updateProjectDto.existingVideo === null) {
        // Check DTO if video should be removed
        // If DTO explicitly asks to remove video, delete it
        if (project.video) {
          try {
            this.logger.log(
              `Deleting video explicitly via DTO (null): ${project.video}`,
            );
            await this.s3Service.deleteFileByKey(project.video); // Use the key directly
            updateData.video = null; // Set DB field to null
          } catch (error) {
            this.logger.error(
              `Failed to delete video ${project.video} from S3:`,
              error.stack,
            );
          }
        }
      }
      // Clean up DTO field if it exists
      if ('existingVideo' in updateProjectDto) delete updateData.existingVideo;

      // --- Other fields ---
      if (updateProjectDto.weeksWorked !== undefined) {
        updateData.weeksWorked = parseInt(
          updateProjectDto.weeksWorked.toString(),
          10,
        );
      }

      this.logger.debug('Final update data for Prisma:', updateData);

      // Update the project in the database
      const updatedProject = await this.prismaService.project.update({
        where: { id },
        data: updateData,
      });

      return updatedProject;
    } catch (error) {
      this.logger.error(`Failed to update project ${id}:`, error.stack);
      // Handle specific errors (e.g., NotFoundException, Prisma errors) or rethrow
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Use dbErrorService or throw a generic error
      this.dbErrorService.handleDatabaseError(
        error,
        `Failed to update project with ID ${id}`,
      );
      // It might be better to throw a specific error type like InternalServerErrorException
      // throw new InternalServerErrorException(`Failed to update project ${id}`);
      return undefined; // Or handle as appropriate
    }
  }

  /**
   * Deletes a project by its ID. Also attempts to delete associated images and video
   * from S3. Deletion from the database occurs even if S3 deletion fails partially or fully.
   *
   * @param id - The UUID string of the project to delete.
   * @returns A Promise resolving to an object indicating success status and a message.
   * @throws {NotFoundException} If the project with the specified ID doesn't exist.
   * @throws {InternalServerErrorException} If a database error occurs during deletion. S3 errors are logged but don't prevent DB deletion attempt.
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    let project: Project | null = null;
    try {
      // First, get the project to access its image and video keys
      project = await this.findOne(id); // This throws NotFoundException if not found

      const deletePromises: Promise<void>[] = [];

      // Add image deletion promises
      if (project.images && Array.isArray(project.images)) {
        project.images.forEach((imageKey) => {
          if (imageKey) {
            // Check if key is not null/empty
            this.logger.log(`Scheduling deletion for image key: ${imageKey}`);
            deletePromises.push(this.s3Service.deleteFileByKey(imageKey)); // Use the key directly
          }
        });
      }

      // Add video deletion promise
      if (project.video) {
        this.logger.log(`Scheduling deletion for video key: ${project.video}`);
        deletePromises.push(this.s3Service.deleteFileByKey(project.video)); // Use the key directly
      }

      // Execute all S3 deletions concurrently
      const results = await Promise.allSettled(deletePromises);

      // Log any S3 deletion failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Determine which key failed based on the order/index (less reliable)
          // Or modify deleteFileByKey to return the key on success/failure
          this.logger.error(
            `Failed S3 deletion during remove operation: ${result.reason}`,
          );
          // Decide if DB deletion should proceed even if S3 fails
        }
      });

      // Now delete the project from the database
      await this.prismaService.project.delete({
        where: { id },
      });

      return {
        success: true,
        message: `Project with ID ${id} and its associated S3 files (attempted deletion) successfully deleted from DB.`,
      };
    } catch (error) {
      // Log the error context
      this.logger.error(
        `Failed to remove project ${id}. Project data at time of error: ${JSON.stringify(project)}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException as it's a valid client error
      }
      // Handle other errors (S3 errors from deleteFileByKey if rethrown, Prisma errors)
      this.dbErrorService.handleDatabaseError(
        error,
        `Failed to delete project with ID ${id}`, // This might hide specific S3 errors
      );
      // Consider returning a more specific error response
      return {
        success: false,
        message: `Failed to delete project with ID ${id}. Error: ${error.message}`,
      };
    }
  }
}
