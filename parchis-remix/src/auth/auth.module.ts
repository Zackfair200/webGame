import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './controllers/auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    UserModule,
    JwtModule.register({
      secret: 'yourSecretKey', // Cambia esto a un secreto seguro
      signOptions: { expiresIn: '1h' }, // Configura la expiración del token
    }),],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
