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
import { ElevationService } from '../elevation.service';

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

  elevationPath: string = '';

  private gameStateSubscription: Subscription | undefined;
  private playerStatsSubscription: Subscription | undefined;
  constructor(
    private gameService: GameService,
    private elevationService: ElevationService
  ) {}

  ngOnInit() {
    this.loadElevationData();

    this.gameStateSubscription = this.gameService
      .getGameState()
      .subscribe((state) => {
        this.gameState = state;
        this.staminaPerTick = this.gameService.calculateStaminaPerTick();
        this.updateProgress();
      });
    this.playerStatsSubscription = this.gameService
      .getPlayerStats()
      .subscribe((stats) => {
        this.playerStats = stats;
        this.staminaPerTick = this.gameService.calculateStaminaPerTick();
      });
  }

  loadElevationData() {
    this.elevationService.loadGPXFile('/assets/gpx/r2.gpx').subscribe(
      () => {
        this.elevationService
          .getElevationPath()
          .subscribe((path) => (this.elevationPath = path));
      },
      (error) => console.error('Error loading GPX file:', error)
    );
  }

  updateProgress() {
    if (!this.gameState.isOnMission || !this.elevationPath) return;

    const progressPercentage = this.gameState.height / this.gameState.maxHeight;
    const svgPath = document.querySelector('path') as SVGPathElement;
    const climberDot = document.querySelector(
      '.climber-dot'
    ) as SVGCircleElement;

    if (svgPath && climberDot) {
      const pathLength = svgPath.getTotalLength();
      const point = svgPath.getPointAtLength(pathLength * progressPercentage);
      climberDot.setAttribute('cx', point.x.toString());
      climberDot.setAttribute('cy', (point.y + 20).toString()); // Add 20 to account for the translation
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
    this.updateProgress();
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
