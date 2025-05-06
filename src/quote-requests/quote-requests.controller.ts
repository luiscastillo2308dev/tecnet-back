import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes, // Import ApiConsumes for file uploads
} from '@nestjs/swagger'; // Import Swagger decorators
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuoteRequest } from '@prisma/client'; // Assuming this can be used for response types
import { Express } from 'express';
import { Public } from 'src/decorators/public.decorator';

// Define file validation constants
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
// Define allowed MIME types directly
const ALLOWED_MIME_TYPES = [
  'application/pdf', // PDF
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
];

// Define a helper type or DTO for Swagger response documentation if Prisma types aren't directly compatible
// For example:
// class QuoteRequestResponseDto implements QuoteRequest { ... }
// Then use QuoteRequestResponseDto in @ApiResponse

@ApiTags('Quote Requests') // Group endpoints under 'Quote Requests' tag in Swagger UI
@Controller('quote-requests')
export class QuoteRequestsController {
  private readonly logger = new Logger(QuoteRequestsController.name);

  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  /**
   * Handles the creation of a new quote request, including file upload.
   * @param createQuoteRequestDto - DTO containing the quote request data.
   * @param file - The uploaded requirements file.
   * @returns The newly created QuoteRequest entity.
   */
  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('requirements_file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new quote request' })
  @ApiConsumes('multipart/form-data') // Specify content type for file upload
  @ApiBody({
    description:
      'Quote request data and the requirements file (PDF, DOC, DOCX).',
    // Schema combining DTO and file field for Swagger UI
    schema: {
      type: 'object',
      properties: {
        // Include properties from your CreateQuoteRequestDto here explicitly if needed
        // e.g., subject: { type: 'string' }, description: { type: 'string' }, ...
        // Or rely on NestJS Swagger plugin to infer from the DTO type below
        requirements_file: {
          type: 'string',
          format: 'binary', // Indicate this is a file upload
          description: `Requirements document (Max ${MAX_FILE_SIZE_MB}MB, Allowed types: PDF, DOC, DOCX)`,
        },
      },
      required: ['requirements_file'], // Add other required DTO fields here
    },
    // Link the DTO for validation and potential schema generation by plugins
    type: CreateQuoteRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The quote request has been successfully created.',
    type: CreateQuoteRequestDto, // Replace with a DTO or class representing the response structure
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or file validation failed.',
  })
  @ApiResponse({
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE, // More specific error for file type issues
    description: 'Invalid file type provided.',
  })
  async create(
    @Body() createQuoteRequestDto: CreateQuoteRequestDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
          // Use the MIME types for validation instead of the regex
          new FileTypeValidator({
            fileType: new RegExp(`(${ALLOWED_MIME_TYPES.join('|')})`),
          }),
        ],
        fileIsRequired: true,
        // Optional: Add errorHttpStatusCode for file validation failures
        errorHttpStatusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      }),
    )
    file: Express.Multer.File,
  ): Promise<QuoteRequest> {
    this.logger.log(
      `Received request to create quote request: ${createQuoteRequestDto.subject}`,
    );

    if (!file) {
      throw new BadRequestException('Exactly 1 file is required.');
    }

    return this.quoteRequestsService.create(createQuoteRequestDto, file);
  }

  /**
   * Retrieves all quote requests.
   * @returns An array of QuoteRequest entities.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all quote requests' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved all quote requests.',
    type: [CreateQuoteRequestDto], // Replace with a DTO or class representing the response structure
  })
  async findAll(): Promise<QuoteRequest[]> {
    this.logger.log('Received request to find all quote requests');
    return this.quoteRequestsService.findAll();
  }

  /**
   * Retrieves a specific quote request by its ID.
   * @param id - The UUID of the quote request to retrieve.
   * @returns The found QuoteRequest entity.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a specific quote request by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'UUID of the quote request to retrieve',
    type: String, // Specify type for Swagger
    format: 'uuid', // Specify format for Swagger
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved the quote request.',
    type: CreateQuoteRequestDto, // Replace with a DTO or class representing the response structure
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quote request with the specified ID not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format.',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<QuoteRequest> {
    this.logger.log(`Received request to find quote request with ID: ${id}`);
    return this.quoteRequestsService.findOne(id);
  }

  /**
   * Updates an existing quote request by its ID. Can optionally include a new file.
   * @param id - The UUID of the quote request to update.
   * @param updateQuoteRequestDto - DTO containing the fields to update.
   * @param file - The optional new requirements file.
   * @returns The updated QuoteRequest entity.
   */
  @Patch(':id')
  @UseInterceptors(FileInterceptor('requirements_file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing quote request by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'UUID of the quote request to update',
    type: String,
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data') // Also needed for optional file upload
  @ApiBody({
    description:
      'Optional quote request data fields to update and an optional new requirements file (PDF, DOC, DOCX).',
    // Schema combining DTO and optional file field
    schema: {
      type: 'object',
      properties: {
        // Include properties from your UpdateQuoteRequestDto here explicitly if needed
        // e.g., subject: { type: 'string' }, description: { type: 'string' }, ...
        requirements_file: {
          type: 'string',
          format: 'binary',
          description: `Optional new requirements document (Max ${MAX_FILE_SIZE_MB}MB, Allowed types: PDF, DOC, DOCX)`,
        },
      },
      // No required fields listed here unless your DTO has mandatory update fields
    },
    type: UpdateQuoteRequestDto, // Link the DTO
    required: false, // Body itself might be optional depending on logic, but usually PATCH requires some body
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully updated the quote request.',
    type: UpdateQuoteRequestDto, // Adjust if using a specific Response DTO
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quote request with the specified ID not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid input data, file validation failed, or invalid UUID format.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuoteRequestDto: UpdateQuoteRequestDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
          // Use the MIME types for validation instead of the regex
          new FileTypeValidator({
            fileType: new RegExp(`(${ALLOWED_MIME_TYPES.join('|')})`),
          }),
        ],
        fileIsRequired: false,
        // Optional: Add errorHttpStatusCode for file validation failures
        errorHttpStatusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      }),
    )
    file?: Express.Multer.File, // Optional file
  ): Promise<QuoteRequest> {
    this.logger.log(`Received request to update quote request with ID: ${id}`);
    if (file) {
      this.logger.log(`Update includes new file: ${file.originalname}`);
    } else {
      this.logger.log(`Update does not include a new file.`);
    }
    return this.quoteRequestsService.update(id, updateQuoteRequestDto, file);
  }

  /**
   * Deletes a quote request by its ID.
   * @param id - The UUID of the quote request to delete.
   * @returns void - No content returned on successful deletion.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quote request by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'UUID of the quote request to delete',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted the quote request.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quote request with the specified ID not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Received request to delete quote request with ID: ${id}`);
    await this.quoteRequestsService.remove(id);
  }
}
