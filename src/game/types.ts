export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type DifficultyMode = 'school' | 'city' | 'endless';

export type BikeType = 'normal' | 'ttareungi' | 'fixie' | 'pro' | 'custom';

export type BikeFrameStyle = 'diamond' | 'stepthrough' | 'track' | 'aero';

export interface CustomFrameDesign {
  frameStyle: BikeFrameStyle;
  /** Row-major (28 x 16) custom pixel hex colors or null for empty space */
  pixels: (string | null)[];
}

export type HazardType =
  | 'dooring'
  | 'blind_car'
  | 'smombie'
  | 'pothole'
  | 'roadwork'
  | 'scooter'
  | 'red_signal'
  | 'traffic_car'
  | 'pet'
  | 'kids'
  | 'wrong_way_bike'
  | 'puddle'
  | 'gravel';

export interface SafetyLesson {
  type: HazardType;
  title: string;
  shortTag: string;
  dangerReason: string;
  preventionTip: string;
  counterplayHint: string;
}

export interface CalloutEvent {
  id: number;
  text: string;
  points: number;
  tone: 'good' | 'warn' | 'danger';
}

export interface ForecastAlert {
  id: number;
  title: string;
  detail: string;
  dir: 'left' | 'right' | 'down' | 'up' | 'stop';
  distanceM: number;
  tone: 'amber' | 'rose' | 'sky';
}

export interface HudSnapshot {
  speedKmh: number;
  distanceM: number;
  targetDistanceM: number | null;
  score: number;
  combo: number;
  maxCombo: number;
  hearts: number;
  maxHearts: number;
  hasShield: boolean;
  doubleScoreTimer: number;
  bellCooldownRatio: number;
  brakeActive: boolean;
  zoneName: string;
  zoneIndex: number;
  activeCallout: CalloutEvent | null;
  activeWarning: string | null;
  activeForecast: ForecastAlert | null;
  nearMissCount: number;
  defensiveCount: number;
  hitCounts: Record<HazardType, number>;
  encounterCounts: Record<HazardType, number>;
}

export interface RunSummary {
  mode: DifficultyMode;
  cleared: boolean;
  score: number;
  bestScore: number;
  distanceM: number;
  maxCombo: number;
  nearMissCount: number;
  defensiveCount: number;
  totalHits: number;
  grade: 'S' | 'A' | 'B' | 'C';
  hitCounts: Record<HazardType, number>;
  encounterCounts: Record<HazardType, number>;
  lastFatalHazard: HazardType | null;
  arrestedByPolice?: boolean;
}

export interface MobileInputState {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
}
