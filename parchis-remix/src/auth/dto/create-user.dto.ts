import { IsString, IsEmail, IsEnum, IsDateString } from 'class-validator';
import { GenderEnum } from './gender.enum';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  surname: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @IsString()
  country: string;

  @IsDateString()
  dateOfBirth: string;
}
