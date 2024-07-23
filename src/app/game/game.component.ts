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
import { catchError, of, Subscription, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import GPXParser from 'gpxparser';

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

  svgPath: string = '';
  viewBox: string = '';

  private gameStateSubscription: Subscription | undefined;
  private playerStatsSubscription: Subscription | undefined;
  constructor(private gameService: GameService, private http: HttpClient) {}

  ngOnInit() {
    this.loadGpxFile();

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

  loadGpxFile() {
    this.http
      .get('assets/gpx/rattlesnake.gpx', { responseType: 'text' })
      .pipe(
        tap((gpxContent: string) => {
          const gpx = new GPXParser();
          gpx.parse(gpxContent);

          if (gpx.tracks.length > 0 && gpx.tracks[0].points.length > 0) {
            const points = gpx.tracks[0].points;
            const { path, minX, minY, maxX, maxY } =
              this.convertToSvgPath(points);
            this.svgPath = path;
            this.viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
            console.log('SVG Path:', this.svgPath); // Log the path for debugging
          }
        }),
        catchError((error) => {
          console.error('Error loading GPX file:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  convertToSvgPath(points: any[]): {
    path: string;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    let path = '';
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Find the bounds of the data
    points.forEach((point) => {
      minX = Math.min(minX, point.lon);
      minY = Math.min(minY, point.lat);
      maxX = Math.max(maxX, point.lon);
      maxY = Math.max(maxY, point.lat);
    });

    // Calculate scale to fit in 1000x1000 viewport
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min(1000 / width, 1000 / height);

    // Create the path, scaling and inverting Y axis
    points.forEach((point, index) => {
      const x = (point.lon - minX) * scale;
      const y = 1000 - (point.lat - minY) * scale; // Invert Y axis
      if (index === 0) {
        path += `M${x},${y}`;
      } else {
        path += ` L${x},${y}`;
      }
    });

    return { path, minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
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
