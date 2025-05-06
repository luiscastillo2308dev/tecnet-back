import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseErrorService } from './common/services/database-error.service';
import { ProjectsModule } from './projects/projects.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { MailModule } from './mail/mail.module';
import { QuoteRequestsModule } from './quote-requests/quote-requests.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RolesModule,
    CategoriesModule,
    ProjectsModule,
    AuthModule,
    UsersModule,
    MailModule,
    QuoteRequestsModule,
  ],
  controllers: [],
  providers: [DatabaseErrorService],
  exports: [DatabaseErrorService],
})
export class AppModule {}
