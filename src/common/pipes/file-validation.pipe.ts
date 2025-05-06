import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { Express } from 'express';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(
    private readonly options: {
      maxImageSize?: number;
      maxVideoSize?: number;
      allowedImageTypes?: string[];
      allowedVideoTypes?: string[];
    } = {},
  ) {
    this.options = {
      maxImageSize: 8 * 1024 * 1024,
      maxVideoSize: 100 * 1024 * 1024,
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      ...options,
    };
  }

  transform(files: {
    images?: Express.Multer.File[];
    video?: Express.Multer.File[];
  }) {
    if (!files) return { images: [], video: undefined };

    // Validate images
    if (files.images) {
      files.images.forEach((image) => {
        if (!this.options.allowedImageTypes?.includes(image.mimetype)) {
          throw new BadRequestException(
            `Invalid image type: ${image.mimetype}`,
          );
        }
        if (image.size > (this.options.maxImageSize ?? 8 * 1024 * 1024)) {
          throw new BadRequestException(
            `Image ${image.originalname} exceeds size limit`,
          );
        }
      });
    }

    // Validate video
    if (files.video?.[0]) {
      const video = files.video[0];
      if (!this.options.allowedVideoTypes?.includes(video.mimetype)) {
        throw new BadRequestException(`Invalid video type: ${video.mimetype}`);
      }
      if (video.size > (this.options.maxVideoSize ?? 100 * 1024 * 1024)) {
        throw new BadRequestException(
          `Video ${video.originalname} exceeds size limit`,
        );
      }
    }

    return files;
  }
}
