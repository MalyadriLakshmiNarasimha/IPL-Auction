-- AlterTable
ALTER TABLE `rooms`
  ADD COLUMN `termination_reason` VARCHAR(64) NULL,
  ADD COLUMN `terminated_at` DATETIME(3) NULL,
  ADD COLUMN `terminated_by_system` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `room_participants`
  ADD COLUMN `participation_status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `disqualification_reason` VARCHAR(64) NULL,
  ADD COLUMN `disqualified_at` DATETIME(3) NULL,
  ADD COLUMN `exited_at` DATETIME(3) NULL;
