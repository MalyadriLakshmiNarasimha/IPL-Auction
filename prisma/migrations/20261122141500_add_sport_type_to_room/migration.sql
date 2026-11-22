-- AlterTable
ALTER TABLE `rooms` ADD COLUMN `sport_type` VARCHAR(16) NULL DEFAULT 'IPL';

-- CreateIndex
CREATE INDEX `rooms_sport_type_idx` ON `rooms`(`sport_type`);
