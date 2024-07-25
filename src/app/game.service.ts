import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { levels } from './game/content/levels';
import {
  LevelProperties,
  PlayerStats,
  GameState,
  Item,
} from './game/interfaces/interfaces';
import { defaultPlayerStats } from './game/content/defaults';
import { ElevationService } from './elevation.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private gameState = new BehaviorSubject<GameState>({
    isOnMission: false,
    height: 0,
    currentStamina: 1000,
    level: levels[0],
    maxHeight: 50,
    currentSlope: 0, // Add this line
  });

  private playerStats = new BehaviorSubject<PlayerStats>(defaultPlayerStats);

  private gameLoop: Subscription | null = null;
  private readonly TICK_INTERVAL = 100; // milliseconds

  constructor(private elevationService: ElevationService) {}

  private calculatePlayerWeight(): number {
    const items = this.playerStats.value.inventoryItems;
    const backpack = this.playerStats.value.backpack;

    const itemsWeight = items.reduce((total, item) => total + item.weight, 0);
    const backpackWeight = backpack ? backpack.weight : 0;

    return itemsWeight + backpackWeight;
  }

  getGameState() {
    return this.gameState.asObservable();
  }

  getPlayerStats() {
    return this.playerStats.asObservable();
  }

  startMission(level: LevelProperties) {
    if (this.gameLoop) {
      this.gameLoop.unsubscribe();
    }

    this.updateGameState({
      isOnMission: true,
      height: 0,
      maxHeight: this.elevationService.getMaxHeight(),
      level: level,
      currentSlope: 0,
    });

    this.gameLoop = interval(this.TICK_INTERVAL).subscribe(() => {
      this.gameTick();
    });
  }

  stopMission() {
    if (this.gameLoop) {
      this.gameLoop.unsubscribe();
      this.gameLoop = null;
    }
    const currentGameState = this.gameState.value;
    const currentPlayerStats = this.playerStats.value;
    const currentLevel = currentGameState.level;
    const missionCompleted =
      currentGameState.height >= currentGameState.maxHeight;

    let newMaxStamina = currentPlayerStats.maxStamina;
    let newMoney = currentPlayerStats.money;
    let newMaxLevel = currentPlayerStats.maxLevel;

    if (missionCompleted) {
      newMaxStamina += currentLevel.rewardStamina;
      newMoney += currentLevel.rewardMoney;
      newMaxLevel = Math.max(newMaxLevel, currentLevel.requiredLevel + 1);
    } else {
      newMaxStamina += Math.floor(currentLevel.rewardStamina / 2);
    }

    this.updateGameState({
      isOnMission: false,
      height: 0,
      currentStamina: newMaxStamina,
      maxHeight: 0,
    });

    this.updatePlayerStats({
      maxStamina: newMaxStamina,
      money: newMoney,
      maxLevel: newMaxLevel,
    });
  }

  // purchaseStamina() {
  //   const currentPlayerStats = this.playerStats.value;
  //   const currentGameState = this.gameState.value;
  //   const staminaCost = 5;
  //   if (currentPlayerStats.money >= staminaCost) {
  //     this.updatePlayerStats({
  //       money: currentPlayerStats.money - staminaCost,
  //       maxStamina: currentPlayerStats.maxStamina + 1,
  //     });
  //     this.updateGameState({
  //       currentStamina: currentGameState.currentStamina + 1,
  //     });
  //   }
  // }

  calculateStaminaPerTick(): number {
    const playerWeight = this.calculatePlayerWeight();
    const weightMultiplier = 1 + playerWeight / 100;
    const baseStaminaConsumption = 0.2 * weightMultiplier;

    const currentSlope = this.gameState.value.currentSlope;
    let slopeMultiplier = 1;

    if (currentSlope > 0) {
      // Uphill: increase stamina consumption
      slopeMultiplier = 1 + currentSlope * 2; // Adjust this multiplier as needed
    } else if (currentSlope < 0) {
      // Downhill: decrease stamina consumption
      slopeMultiplier = Math.max(0.5, 1 + currentSlope); // Ensure it doesn't go below 0.5
    }

    return baseStaminaConsumption * slopeMultiplier;
  }

  private gameTick() {
    const currentGameState = this.gameState.value;
    const currentPlayerStats = this.playerStats.value;

    const newHeight = currentGameState.height + 0.5;
    const newSlope = this.elevationService.getSlopeAtHeight(newHeight);

    this.updateGameState({
      currentSlope: newSlope,
    });

    const staminaPerTick = this.calculateStaminaPerTick();

    // Update game state
    const newStamina = Math.max(
      0,
      Math.min(
        currentPlayerStats.maxStamina,
        currentGameState.currentStamina - staminaPerTick
      )
    );

    this.updateGameState({
      currentStamina: newStamina,
      height: newHeight,
    });

    // Check for mission end conditions
    if (newStamina <= 0 || newHeight >= currentGameState.maxHeight) {
      this.stopMission();
    }
  }

  private updateGameState(newState: Partial<GameState>) {
    this.gameState.next({
      ...this.gameState.value,
      ...newState,
    });
  }

  private updatePlayerStats(newStats: Partial<PlayerStats>) {
    this.playerStats.next({
      ...this.playerStats.value,
      ...newStats,
    });
  }
}
