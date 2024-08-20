import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
  
    return await this.userRepository.save(user);
  }
  
  async findUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { email } });
    return user;
  }
  
  validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    const isMatch = bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  }
}
