import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  IsNumber,
  IsDate,
  IsEnum,
  IsUrl, // Use IsUrl if images/video are expected to be URLs
} from 'class-validator';

export enum ProjectStatus {
  INIT = 'INIT',
  IN_PROGRESS = 'IN_PROGRESS',
  TO_COMPLETED = 'TO_COMPLETED',
  COMPLETED = 'COMPLETED',
}

export class CreateProjectDto {
  @ApiProperty({
    description: 'Name of the project (must be unique)',
    example: 'Awesome Portfolio Website',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name cannot be empty.' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the project',
    example: 'A website showcasing my work using NestJS and React.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'List of technologies used in the project',
    example: ['NestJS', 'React', 'TypeScript', 'Prisma', 'PostgreSQL'],
    type: [String],
    required: true,
  })
  @IsArray()
  @IsString({ each: true }) // Validates each element in the array is a string
  @IsNotEmpty({ message: 'Technologies list cannot be empty.' })
  technologies: string[];

  @ApiProperty({
    description: 'Number of weeks spent working on the project',
    example: 6,
    required: true,
    minimum: 1,
  })
  @IsInt({ message: 'Weeks worked must be an integer.' })
  @Min(1, { message: 'Weeks worked must be at least 1.' })
  @IsNotEmpty({ message: 'Weeks worked cannot be empty.' })
  weeksWorked: number;

  @ApiProperty({
    description: 'Price of the project',
    example: 500.0,
    required: true,
    minimum: 100.0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a number with up to 2 decimal places.' },
  )
  @Min(100, { message: 'Price must be at least 100.' })
  @IsNotEmpty({ message: 'Price cannot be empty.' })
  price: number;

  /*
  @ApiProperty({
    description: 'List of image URLs or identifiers for the project',
    example: ['https://example.com/image1.jpg', 'image_id_2'],
    type: [String],
    required: true,
  })
  @IsArray()
  // @IsString({ each: true }) // Or use IsUrl({ each: true }) if they must be URLs
  @IsNotEmpty({ message: 'Images list cannot be empty.' })
  images: any[];

  @ApiProperty({
    description: 'URL or identifier for the project video',
    example: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    required: true,
  })
  // @IsString() // Or use IsUrl() if it must be a URL
  @IsNotEmpty({ message: 'Video cannot be empty.' })
  video: any; */

  /*
  @IsOptional() // completionDate is optional
  @Type(() => Date) // Transform incoming value to a Date object
  @IsDate({ message: 'Completion date must be a valid date.' })
  readonly completionDate?: Date; */

  @ApiProperty({
    description: 'The status of the project.',
    enum: ProjectStatus,
    example: ProjectStatus.INIT,
    required: true, // Status is optional for updates
  })
  @IsEnum(ProjectStatus, {
    message: `Status must be one of the following values: ${Object.values(ProjectStatus).join(', ')}`,
  })
  status: ProjectStatus;

  @ApiProperty({
    description: 'UUID of the category this project belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: true,
  })
  @IsUUID('4', { message: 'Category ID must be a valid UUID.' })
  @IsNotEmpty({ message: 'Category ID cannot be empty.' })
  categoryId: string;

  /*
   * Note: 'status' is not included here because it has a default value ('PENDING')
   * defined in the Prisma schema. It will be set automatically upon creation.
   * 'id', 'createdAt', and 'updatedAt' are also managed by the database/Prisma.
   */
}
