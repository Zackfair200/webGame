import { User } from 'src/auth/entities/user.entity';
import { Repository } from 'typeorm';

export class UserRepository extends Repository<User> {

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.findOne({ where: { email } });
  }

  async createUser(user: Partial<User>): Promise<User> {
    const newUser = this.create(user);
    return this.save(newUser);
  }
}
