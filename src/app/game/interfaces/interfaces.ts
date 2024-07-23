export interface GameState {
  isOnMission: boolean;
  height: number;
  currentStamina: number;
  level: LevelProperties;
  maxHeight: number;
}

export interface PlayerStats {
  maxStamina: number;
  money: number;
  maxLevel: number;
  inventoryItems: Item[];
  equippedItems: Item[];
  shoes: Shoes;
  backpack: Backpack;
}

export interface LevelProperties {
  name: string;
  maxHeight: number;
  rewardMoney: number;
  rewardStamina: number;
  requiredLevel: number;
  requiredItemIds?: string[];
}

export interface Item {
  name: string;
  id: string;
  description: string;
  price: number;
  weight: number;
  volume: number;
}

export interface Backpack extends Item {
  capacity: number;
}

export interface Shoes extends Item {
  speedMultiplier: number;
}
