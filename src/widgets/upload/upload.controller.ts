import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Response } from 'express';
import { UploadService } from './upload.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import * as sharp from 'sharp';

@ApiTags('Files')
@Controller('files')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(AccessTokenGuard)
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [String] })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Загрузка файлов на сервер (для отправки в чат, загрузки аватара)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('file', 10, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadFile(@UploadedFiles() files: Express.Multer.File[]) {
    const newFiles = await this.uploadService.filterFiles(files);

    return this.uploadService.uploadFile(newFiles);
  }

  @Get(':fileName')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [String] })
  @ApiOperation({
    summary: 'Получение файла по его name (который вернул метод /files/upload)',
  })
  async getFileFromName(
    @Res() res: Response,
    @Param('fileName') fileName: string,
    @Query('size') size?: number,
  ) {
    const { buffer, type } = await this.uploadService.getFileFromName(fileName);

    let imageBuffer = buffer;

    if (size) {
      imageBuffer = await sharp(buffer).resize({ width: +size }).toBuffer();
    }

    res.setHeader('Content-Type', type);

    res.send(imageBuffer);
  }
}
