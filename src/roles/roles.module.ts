import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    PrismaService,
    {
      provide: APP_GUARD, // para proteger las rutas de los productos
      useClass: JwtAuthGuard, // pero parece que no es necesario
    },
  ],
})
export class RolesModule {}
