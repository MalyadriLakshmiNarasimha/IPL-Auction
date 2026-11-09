import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ALL_PLAYERS, RAW_PLAYER_DATABASE, PLAYER_IMAGES, getPlayerById } from '../../src/shared/player-data';
import playerImagesMap from '../../src/shared/player-images.json';
import { PlayerImageEntry } from '../../src/shared/types';

describe('Player Photograph System — Comprehensive Integrity Suite', () => {
  const imagesDir = path.resolve(process.cwd(), 'public', 'images', 'players');
  const sharedJsonPath = path.resolve(process.cwd(), 'src', 'shared', 'player-images.json');
  const rootJsonPath = path.resolve(process.cwd(), 'player-images.json');
  const publicJsonPath = path.resolve(process.cwd(), 'public', 'images', 'player-images.json');

  it('1. Central mapping files exist and are synchronized across all target paths', () => {
    expect(fs.existsSync(sharedJsonPath)).toBe(true);
    expect(fs.existsSync(rootJsonPath)).toBe(true);
    expect(fs.existsSync(publicJsonPath)).toBe(true);

    const sharedData = JSON.parse(fs.readFileSync(sharedJsonPath, 'utf-8'));
    const rootData = JSON.parse(fs.readFileSync(rootJsonPath, 'utf-8'));
    const publicData = JSON.parse(fs.readFileSync(publicJsonPath, 'utf-8'));

    expect(Object.keys(sharedData).length).toBe(274);
    expect(Object.keys(rootData).length).toBe(274);
    expect(Object.keys(publicData).length).toBe(274);

    expect(sharedData).toEqual(rootData);
    expect(sharedData).toEqual(publicData);
  });

  it('2. Every player ID has exactly one entry matching p-XXX format with stable key', () => {
    const rawIds = RAW_PLAYER_DATABASE.map(p => p.id);
    expect(rawIds.length).toBe(274);

    for (let i = 1; i <= 274; i++) {
      const pid = `p-${String(i).padStart(3, '0')}`;
      expect(rawIds.includes(pid)).toBe(true);
      const entry = (playerImagesMap as Record<string, PlayerImageEntry>)[pid];
      expect(entry).toBeDefined();
      expect(entry.playerId).toBe(pid);
      expect(typeof entry.playerName).toBe('string');
      expect(entry.playerName.length).toBeGreaterThan(0);
      expect(['verified', 'missing', 'ambiguous']).toContain(entry.verificationStatus);
    }
  });

  it('3. Every mapped local verified image exists on disk and has non-zero size', () => {
    const mapping = playerImagesMap as Record<string, PlayerImageEntry>;
    let verifiedCount = 0;
    let missingCount = 0;

    for (const [pid, entry] of Object.entries(mapping)) {
      if (entry.verificationStatus === 'verified') {
        verifiedCount++;
        expect(entry.imagePath).toBeTruthy();
        expect(entry.imagePath).toMatch(/^\/images\/players\/player-\d{3}\.webp$/);
        
        const localPath = path.join(process.cwd(), 'public', entry.imagePath!);
        expect(fs.existsSync(localPath)).toBe(true);
        const stats = fs.statSync(localPath);
        expect(stats.size).toBeGreaterThan(1000); // Greater than 1KB
        expect(entry.imageWidth).toBe(600);
        expect(entry.imageHeight).toBe(750);
      } else {
        missingCount++;
        expect(entry.imagePath).toBeNull();
      }
    }

    expect(verifiedCount).toBe(261);
    expect(missingCount).toBe(13);
    expect(verifiedCount + missingCount).toBe(274);
  });

  it('4. Zero duplicate images assigned across different players', () => {
    const mapping = playerImagesMap as Record<string, PlayerImageEntry>;
    const seenPaths = new Set<string>();

    for (const entry of Object.values(mapping)) {
      if (entry.imagePath) {
        expect(seenPaths.has(entry.imagePath)).toBe(false);
        seenPaths.add(entry.imagePath);
      }
    }

    expect(seenPaths.size).toBe(261);
  });

  it('5. Old unverified /players/ directory is cleaned up and replaced with /images/players/', () => {
    const oldPlayersDir = path.resolve(process.cwd(), 'public', 'players');
    expect(fs.existsSync(oldPlayersDir)).toBe(false);
    expect(fs.existsSync(imagesDir)).toBe(true);
  });

  it('6. ALL_PLAYERS adaptDatabaseRecord hydrates verified images and procedural fallbacks correctly', () => {
    expect(ALL_PLAYERS.length).toBe(274);

    for (const player of ALL_PLAYERS) {
      const meta = (playerImagesMap as Record<string, PlayerImageEntry>)[player.id];
      expect(meta).toBeDefined();

      if (meta.verificationStatus === 'verified') {
        expect(player.has_photo).toBe(true);
        expect(player.image_url).toBe(meta.imagePath);
        expect(player.image_url.startsWith('/images/players/')).toBe(true);
        expect(player.photo_source).toContain(meta.sourceName);
      } else {
        expect(player.has_photo).toBe(false);
        expect(player.image_url.startsWith('data:image/svg+xml')).toBe(true);
        expect(player.photo_source).toContain('Procedural IPL Fallback');
      }
    }
  });

  it('7. Marquee players (Virat Kohli, Jasprit Bumrah, MS Dhoni) have authentic verified photos', () => {
    const virat = ALL_PLAYERS.find(p => p.name === 'Virat Kohli')!;
    expect(virat.has_photo).toBe(true);
    expect(virat.image_url).toMatch(/\/images\/players\/player-\d{3}\.webp/);

    const bumrah = ALL_PLAYERS.find(p => p.name === 'Jasprit Bumrah')!;
    expect(bumrah.has_photo).toBe(true);
    expect(bumrah.image_url).toMatch(/\/images\/players\/player-\d{3}\.webp/);

    const dhoni = ALL_PLAYERS.find(p => p.name === 'Mahendra Singh Dhoni')!;
    expect(dhoni.has_photo).toBe(true);
    expect(dhoni.image_url).toMatch(/\/images\/players\/player-\d{3}\.webp/);
  });

  it('8. Contact sheets exist for visual audit', () => {
    const verifiedSheet = path.resolve(process.cwd(), 'public', 'contact-sheet-verified.html');
    const missingSheet = path.resolve(process.cwd(), 'public', 'contact-sheet-missing.html');
    const ambiguousSheet = path.resolve(process.cwd(), 'public', 'contact-sheet-ambiguous.html');

    expect(fs.existsSync(verifiedSheet)).toBe(true);
    expect(fs.existsSync(missingSheet)).toBe(true);
    expect(fs.existsSync(ambiguousSheet)).toBe(true);

    const verifiedHtml = fs.readFileSync(verifiedSheet, 'utf-8');
    expect(verifiedHtml).toContain('Verified Player Photographs');
    expect(verifiedHtml).toContain('/images/players/player-');

    const missingHtml = fs.readFileSync(missingSheet, 'utf-8');
    expect(missingHtml).toContain('Missing Photographs (IPL Fallback Roster)');
  });
});

