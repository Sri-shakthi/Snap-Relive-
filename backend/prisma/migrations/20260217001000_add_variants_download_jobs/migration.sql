-- AlterTable
ALTER TABLE `Photo`
  ADD COLUMN `thumbnailS3Key` VARCHAR(191) NULL,
  ADD COLUMN `previewS3Key` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `DownloadJob` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `selectedPhotoIds` JSON NOT NULL,
  `status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  `s3Bucket` VARCHAR(191) NULL,
  `s3Key` VARCHAR(191) NULL,
  `errorMessage` VARCHAR(1024) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `DownloadJob_userId_eventId_createdAt_idx`(`userId`, `eventId`, `createdAt`),
  INDEX `DownloadJob_eventId_status_idx`(`eventId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DownloadJob` ADD CONSTRAINT `DownloadJob_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DownloadJob` ADD CONSTRAINT `DownloadJob_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
