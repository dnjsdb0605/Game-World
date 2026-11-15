export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type DifficultyMode = 'school' | 'city' | 'endless';

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
}

export interface MobileInputState {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
}
