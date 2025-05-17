import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Elysium API')
    .setDescription('API Elysium импортозаменителя Discord')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description:
          'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
        name: 'Authorization',
      },
      'Authorization',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
