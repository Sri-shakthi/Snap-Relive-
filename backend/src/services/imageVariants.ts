import sharp from 'sharp';

export interface ImageVariantResult {
  thumbnail: Buffer;
  preview: Buffer;
}

export const buildImageVariants = async (inputBuffer: Buffer): Promise<ImageVariantResult> => {
  const thumbnail = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 420, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const preview = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1024, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return {
    thumbnail,
    preview
  };
};
