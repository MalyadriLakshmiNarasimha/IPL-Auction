-- CreateTable room_snapshots
CREATE TABLE IF NOT EXISTS `room_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `room_code` VARCHAR(6) NOT NULL,
    `schema_version` INTEGER NOT NULL DEFAULT 1,
    `stage` VARCHAR(32) NOT NULL,
    `phase` VARCHAR(32) NOT NULL,
    `state_data` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_snapshots_room_code_idx`(`room_code`),
    INDEX `room_snapshots_room_code_created_at_idx`(`room_code`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable bid_events
CREATE TABLE IF NOT EXISTS `bid_events` (
    `id` VARCHAR(191) NOT NULL,
    `room_code` VARCHAR(6) NOT NULL,
    `player_id` VARCHAR(64) NOT NULL,
    `bid_sequence` INTEGER NOT NULL,
    `participant_id` VARCHAR(191) NOT NULL,
    `amount` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bid_events_room_code_idx`(`room_code`),
    UNIQUE INDEX `bid_events_room_code_player_id_bid_sequence_key`(`room_code`, `player_id`, `bid_sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_snapshots` ADD CONSTRAINT `room_snapshots_room_code_fkey` FOREIGN KEY (`room_code`) REFERENCES `rooms`(`room_code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bid_events` ADD CONSTRAINT `bid_events_room_code_fkey` FOREIGN KEY (`room_code`) REFERENCES `rooms`(`room_code`) ON DELETE CASCADE ON UPDATE CASCADE;
