import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(3001);
  console.log('Application is running on: ' + await app.getUrl());
  // console.log(app.getHttpServer()._events.request._router.stack);
}
bootstrap();
