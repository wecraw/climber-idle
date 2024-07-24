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

import { parseGPX } from '@we-gold/gpxjs';

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
  constructor(private gameService: GameService, private http: HttpClient) {}

  ngOnInit() {
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

    this.parseGPXAndGenerateElevationProfile();
  }
  generateSVGPath(elevations: number[]) {
    // Filter out any non-numeric values
    const validElevations = elevations.filter(
      (ele) => !isNaN(ele) && isFinite(ele)
    );
    console.log('Valid elevations:', validElevations);

    if (validElevations.length === 0) {
      console.error('No valid elevation data found');
      this.elevationPath = '';
      return;
    }

    const maxElevation = Math.max(...validElevations);
    const minElevation = Math.min(...validElevations);
    const elevationRange = maxElevation - minElevation;

    const width = 400; // SVG width
    const height = 200; // SVG height
    const topMargin = 20;

    const points = validElevations.map((ele, index) => {
      const x = (index / (validElevations.length - 1)) * width;
      const y =
        height -
        topMargin -
        ((ele - minElevation) / elevationRange) * (height - topMargin);
      return { x, y, elevation: ele };
    });

    // Calculate slopes
    const slopes = [];
    for (let i = 1; i < points.length; i++) {
      const elevationDiff = points[i].elevation - points[i - 1].elevation;
      const horizontalDist = points[i].x - points[i - 1].x;
      const slope = elevationDiff / horizontalDist;
      slopes.push(slope);
    }

    console.log('Slopes:', slopes);

    // Additional statistics about slopes
    const maxSlope = Math.max(...slopes);

    this.elevationPath = `M${points
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' L')}`;
    console.log('Final SVG path:', this.elevationPath);
  }

  parseGPXAndGenerateElevationProfile() {
    fetch('/assets/gpx/r2.gpx')
      .then((response) => response.text())
      .then((gpxData) => {
        console.log('Raw GPX data:', gpxData);

        const gpx = new GPXParser(); // Create a new GPXParser instance
        gpx.parse(gpxData); // Parse the GPX data

        console.log('Parsed GPX data:', gpx);

        if (!gpx.tracks || gpx.tracks.length === 0) {
          console.error('No tracks found in GPX data');
          return;
        }

        const track = gpx.tracks[0];
        console.log('First track:', track);

        if (!track.points || track.points.length === 0) {
          console.error('No points found in the first track');
          return;
        }

        const elevations = track.points.map((point) => point.ele);
        console.log('Extracted elevations:', elevations);

        this.generateSVGPath(elevations);
      })
      .catch((error) => {
        console.error('Error loading or parsing GPX file:', error);
      });
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
