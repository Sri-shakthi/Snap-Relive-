-- AlterTable
ALTER TABLE `Event`
  ADD COLUMN `eventType` ENUM('MARRIAGE','BIRTHDAY','CORPORATE','OTHER') NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE `EventGuest` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NOT NULL,
  `side` ENUM('BRIDE','GROOM') NULL,
  `relation` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EventGuest_userId_eventId_key`(`userId`, `eventId`),
  INDEX `EventGuest_eventId_phone_idx`(`eventId`, `phone`),
  INDEX `EventGuest_eventId_createdAt_idx`(`eventId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventGuest` ADD CONSTRAINT `EventGuest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EventGuest` ADD CONSTRAINT `EventGuest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
