import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Multer } from 'multer';
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * ✅ Upload image to Cloudinary
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'nominees',
            resource_type: 'image',
          },
          (error, result: UploadApiResponse | undefined) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              return reject(error);
            }

            if (!result?.secure_url) {
              return reject(new Error('Upload failed: no URL returned'));
            }

            resolve(result.secure_url);
          },
        )
        .end(file.buffer);
    });
  }

  /**
   * ✅ Extract public_id from Cloudinary URL
   * Example:
   * https://res.cloudinary.com/demo/image/upload/v123456/nominees/abc123.jpg
   * → nominees/abc123
   */
  extractPublicId(url: string): string | null {
    try {
      if (!url) return null;

      const parts = url.split('/upload/');
      if (parts.length < 2) return null;

      const path = parts[1]; // v123456/nominees/abc123.jpg

      const segments = path.split('/');
      
      // remove version (v123456)
      if (segments[0].startsWith('v')) {
        segments.shift();
      }

      const fileWithExt = segments.pop(); // abc123.jpg
      if (!fileWithExt) return null;

      const fileName = fileWithExt.split('.')[0]; // abc123

      return [...segments, fileName].join('/'); // nominees/abc123
    } catch (err) {
      console.error('extractPublicId error:', err);
      return null;
    }
  }

  /**
   * ✅ Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      if (!publicId) return;

      const res = await cloudinary.uploader.destroy(publicId);

      console.log('Cloudinary delete:', res);
    } catch (err) {
      console.error('Cloudinary delete error:', err);
    }
  }
}