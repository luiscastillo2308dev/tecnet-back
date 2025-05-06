import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
//import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';

import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
//new
import { JwtStrategy } from './jwt.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { MailService } from 'src/mail/mail.service';
import { RolesModule } from 'src/roles/roles.module';

@Module({
  imports: [
    //  UsersModule,
    // RolesModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: jwtConstants.accessExpiration },
      }),
    }),
    /* JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtConstants.refreshSecret,
        signOptions: { expiresIn: jwtConstants.refreshExpiration },
      }),
    }), */
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    PrismaService,
    MailService,
    {
      provide: 'refresh',
      useFactory: () => {
        return new JwtService({
          secret: jwtConstants.refreshSecret,
          signOptions: { expiresIn: jwtConstants.refreshExpiration },
        });
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
