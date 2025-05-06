import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode, // Import ParseUUIDPipe for ID validation
} from '@nestjs/common';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'; // Import Swagger decorators
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

import { Express } from 'express'; // Import Express namespace for Multer types
import { Project } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';

// --- Define your limits and allowed types ---
const MAX_IMAGE_SIZE_MB = 10; // Example: 10MB limit for images
const MAX_VIDEO_SIZE_MB = 40; // Example: 40MB limit for video
const ALLOWED_IMAGE_TYPES = /image\/(jpg|jpeg|png|gif|webp)$/; // Regex for allowed image mimetypes
const ALLOWED_VIDEO_TYPES = /video\/(mp4|mov|avi|wmv|mkv)$/; // Regex for allowed video mimetypes

// Helper function to convert MB to bytes
const mbToBytes = (mb: number) => mb * 1024 * 1024;

@ApiTags('projects') // Group endpoints under the 'projects' tag in Swagger UI
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // Set default success code to 201
  @ApiOperation({ summary: 'Create a new project' }) // Swagger operation summary
  @ApiConsumes('multipart/form-data') // Specify content type for Swagger
  @ApiBody({
    description: 'Project data and files (images, video)',
    type: Object, // Links to DTO, but Swagger needs manual description for files
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully.' /* type: Project */,
  }) // Define success response
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed.' }) // Define error response
  @UseInterceptors(
    FileFieldsInterceptor(
      // Use FileFieldsInterceptor for multiple file fields
      [
        { name: 'images', maxCount: 12 }, // Matches FormData key 'images'
        { name: 'video', maxCount: 1 }, // Matches FormData key 'video'
      ],
      // --- Add storage options if needed (e.g., disk storage) ---
      // {
      //   storage: diskStorage({
      //     destination: './uploads/projects', // Example destination
      //     filename: (req, file, cb) => {
      //       // Define custom filename logic if needed
      //       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      //       cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      //     },
      //   }),
      //   fileFilter: (req, file, cb) => { // Optional: Add basic file type filtering
      //      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|mp4|mov|avi)$/)) {
      //          return cb(new BadRequestException('Unsupported file type'), false);
      //      }
      //      cb(null, true);
      //   },
      //   limits: { // Optional: Set file size limits
      //       fileSize: 1024 * 1024 * 50 // 50MB limit example
      //   }
      // }
    ),
  )
  async create(
    // Access files uploaded via the interceptor
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
    // Access text fields, automatically validated and transformed by ValidationPipe
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    // 1. Validate Images
    if (files.images && files.images.length > 0) {
      for (const image of files.images) {
        // Check image type
        if (!ALLOWED_IMAGE_TYPES.test(image.mimetype)) {
          throw new BadRequestException(
            `Invalid image type: ${image.originalname}. Allowed types: jpg, jpeg, png, gif, webp.`,
          );
        }
        // Check image size
        if (image.size > mbToBytes(MAX_IMAGE_SIZE_MB)) {
          // Use 413 Payload Too Large for size errors
          throw new BadRequestException( // Or PayloadTooLargeException
            `Image file too large: ${image.originalname}. Max size: ${MAX_IMAGE_SIZE_MB}MB.`,
          );
        }
      }
    }

    // 2. Validate Video
    if (files.video && files.video.length > 0) {
      const video = files.video[0]; // Since maxCount is 1

      // Check video type
      if (!ALLOWED_VIDEO_TYPES.test(video.mimetype)) {
        throw new BadRequestException(
          `Invalid video type: ${video.originalname}. Allowed types: mp4, mov, avi, wmv, mkv.`,
        );
      }
      // Check video size
      if (video.size > mbToBytes(MAX_VIDEO_SIZE_MB)) {
        // Use 413 Payload Too Large for size errors
        throw new BadRequestException( // Or PayloadTooLargeException
          `Video file too large: ${video.originalname}. Max size: ${MAX_VIDEO_SIZE_MB}MB.`,
        );
      }
    }

    const images = files?.images;
    const video = files?.video?.[0];

    if (!images || images.length < 5) {
      throw new BadRequestException('At least 5 images are required');
    }

    // Max count check is technically handled by FileFieldsInterceptor, but doesn't hurt to double-check
    if (images.length > 12) {
      throw new BadRequestException(`No more than 12 images are allowed.`);
    }

    if (!video) {
      throw new BadRequestException('Exactly 1 video file is required.');
    }

    // Manually map technologies if it comes as a stringified array from form-data
    if (
      createProjectDto.technologies &&
      typeof createProjectDto.technologies === 'string'
    ) {
      try {
        // Attempt to parse if it looks like a JSON array string
        if ((createProjectDto.technologies as string).startsWith('[')) {
          createProjectDto.technologies = JSON.parse(
            createProjectDto.technologies as any,
          );
        } else {
          // Assume comma-separated if not JSON array format
          createProjectDto.technologies = (createProjectDto.technologies as any)
            .split(',')
            .map((tech) => tech.trim());
        }
      } catch (error) {
        throw new BadRequestException(
          'Invalid format for technologies. Expected array or comma-separated string.',
        );
      }
    }
    // Ensure technologies is an array after potential parsing
    if (!Array.isArray(createProjectDto.technologies)) {
      throw new BadRequestException(
        'Technologies must be provided as an array.',
      );
    }

    // Convert weeksWorked from string to number if necessary (form-data often sends numbers as strings)
    if (
      createProjectDto.weeksWorked &&
      typeof createProjectDto.weeksWorked === 'string'
    ) {
      const parsedWeeks = parseInt(createProjectDto.weeksWorked, 10);
      if (isNaN(parsedWeeks)) {
        throw new BadRequestException('Weeks worked must be a valid number.');
      }
      createProjectDto.weeksWorked = parsedWeeks;
    }

    return this.projectsService.create(createProjectDto, images, video);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return List of all projects.',
    type: 'object',
  })
  findAll(): Promise<Project[]> {
    return this.projectsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the project', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The project details.' /* type: ProjectEntity */,
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found.',
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' }) // For ParseUUIDPipe
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  @Public()
  @Get(':id/with-media')
  @ApiOperation({
    summary: 'Get a project by ID with presigned URLs for media',
  })
  @ApiParam({ name: 'id', description: 'UUID of the project', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project details with presigned URLs for images and video.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found.',
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format.' })
  getWithPresignedUrls(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Project> {
    return this.projectsService.getProjectWithPresignedUrls(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the project to update',
    type: String,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project successfully updated.' /* type: ProjectEntity */,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Bad Request (e.g., validation error, invalid format for existing media).',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 12 }, // Matches FormData key 'images'
      { name: 'video', maxCount: 1 }, // Matches FormData key 'video'
    ]),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
    @Body() updateProjectDto: UpdateProjectDto, // Use Update DTO
  ): Promise<Project | undefined> {
    // 1. Validate Images
    if (files.images && files.images.length > 0) {
      for (const image of files.images) {
        // Check image type
        if (!ALLOWED_IMAGE_TYPES.test(image.mimetype)) {
          throw new BadRequestException(
            `Invalid image type: ${image.originalname}. Allowed types: jpg, jpeg, png, gif, webp.`,
          );
        }
        // Check image size
        if (image.size > mbToBytes(MAX_IMAGE_SIZE_MB)) {
          // Use 413 Payload Too Large for size errors
          throw new BadRequestException( // Or PayloadTooLargeException
            `Image file too large: ${image.originalname}. Max size: ${MAX_IMAGE_SIZE_MB}MB.`,
          );
        }
      }
    }

    // 2. Validate Video
    if (files.video && files.video.length > 0) {
      const video = files.video[0]; // Since maxCount is 1

      // Check video type
      if (!ALLOWED_VIDEO_TYPES.test(video.mimetype)) {
        throw new BadRequestException(
          `Invalid video type: ${video.originalname}. Allowed types: mp4, mov, avi, wmv, mkv.`,
        );
      }
      // Check video size
      if (video.size > mbToBytes(MAX_VIDEO_SIZE_MB)) {
        // Use 413 Payload Too Large for size errors
        throw new BadRequestException( // Or PayloadTooLargeException
          `Video file too large: ${video.originalname}. Max size: ${MAX_VIDEO_SIZE_MB}MB.`,
        );
      }
    }

    const images = files?.images;
    const video = files?.video?.[0];

    // Parse existingImages from string to array if it exists
    if (
      updateProjectDto.existingImages &&
      typeof updateProjectDto.existingImages === 'string'
    ) {
      try {
        updateProjectDto.existingImages = JSON.parse(
          updateProjectDto.existingImages,
        );
      } catch (error) {
        throw new BadRequestException('Invalid existingImages format');
      }
    }

    // Parse existingVideo from string if it exists
    if (
      updateProjectDto.existingVideo &&
      typeof updateProjectDto.existingVideo === 'string'
    ) {
      // If it's a JSON string, parse it
      if (
        updateProjectDto.existingVideo.startsWith('[') ||
        updateProjectDto.existingVideo.startsWith('{')
      ) {
        try {
          updateProjectDto.existingVideo = JSON.parse(
            updateProjectDto.existingVideo,
          );
        } catch (error) {
          // If parsing fails, keep it as is - it might be a simple string URL
          console.error('Failed to parse existingVideo:', error);
        }
      }
    }

    if (
      (!images && !updateProjectDto.existingImages) ||
      (images?.length ?? 0) + (updateProjectDto.existingImages?.length ?? 0) < 5
    ) {
      throw new BadRequestException('At least 5 images are required');
    }

    // Max count check is technically handled by FileFieldsInterceptor, but doesn't hurt to double-check
    if (
      (!images && !updateProjectDto.existingImages) ||
      (images?.length ?? 0) + (updateProjectDto.existingImages?.length ?? 0) >
        12
    ) {
      throw new BadRequestException(`No more than 12 images are allowed.`);
    }

    if (!video && !updateProjectDto.existingVideo) {
      throw new BadRequestException('Exactly 1 video file is required.');
    }

    // Parse technologies (expecting JSON stringified array or comma-separated string)
    if (
      updateProjectDto.technologies &&
      typeof updateProjectDto.technologies === 'string'
    ) {
      try {
        // Attempt to parse if it looks like a JSON array string
        if ((updateProjectDto.technologies as string).startsWith('[')) {
          updateProjectDto.technologies = JSON.parse(
            updateProjectDto.technologies as any,
          );
        } else {
          // Assume comma-separated if not JSON array format
          updateProjectDto.technologies = (updateProjectDto.technologies as any)
            .split(',')
            .map((tech) => tech.trim());
        }
      } catch (error) {
        throw new BadRequestException(
          'Invalid format for technologies. Expected array or comma-separated string.',
        );
      }
    }
    // Ensure technologies is an array after potential parsing if it exists
    if (
      updateProjectDto.technologies &&
      !Array.isArray(updateProjectDto.technologies)
    ) {
      throw new BadRequestException(
        'Technologies must be provided as an array.',
      );
    }

    // Convert weeksWorked from string to number if necessary
    if (
      updateProjectDto.weeksWorked &&
      typeof updateProjectDto.weeksWorked === 'string'
    ) {
      const parsedWeeks = parseInt(updateProjectDto.weeksWorked, 10);
      if (isNaN(parsedWeeks)) {
        throw new BadRequestException('Weeks worked must be a valid number.');
      }
      updateProjectDto.weeksWorked = parsedWeeks;
    }

    return this.projectsService.update(id, updateProjectDto, images, video);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the project to delete',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Project successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format.',
  }) // For ParseUUIDPipe
  remove(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.projectsService.remove(id);
  }
}
