import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { GameService } from '../game.service';
import { levels } from './content/levels';
import { items } from './content/items';
import {
  LevelProperties,
  PlayerStats,
  GameState,
  Item,
} from './interfaces/interfaces';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('mountainSvg', { static: true }) mountainSvg!: ElementRef;

  gameState: GameState = {} as GameState;
  playerStats: PlayerStats = {} as PlayerStats;

  currentScene: string = 'MISSION';

  showStore: boolean = false;
  showBackpack: boolean = false;
  showMission: boolean = true;
  levels: LevelProperties[] = levels;
  staminaPerTick: number = 0;
  pathLength: number = 0;
  items: Item[] = items;

  private gameStateSubscription: Subscription | undefined;
  private playerStatsSubscription: Subscription | undefined;

  constructor(private gameService: GameService) {}

  ngOnInit() {
    const mountainPath = document.querySelector(
      '.mountain-path'
    ) as SVGPathElement;

    if (mountainPath) {
      this.pathLength = mountainPath.getTotalLength();
      console.log(this.pathLength);
    }

    this.gameStateSubscription = this.gameService
      .getGameState()
      .subscribe((state) => {
        this.gameState = state;
        this.staminaPerTick = this.gameService.calculateStaminaPerTick();
      });
    this.playerStatsSubscription = this.gameService
      .getPlayerStats()
      .subscribe((stats) => {
        this.playerStats = stats;
        this.staminaPerTick = this.gameService.calculateStaminaPerTick();
      });
    this.gameStateSubscription = this.gameService
      .getGameState()
      .subscribe((state) => {
        this.gameState = state;
        this.updateProgress();
      });
  }

  updateProgress() {
    if (!this.gameState.isOnMission) return;

    const progressPercentage = this.gameState.height / this.gameState.maxHeight;
    const pathLength = this.pathLength; // Total length of the path
    const progressPath = document.querySelector(
      '.progress-path'
    ) as SVGPathElement;
    const climberDot = document.querySelector(
      '.climber-dot'
    ) as SVGCircleElement;

    if (progressPath && climberDot) {
      const dashOffset = pathLength - pathLength * progressPercentage;
      progressPath.style.strokeDashoffset = `${dashOffset}`;

      const point = progressPath.getPointAtLength(
        pathLength * progressPercentage
      );
      climberDot.setAttribute('cx', point.x.toString());
      climberDot.setAttribute('cy', point.y.toString());
    }
  }

  ngOnDestroy() {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
    if (this.playerStatsSubscription) {
      this.playerStatsSubscription.unsubscribe();
    }
  }

  startMission(level: LevelProperties) {
    this.gameService.startMission(level);
  }

  purchaseStamina() {
    this.gameService.purchaseStamina();
  }

  purchaseItem(item: Item) {
    // this.gameService.purchaseStamina();
    console.log('purchaseItem', item);
  }

  isLevelDisabled(level: LevelProperties): boolean {
    return (
      this.gameState.isOnMission ||
      level.requiredLevel > this.playerStats.maxLevel
    );
  }

  setScene(scene: string) {
    this.currentScene = scene;
  }
}
