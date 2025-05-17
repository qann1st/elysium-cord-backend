export class MFileDto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;

  constructor(file: Express.Multer.File | MFileDto) {
    this.buffer = file.buffer;
    this.mimetype = file.mimetype;
    this.originalname = file.originalname;
    this.size = file.size;
  }
}
