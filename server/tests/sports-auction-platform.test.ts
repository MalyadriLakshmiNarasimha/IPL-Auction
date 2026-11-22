import { describe, it, expect } from 'vitest';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import { ALL_PKL_PLAYERS, getPklPlayerById, PKL_FRANCHISES } from '../../src/shared/pkl-player-data';
import { OFFICIAL_IPL_FRANCHISES, DEFAULT_ROOM_SETTINGS, DEFAULT_PKL_ROOM_SETTINGS, getFranchisesForSport, getSettingsForSport } from '../../src/shared/constants';
import { RoomManager } from '../room';

const mockIo: any = {
  to: () => ({ emit: () => {} }),
  emit: () => {},
};

describe('Unified Sports Auction Platform: IPL + PKL Architecture', () => {
  it('loads authoritative 274 IPL players and 10 official franchises', () => {
    expect(ALL_PLAYERS.length).toBe(274);
    expect(OFFICIAL_IPL_FRANCHISES.length).toBe(10);
    const kohli = ALL_PLAYERS.find(p => p.name.includes('Kohli'));
    expect(kohli).toBeDefined();
    expect(kohli?.name).toContain('Kohli');
  });

  it('loads authoritative 235 PKL players and 12 official franchises', () => {
    expect(ALL_PKL_PLAYERS.length).toBe(235);
    expect(PKL_FRANCHISES.length).toBe(12);

    const pawan = getPklPlayerById('pkl-001');
    expect(pawan).toBeDefined();
    expect(pawan?.name).toBe('Pawan Sehrawat');
    expect(pawan?.role).toBe('All-Rounder');
    expect(pawan?.base_price).toBe(3000000); // ₹30L

    const shadloui = getPklPlayerById('pkl-004');
    expect(shadloui).toBeDefined();
    expect(shadloui?.name).toBe('Mohammadreza Shadloui');

    const fazel = getPklPlayerById('pkl-003');
    expect(fazel).toBeDefined();
    expect(fazel?.name).toBe('Fazel Atrachali');
    expect(fazel?.role).toBe('Defender');
  });

  it('provides distinct sport-specific room configurations and rules', () => {
    const iplSettings = getSettingsForSport('IPL');
    expect(iplSettings.sport_type).toBe('IPL');
    expect(iplSettings.purse).toBe(100_00_00_000); // ₹100 Cr

    const pklSettings = getSettingsForSport('PKL');
    expect(pklSettings.sport_type).toBe('PKL');
    expect(pklSettings.purse).toBe(5_00_00_000); // ₹5 Cr
    expect(pklSettings.squad_size).toBe(14); // Kabaddi starting 7 + bench
  });

  it('resolves correct franchises per sport without collision', () => {
    const iplFranchises = getFranchisesForSport('IPL');
    const pklFranchises = getFranchisesForSport('PKL');

    expect(iplFranchises.length).toBe(10);
    expect(pklFranchises.length).toBe(12);

    expect(iplFranchises.some(f => f.short_code === 'CSK')).toBe(true);
    expect(iplFranchises.some(f => f.short_code === 'MI')).toBe(true);
    expect(pklFranchises.some(f => f.short_code === 'PAT')).toBe(true);
    expect(pklFranchises.some(f => f.short_code === 'PUN')).toBe(true);
  });

  it('RoomManager creates sport-associated rooms with authentic player pools', () => {
    const rm = new RoomManager(mockIo);

    // Create IPL Room
    const iplRoom = rm.createRoom('IPLR01', 'IPL Championship', 'host_1', 'Host One', 'IPL');
    expect(iplRoom.settings.sport_type).toBe('IPL');
    expect(iplRoom.settings.purse).toBe(100_00_00_000);
    expect(iplRoom.settings.selected_player_ids.length).toBe(274);

    // Create PKL Room
    const pklRoom = rm.createRoom('PKLR01', 'PKL Pro Arena', 'host_2', 'Host Two', 'PKL');
    expect(pklRoom.settings.sport_type).toBe('PKL');
    expect(pklRoom.settings.purse).toBe(5_00_00_000);
    expect(pklRoom.settings.selected_player_ids.length).toBe(235);
  });
});
