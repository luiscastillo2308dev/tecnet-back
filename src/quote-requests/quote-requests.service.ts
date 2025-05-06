import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException, // Import BadRequestException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, QuoteRequest } from '@prisma/client'; // Import Prisma namespace
import { DatabaseErrorService } from 'src/common/services/database-error.service'; // Assuming this handles Prisma errors
import { S3Service } from 'src/common/services/aws-s3.service';
import { MailService } from 'src/mail/mail.service';
// Assuming these templates return HTML strings
import { quoteRequestEMailTemplate } from 'src/mail/templates/quote-request-email';
import { Express } from 'express'; // Explicit import for Express

@Injectable()
export class QuoteRequestsService {
  private readonly logger = new Logger(QuoteRequestsService.name);
  private readonly emailContact: string; // Store email user securely

  constructor(
    private readonly prismaService: PrismaService,
    private readonly dbErrorService: DatabaseErrorService, // Keep if it provides valuable abstraction
    private readonly s3Service: S3Service,
    private readonly mailService: MailService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) {
    // Retrieve sensitive info like email from config service
    this.emailContact = this.configService.get<string>('MAIL_CONTACT') ?? '';
    if (!this.emailContact) {
      this.logger.error('MAIL_CONTACT is not defined in environment variables');
      // Throwing here prevents the service from starting incorrectly configured
      throw new Error('MAIL_CONTACT environment variable is missing.');
    }
  }

  /**
   * Creates a new quote request, uploads the file to S3, saves data to DB, and sends an email notification.
   * @param createQuoteRequestDto - Data for the new quote request.
   * @param file - The requirements file to upload.
   * @returns The created QuoteRequest entity.
   * @throws InternalServerErrorException if S3 upload or email sending fails.
   * @throws Specific exceptions from DatabaseErrorService for DB errors.
   */
  async create(
    createQuoteRequestDto: CreateQuoteRequestDto,
    file: Express.Multer.File,
  ): Promise<QuoteRequest> {
    let requirementsFileKey: string | undefined = undefined;
    let presignedUrl: string | undefined = undefined;

    try {
      // 1. Handle File Upload (if provided)
      if (file) {
        // Sanitize filename to prevent issues with special characters in S3 keys or URLs
        const safeFileName = file.originalname
          .replace(/[^a-zA-Z0-9_.\-]/g, '_') // Allow letters, numbers, underscore, dot, hyphen
          .replace(/ /g, '_'); // Replace spaces with underscores
        requirementsFileKey = `quote_requests/files/${Date.now()}-${safeFileName}`; // Use plural 'quote_requests' for consistency

        this.logger.log(
          `Uploading file to S3 with key: ${requirementsFileKey}`,
        );
        await this.s3Service.uploadFileToS3(file, requirementsFileKey);
        this.logger.log(`File uploaded successfully.`);

        // Generate presigned URL for the email link (expires based on S3Service config)
        presignedUrl =
          await this.s3Service.getPresignedUrl(requirementsFileKey);
        this.logger.log(`Generated presigned URL for email.`);
      } else {
        // This case should ideally be prevented by the controller's ParseFilePipe(fileIsRequired: true)
        this.logger.warn(
          'Create request called without a file, though controller should require it.',
        );
        // Depending on business logic, you might throw BadRequestException here
        // throw new BadRequestException('Requirements file is mandatory for creation.');
        // Or proceed allowing creation without a file if that's valid, setting requirementsFile to null/empty.
      }

      // 2. Prepare Data for Database
      // Ensure requirementsFile is stored correctly (key or null/empty string)
      const quoteRequestData = {
        ...createQuoteRequestDto,
        requirementsFile: requirementsFileKey || '', // Ensure it is always a string
      };

      // 3. Save to Database
      this.logger.log(
        `Creating quote request record in database for subject: ${quoteRequestData.subject}`,
      );
      const newQuoteRequest = await this.prismaService.quoteRequest.create({
        data: quoteRequestData,
      });
      this.logger.log(
        `Quote request created successfully with ID: ${newQuoteRequest.id}`,
      );

      // 4. Send Email Notification (Consider doing this asynchronously)
      try {
        this.logger.log(`Sending notification email to: ${this.emailContact}`);
        await this.mailService.sendEmail(
          this.emailContact,
          `New Quote Request: ${quoteRequestData.subject}`,
          quoteRequestEMailTemplate({
            // Use the template function
            subject: quoteRequestData.subject,
            name: quoteRequestData.name,
            email: quoteRequestData.email,
            message: quoteRequestData.message,
            requirementsFile: presignedUrl, // Pass the generated URL
          }),
        );
        this.logger.log(`Notification email sent successfully.`);
      } catch (emailError) {
        // Log email failure but don't fail the entire request if email is non-critical
        this.logger.error(
          `Failed to send quote request notification email for ID ${newQuoteRequest.id}:`,
          emailError.stack,
        );
        // Depending on requirements, you might want to rethrow or handle differently
      }

      return newQuoteRequest;
    } catch (error) {
      this.logger.error(
        `Failed to create quote request: ${error.message}`,
        error.stack,
      );

      // Attempt to clean up S3 file if DB save or email failed after upload
      if (
        requirementsFileKey &&
        !(error instanceof Prisma.PrismaClientKnownRequestError)
      ) {
        // Avoid deletion if it's a DB constraint error where the record might exist
        this.logger.warn(
          `Attempting to clean up S3 file due to error: ${requirementsFileKey}`,
        );
        await this.s3Service
          .deleteFileByKey(requirementsFileKey)
          .catch((s3DeleteError) => {
            this.logger.error(
              `Failed to clean up S3 file ${requirementsFileKey}:`,
              s3DeleteError.stack,
            );
          });
      }

      // Handle Prisma specific errors via the dedicated service
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.dbErrorService.handleDatabaseError(error, 'create quote request'); // Let dbErrorService handle specific Prisma errors
      }

      // Throw a generic server error for other unexpected issues (like S3 upload failure)
      throw new InternalServerErrorException(
        `An unexpected error occurred while creating the quote request.`,
      );
    }
  }

  /**
   * Retrieves all quote requests from the database.
   * @returns An array of QuoteRequest entities.
   * @throws InternalServerErrorException if database fetch fails.
   */
  async findAll(): Promise<QuoteRequest[]> {
    try {
      this.logger.log('Fetching all quote requests from database.');
      const quoteRequests = await this.prismaService.quoteRequest.findMany();
      this.logger.log(`Found ${quoteRequests.length} quote requests.`);
      return quoteRequests;
    } catch (error) {
      this.logger.error('Failed to fetch all quote requests:', error.stack);
      // Use dbErrorService or throw a standard NestJS exception
      this.dbErrorService.handleDatabaseError(
        error,
        'fetch all quote requests',
      );
      throw new InternalServerErrorException(
        'Failed to retrieve quote requests.',
      );
    }
  }

  /**
   * Retrieves a single quote request by its ID.
   * @param id - The UUID of the quote request.
   * @returns The found QuoteRequest entity.
   * @throws NotFoundException if the quote request with the given ID does not exist.
   * @throws InternalServerErrorException for other database errors.
   */
  async findOne(id: string): Promise<QuoteRequest> {
    this.logger.log(`Fetching quote request with ID: ${id}`);
    let quoteRequest: QuoteRequest | null;
    try {
      quoteRequest = await this.prismaService.quoteRequest.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Database error fetching quote request ${id}:`,
        error.stack,
      );
      this.dbErrorService.handleDatabaseError(
        error,
        `fetch quote request ${id}`,
      );
      throw new InternalServerErrorException(
        `An error occurred while fetching quote request ${id}.`,
      );
    }

    if (!quoteRequest) {
      this.logger.warn(`Quote request with ID ${id} not found.`);
      throw new NotFoundException(`Quote request with ID ${id} not found`);
    }

    this.logger.log(`Found quote request with ID: ${id}`);
    return quoteRequest;
  }

  /**
   * Updates an existing quote request. Handles optional file replacement in S3.
   * @param id - The UUID of the quote request to update.
   * @param updateQuoteRequestDto - DTO containing the fields to update.
   * @param file - Optional new requirements file to replace the existing one.
   * @returns The updated QuoteRequest entity.
   * @throws NotFoundException if the quote request doesn't exist.
   * @throws InternalServerErrorException for S3 or DB errors during update.
   */
  async update(
    id: string,
    updateQuoteRequestDto: UpdateQuoteRequestDto,
    file?: Express.Multer.File, // File is optional
  ): Promise<QuoteRequest> {
    this.logger.log(`Attempting to update quote request with ID: ${id}`);

    // 1. Verify the quote request exists
    const existingQuoteRequest = await this.findOne(id); // Leverages existing findOne logic including NotFoundException

    let newRequirementsFileKey: string | undefined | null =
      existingQuoteRequest.requirementsFile; // Default to existing key or null
    const oldRequirementsFileKey = existingQuoteRequest.requirementsFile; // Store old key for potential deletion

    try {
      // 2. Handle File Replacement (if a new file is provided)
      if (file) {
        this.logger.log(
          `New file provided: ${file.originalname}. Uploading to S3.`,
        );
        // Sanitize and generate new key
        const safeFileName = file.originalname
          .replace(/[^a-zA-Z0-9_.\-]/g, '_')
          .replace(/ /g, '_');
        newRequirementsFileKey = `quote_requests/files/${Date.now()}-${safeFileName}`;

        // Upload the new file
        await this.s3Service.uploadFileToS3(file, newRequirementsFileKey);
        this.logger.log(
          `New file uploaded successfully with key: ${newRequirementsFileKey}`,
        );

        // If upload is successful and an old file existed, delete the old one
        if (oldRequirementsFileKey) {
          this.logger.log(
            `Deleting old file from S3: ${oldRequirementsFileKey}`,
          );
          // Use await but catch errors specifically for deletion
          await this.s3Service
            .deleteFileByKey(oldRequirementsFileKey)
            .catch((s3DeleteError) => {
              // Log failure to delete old file, but don't necessarily fail the update
              this.logger.error(
                `Failed to delete old S3 file ${oldRequirementsFileKey} during update for quote request ${id}:`,
                s3DeleteError.stack,
              );
            });
        }
      } else {
        this.logger.log(
          `No new file provided. Keeping existing file reference: ${newRequirementsFileKey}`,
        );
      }

      // 3. Prepare Update Data for Database
      // Use Partial<Prisma.QuoteRequestUpdateInput> for better type safety
      const updateData: Prisma.QuoteRequestUpdateInput = {
        ...updateQuoteRequestDto,
        requirementsFile: newRequirementsFileKey, // Update file key (could be new key, old key, or null)
      };

      // 4. Update Database Record
      this.logger.log(
        `Updating quote request record in database for ID: ${id}`,
      );
      const updatedQuoteRequest = await this.prismaService.quoteRequest.update({
        where: { id },
        data: updateData,
      });
      this.logger.log(`Quote request ${id} updated successfully.`);

      return updatedQuoteRequest;
    } catch (error) {
      this.logger.error(`Failed to update quote request ${id}:`, error.stack);

      // Attempt to clean up newly uploaded S3 file if DB update failed
      if (
        file &&
        newRequirementsFileKey &&
        error instanceof Prisma.PrismaClientKnownRequestError
      ) {
        this.logger.warn(
          `Attempting to clean up newly uploaded S3 file due to DB update error: ${newRequirementsFileKey}`,
        );
        await this.s3Service
          .deleteFileByKey(newRequirementsFileKey)
          .catch((s3DeleteError) => {
            this.logger.error(
              `Failed to clean up newly uploaded S3 file ${newRequirementsFileKey}:`,
              s3DeleteError.stack,
            );
          });
      }

      // Handle Prisma specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.dbErrorService.handleDatabaseError(
          error,
          `update quote request ${id}`,
        );
      } else if (error instanceof NotFoundException) {
        // Re-throw NotFoundException if findOne failed (shouldn't happen if findOne is called first, but good practice)
        throw error;
      }

      // Throw generic error for other issues (like S3 upload failure before DB step)
      throw new InternalServerErrorException(
        `An unexpected error occurred while updating quote request ${id}.`,
      );
    }
  }

  /**
   * Deletes a quote request and its associated file from S3.
   * @param id - The UUID of the quote request to delete.
   * @returns Promise<void> - Resolves when deletion is complete.
   * @throws NotFoundException if the quote request doesn't exist.
   * @throws InternalServerErrorException for S3 or DB errors during deletion.
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Attempting to remove quote request with ID: ${id}`);

    // 1. Verify the quote request exists and get its data
    const quoteRequestToDelete = await this.findOne(id); // Ensures it exists, throws NotFoundException otherwise
    const fileKeyToDelete = quoteRequestToDelete.requirementsFile;

    try {
      // 2. Delete from Database first (or S3 first, depending on atomicity preference)
      // Deleting DB first means if S3 fails, we might have an orphan file.
      // Deleting S3 first means if DB fails, the record remains but points to a deleted file.
      // Let's delete DB first as it's often the primary source of truth.
      this.logger.log(
        `Deleting quote request record from database for ID: ${id}`,
      );
      await this.prismaService.quoteRequest.delete({
        where: { id },
      });
      this.logger.log(
        `Quote request record ${id} deleted successfully from database.`,
      );

      // 3. Delete File from S3 (if it exists)
      if (fileKeyToDelete) {
        this.logger.log(`Attempting to delete S3 file: ${fileKeyToDelete}`);
        try {
          await this.s3Service.deleteFileByKey(fileKeyToDelete);
          this.logger.log(`S3 file ${fileKeyToDelete} deleted successfully.`);
        } catch (s3Error) {
          // Log the S3 deletion error but consider the overall operation successful
          // as the primary record (DB) is deleted. Adjust if S3 deletion failure is critical.
          this.logger.error(
            `Failed to delete S3 file ${fileKeyToDelete} for already deleted quote request ${id}:`,
            s3Error.stack,
          );
          // Potentially add to a cleanup queue or monitoring system
        }
      } else {
        this.logger.log(`No associated S3 file found for quote request ${id}.`);
      }

      // No explicit return needed for void
    } catch (error) {
      this.logger.error(`Failed to remove quote request ${id}:`, error.stack);

      // Handle Prisma specific errors (though delete might throw P2025 handled by findOne)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.dbErrorService.handleDatabaseError(
          error,
          `delete quote request ${id}`,
        );
      } else if (error instanceof NotFoundException) {
        // Re-throw NotFoundException from findOne
        throw error;
      }

      // Throw generic error for other unexpected issues
      throw new InternalServerErrorException(
        `An unexpected error occurred while removing quote request ${id}.`,
      );
    }
  }
}
