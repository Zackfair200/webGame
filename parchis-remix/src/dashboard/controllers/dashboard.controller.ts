import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getDashboard() {
    return { message: 'Welcome to the dashboard!' };
  }
}
