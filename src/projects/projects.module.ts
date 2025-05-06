import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { DatabaseErrorService } from 'src/common/services/database-error.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Service } from 'src/common/services/aws-s3.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    S3Service,
    DatabaseErrorService,
    {
      provide: APP_GUARD, // para proteger las rutas de los productos
      useClass: JwtAuthGuard, // pero parece que no es necesario
    },
  ],
})
export class ProjectsModule {}
