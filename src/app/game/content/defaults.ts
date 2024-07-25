import { PlayerStats } from '../interfaces/interfaces';
import { backpacks, defaultBackpack, defaultShoes } from './items';

export const defaultPlayerStats: PlayerStats = {
  maxStamina: 1000,
  money: 0,
  maxLevel: 0,
  inventoryItems: [],
  equippedItems: [],
  shoes: defaultShoes,
  backpack: defaultBackpack,
};
