import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDate,
  IsUrl, // Consider using IsUrl if images/video must be URLs
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from './create-project.dto';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Updated name of the project (must be unique if changed)',
    example: 'Enhanced Portfolio Website',
  })
  @IsOptional() // Mark field as optional for updates
  @IsString()
  @MaxLength(100)
  name?: string; // Use '?' to indicate the field is optional

  @ApiPropertyOptional({
    description: 'Updated detailed description of the project',
    example:
      'An updated website showcasing my work using NestJS, React, and GraphQL.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated list of technologies used in the project',
    example: [
      'NestJS',
      'React',
      'TypeScript',
      'Prisma',
      'PostgreSQL',
      'GraphQL',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Validates each element in the array is a string
  technologies: string[];

  @ApiPropertyOptional({
    description: 'Updated number of weeks spent working on the project.',
    example: 8,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Weeks worked must be an integer.' })
  @Min(1, { message: 'Weeks worked must be at least 1.' })
  weeksWorked?: number;

  @ApiPropertyOptional({
    description: 'Updated price on the project.',
    example: 500.0,
    minimum: 100.0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a number with up to 2 decimal places.' },
  )
  @Min(100, { message: 'Price must be at least 100.' })
  @IsNotEmpty({ message: 'Price cannot be empty.' })
  price?: number;

  /*
  @ApiPropertyOptional({
    description: 'Updated list of image URLs or identifiers for the project',
    example: ['https://example.com/image1_new.jpg', 'image_id_2', 'image_id_3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Or use IsUrl({ each: true }) if they must be URLs
  images?: string[];

  @ApiPropertyOptional({
    description: 'Updated URL or identifier for the project video',
    example: 'https://example.com/new_video.mp4',
  })
  @IsOptional()
  @IsString() // Or use IsUrl() if it must be a URL
  video?: string; */

  // Additional properties for handling existing media during updates
  @IsOptional()
  @IsArray()
  existingImages?: string[];

  @IsOptional()
  existingVideo?: string | null;

  @ApiPropertyOptional({
    description: 'The updated status of the project.',
    enum: ProjectStatus,
    example: ProjectStatus.IN_PROGRESS,
    required: false, // Status is optional for updates
  })
  @IsOptional()
  @IsEnum(ProjectStatus, {
    message: `Status must be one of the following values: ${Object.values(ProjectStatus).join(', ')}`,
  })
  status?: ProjectStatus;

  @IsOptional()
  @Type(() => Date) // Transform incoming value to a Date object
  @IsDate({ message: 'Completion date must be a valid date.' })
  readonly completionDate?: Date;

  @ApiPropertyOptional({
    description: 'Updated UUID of the category this project belongs to',
    example: 'b2c3d4e5-f6a1-b2c3-d4e5-f6a1b2c3d4e5',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID.' })
  categoryId?: string;

  // id, createdAt, and updatedAt are typically managed by the database/ORM
  // and are not included in update DTOs unless specifically needed.
}
