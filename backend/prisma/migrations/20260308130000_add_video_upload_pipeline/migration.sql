-- CreateTable
CREATE TABLE `VideoUpload` (
  `id` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `s3Bucket` VARCHAR(191) NOT NULL,
  `s3Key` VARCHAR(191) NOT NULL,
  `originalFileName` VARCHAR(191) NOT NULL,
  `contentType` VARCHAR(191) NOT NULL,
  `sizeBytes` BIGINT NOT NULL,
  `durationSeconds` INTEGER NOT NULL,
  `status` ENUM('INITIATED','UPLOADED','PROCESSING','PROCESSED','FAILED') NOT NULL DEFAULT 'INITIATED',
  `rekognitionJobId` VARCHAR(191) NULL,
  `thumbnailS3Key` VARCHAR(191) NULL,
  `errorMessage` VARCHAR(1024) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `VideoUpload_eventId_s3Key_key`(`eventId`, `s3Key`),
  INDEX `VideoUpload_eventId_status_idx`(`eventId`, `status`),
  INDEX `VideoUpload_eventId_createdAt_idx`(`eventId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VideoFaceMatch` (
  `id` VARCHAR(191) NOT NULL,
  `videoUploadId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `timestampMs` INTEGER NOT NULL,
  `similarity` DOUBLE NOT NULL,
  `boundingBox` JSON NULL,
  `thumbnailS3Key` VARCHAR(191) NULL,
  `clipS3Key` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `VideoFaceMatch_eventId_userId_createdAt_idx`(`eventId`, `userId`, `createdAt`),
  INDEX `VideoFaceMatch_videoUploadId_similarity_idx`(`videoUploadId`, `similarity`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VideoUpload` ADD CONSTRAINT `VideoUpload_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VideoFaceMatch` ADD CONSTRAINT `VideoFaceMatch_videoUploadId_fkey` FOREIGN KEY (`videoUploadId`) REFERENCES `VideoUpload`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VideoFaceMatch` ADD CONSTRAINT `VideoFaceMatch_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VideoFaceMatch` ADD CONSTRAINT `VideoFaceMatch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
