import { Module } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequestsController } from './quote-requests.controller';
import { DatabaseErrorService } from 'src/common/services/database-error.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Service } from 'src/common/services/aws-s3.service';
import { MailService } from 'src/mail/mail.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [QuoteRequestsController],
  providers: [
    QuoteRequestsService,
    S3Service,
    MailService,
    DatabaseErrorService,
    {
      provide: APP_GUARD, // para proteger las rutas de los productos
      useClass: JwtAuthGuard, // pero parece que no es necesario
    },
  ],
})
export class QuoteRequestsModule {}
