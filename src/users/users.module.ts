import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    MailService,
    {
      provide: APP_GUARD, // para proteger las rutas de los productos
      useClass: JwtAuthGuard, // pero parece que no es necesario
    },
  ],
  // exports: [UsersService],
})
export class UsersModule {}
