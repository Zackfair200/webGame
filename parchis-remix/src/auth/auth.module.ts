import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfig } from '../config/jwt.config';

@Module({
  imports: [
    UsersModule,
    JwtModule.register(jwtConfig),],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
