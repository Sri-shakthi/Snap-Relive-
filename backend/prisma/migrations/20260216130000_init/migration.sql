-- CreateTable
CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `User_email_key`(`email`),
  UNIQUE INDEX `User_phone_key`(`phone`),
  INDEX `User_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `endsAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Event_startsAt_idx`(`startsAt`),
  INDEX `Event_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSelfie` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `s3Bucket` VARCHAR(191) NOT NULL,
  `s3Key` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `rekognitionFaceId` VARCHAR(191) NULL,
  `errorMessage` VARCHAR(1024) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `UserSelfie_userId_eventId_key`(`userId`, `eventId`),
  INDEX `UserSelfie_eventId_status_idx`(`eventId`, `status`),
  INDEX `UserSelfie_userId_createdAt_idx`(`userId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Photo` (
  `id` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `s3Bucket` VARCHAR(191) NOT NULL,
  `s3Key` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `errorMessage` VARCHAR(1024) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Photo_eventId_s3Key_key`(`eventId`, `s3Key`),
  INDEX `Photo_eventId_status_idx`(`eventId`, `status`),
  INDEX `Photo_eventId_createdAt_idx`(`eventId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhotoFace` (
  `id` VARCHAR(191) NOT NULL,
  `photoId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `rekognitionFaceId` VARCHAR(191) NULL,
  `boundingBox` JSON NULL,
  `confidence` DOUBLE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PhotoFace_photoId_rekognitionFaceId_key`(`photoId`, `rekognitionFaceId`),
  INDEX `PhotoFace_eventId_rekognitionFaceId_idx`(`eventId`, `rekognitionFaceId`),
  INDEX `PhotoFace_photoId_createdAt_idx`(`photoId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchResult` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `photoId` VARCHAR(191) NOT NULL,
  `similarity` DOUBLE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `MatchResult_userId_eventId_photoId_key`(`userId`, `eventId`, `photoId`),
  INDEX `MatchResult_userId_eventId_createdAt_idx`(`userId`, `eventId`, `createdAt`),
  INDEX `MatchResult_eventId_similarity_idx`(`eventId`, `similarity`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserSelfie` ADD CONSTRAINT `UserSelfie_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserSelfie` ADD CONSTRAINT `UserSelfie_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PhotoFace` ADD CONSTRAINT `PhotoFace_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `Photo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PhotoFace` ADD CONSTRAINT `PhotoFace_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `Photo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
