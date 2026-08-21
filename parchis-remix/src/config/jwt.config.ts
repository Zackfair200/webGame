import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleOptions = {
  secret: 'yourSecretKey', // Cambia esto a un secreto seguro
  signOptions: { expiresIn: '1h' }, // Configura la expiración del token
};
