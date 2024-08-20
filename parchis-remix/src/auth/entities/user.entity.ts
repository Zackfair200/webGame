import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { GenderEnum } from '../dto/gender.enum';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: GenderEnum,
    default: GenderEnum.OTHER,
  })
  gender: GenderEnum;

  @Column({ type: 'varchar', length: 255 })
  country: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    this.email = this.email.toLowerCase();
  }
}
