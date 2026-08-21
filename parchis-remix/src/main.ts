import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsConfig } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsConfig);
  await app.listen(3001);
  console.log('Application is running on: ' + await app.getUrl());
  // console.log(app.getHttpServer()._events.request._router.stack);
}
bootstrap();
