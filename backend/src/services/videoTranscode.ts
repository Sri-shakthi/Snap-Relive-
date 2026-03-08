import { execFile } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { downloadObjectToFile, putObjectFile } from './awsS3.js';

const execFileAsync = promisify(execFile);

export const normalizeVideoForRekognition = async (input: {
  bucket: string;
  sourceS3Key: string;
  eventId: string;
  videoUploadId: string;
}) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'snapshots-transcode-'));
  const inputPath = join(tempDir, 'input-video');
  const outputPath = join(tempDir, 'normalized.mp4');

  try {
    await downloadObjectToFile({
      bucket: input.bucket,
      s3Key: input.sourceS3Key,
      filePath: inputPath
    });

    await execFileAsync(config.video.ffmpegPath, [
      '-y',
      '-i',
      inputPath,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputPath
    ]);

    const normalizedS3Key = `uploads/videos/normalized/events/${input.eventId}/${input.videoUploadId}-${uuidv4()}.mp4`;
    const uploaded = await putObjectFile({
      bucket: input.bucket,
      s3Key: normalizedS3Key,
      filePath: outputPath,
      contentType: 'video/mp4'
    });
    const outputStats = await stat(outputPath);

    return {
      bucket: uploaded.bucket,
      s3Key: uploaded.s3Key,
      contentType: 'video/mp4',
      sizeBytes: BigInt(outputStats.size)
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};
