-- CreateTable users
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable sessions
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `session_token` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_session_token_key`(`session_token`),
    INDEX `sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable rooms
CREATE TABLE IF NOT EXISTS `rooms` (
    `room_code` VARCHAR(6) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `host_user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'lobby',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `rooms_host_user_id_idx`(`host_user_id`),
    PRIMARY KEY (`room_code`),
    CONSTRAINT `rooms_host_user_id_fkey` FOREIGN KEY (`host_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable results
CREATE TABLE IF NOT EXISTS `results` (
    `room_code` VARCHAR(6) NOT NULL,
    `completed_at` BIGINT NOT NULL,
    `awards` JSON NOT NULL,
    `leaderboard` JSON NOT NULL,
    `total_players_auctioned` INTEGER NOT NULL DEFAULT 0,
    `total_money_spent` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`room_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

