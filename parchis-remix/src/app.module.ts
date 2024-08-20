import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { UserModule } from './user/user.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'parchis_remix',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UserModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
