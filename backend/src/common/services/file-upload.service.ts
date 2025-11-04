import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';

@Injectable()
export class FileUploadService {
  constructor(private readonly configService: ConfigService) {}

  getMulterConfig(destination: string) {
    return {
      storage: diskStorage({
        destination: `./uploads/${destination}`,
        filename: (req, file, callback) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    };
  }

  getFileUrl(filename: string, folder: string): string {
    const baseUrl = this.configService.get<string>('app.url') || 'http://localhost:3000';
    return `${baseUrl}/uploads/${folder}/${filename}`;
  }
}
