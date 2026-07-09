import { Injectable } from '@nestjs/common';
import { getCloudinary, isCloudinaryInitialized } from '../../config/cloudinary';
import { AppError } from '../../common/exceptions/app-error';

export interface UploadOptions {
  folder?: string;
  transformation?: Array<Record<string, unknown>>;
  publicId?: string;
  overwrite?: boolean;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

@Injectable()
export class CloudinaryService {
  /**
   * Upload a file to Cloudinary
   */
  async uploadFile(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!isCloudinaryInitialized()) {
      throw new AppError('Cloudinary is not initialized', 500);
    }

    const cloudinary = getCloudinary();
    if (!cloudinary) {
      throw new AppError('Cloudinary is not available', 500);
    }

    try {
      const uploadOptions: Record<string, unknown> = {
        resource_type: options.resourceType || 'auto',
        overwrite: options.overwrite ?? false,
      };

      if (options.folder) {
        uploadOptions.folder = options.folder;
      }

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      throw new AppError(`Cloudinary upload failed: ${message}`, 500);
    }
  }

  /**
   * Upload a file from buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!isCloudinaryInitialized()) {
      throw new AppError('Cloudinary is not initialized', 500);
    }

    const cloudinary = getCloudinary();
    if (!cloudinary) {
      throw new AppError('Cloudinary is not available', 500);
    }

    try {
      return new Promise((resolve, reject) => {
        const uploadOptions: Record<string, unknown> = {
          resource_type: options.resourceType || 'auto',
          overwrite: options.overwrite ?? false,
        };

        if (options.folder) {
          uploadOptions.folder = options.folder;
        }

        if (options.publicId) {
          uploadOptions.public_id = options.publicId;
        }

        if (options.transformation) {
          uploadOptions.transformation = options.transformation;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500));
              return;
            }

            if (!result) {
              reject(new AppError('Cloudinary upload returned no result', 500));
              return;
            }

            resolve({
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          }
        );

        uploadStream.end(buffer);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      throw new AppError(`Cloudinary upload failed: ${message}`, 500);
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    if (!isCloudinaryInitialized()) {
      throw new AppError('Cloudinary is not initialized', 500);
    }

    const cloudinary = getCloudinary();
    if (!cloudinary) {
      throw new AppError('Cloudinary is not available', 500);
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete file';
      throw new AppError(`Cloudinary delete failed: ${message}`, 500);
    }
  }

  /**
   * Generate image URL with transformations
   */
  getImageUrl(
    publicId: string,
    transformations?: Array<Record<string, unknown>>
  ): string {
    if (!isCloudinaryInitialized()) {
      throw new AppError('Cloudinary is not initialized', 500);
    }

    const cloudinary = getCloudinary();
    if (!cloudinary) {
      throw new AppError('Cloudinary is not available', 500);
    }

    return cloudinary.url(publicId, {
      secure: true,
      transformation: transformations,
    });
  }
}
