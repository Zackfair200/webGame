import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/services/user.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    // Convertimos el email a minúsculas antes de guardarlo
    const normalizedEmail = email.toLowerCase();
    
    // Verificamos si el usuario ya existe
    const existingUser = await this.userService.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Encriptamos la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creamos el usuario con el email en minúsculas
    const user = await this.userService.createUser({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
    });
    return { message: 'User registered successfully', user };
  }

  async login(loginDto: { email: string; password: string }) {
    const { email, password } = loginDto;
  
    // Encuentra al usuario por email
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    // Verifica la contraseña sin hashear de nuevo
    const isMatch = this.userService.validatePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    // Genera y retorna el JWT
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
    };
  }
}
