import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { DatabaseErrorService } from 'src/common/services/database-error.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    DatabaseErrorService,
    {
      provide: APP_GUARD, // para proteger las rutas de los productos
      useClass: JwtAuthGuard, // pero parece que no es necesario
    },
  ],
})
export class CategoriesModule {}
