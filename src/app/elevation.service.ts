// elevation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import GPXParser from 'gpxparser';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ElevationService {
  private elevations: number[] = [];
  private slopes: number[] = [];
  private elevationPath = new BehaviorSubject<string>('');

  constructor(private http: HttpClient) {}

  loadGPXFile(url: string): Observable<void> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((gpxData) => {
        this.parseGPX(gpxData);
      })
    );
  }

  private parseGPX(gpxData: string) {
    const gpx = new GPXParser();
    gpx.parse(gpxData);

    if (gpx.tracks && gpx.tracks.length > 0) {
      const track = gpx.tracks[0];
      if (track.points && track.points.length > 0) {
        this.elevations = track.points.map((point) => point.ele);
        this.calculateSlopes();
        this.generateElevationPath();
      }
    }
  }

  private calculateSlopes() {
    this.slopes = [];
    for (let i = 1; i < this.elevations.length; i++) {
      const elevationDiff = this.elevations[i] - this.elevations[i - 1];
      // Assuming uniform horizontal distance between points
      const slope = elevationDiff;
      this.slopes.push(slope);
    }
  }

  private generateElevationPath() {
    const width = 400;
    const height = 200;
    const topMargin = 20;

    const maxElevation = Math.max(...this.elevations);
    const minElevation = Math.min(...this.elevations);
    const elevationRange = maxElevation - minElevation;

    const points = this.elevations.map((ele, index) => {
      const x = (index / (this.elevations.length - 1)) * width;
      const y =
        height -
        topMargin -
        ((ele - minElevation) / elevationRange) * (height - topMargin);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const path = `M${points.join(' L')}`;
    this.elevationPath.next(path);
  }

  getSlopeAtHeight(height: number): number {
    if (this.slopes.length === 0) return 0;

    const index = Math.floor(
      (height / this.getMaxHeight()) * (this.slopes.length - 1)
    );
    return this.slopes[Math.min(index, this.slopes.length - 1)];
  }

  getMaxHeight(): number {
    return Math.max(...this.elevations);
  }

  getElevationPath(): Observable<string> {
    return this.elevationPath.asObservable();
  }
}
