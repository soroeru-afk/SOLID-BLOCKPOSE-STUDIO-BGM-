import { Euler } from 'three';

export interface PoseAngles {
  head?: [number, number, number];
  torso?: [number, number, number];
  arm_l_upper?: [number, number, number];
  arm_l_lower?: [number, number, number];
  arm_r_upper?: [number, number, number];
  arm_r_lower?: [number, number, number];
  leg_l_upper?: [number, number, number];
  leg_l_lower?: [number, number, number];
  leg_r_upper?: [number, number, number];
  leg_r_lower?: [number, number, number];
}

export interface PosePreset {
  id: string;
  name: string;
  angles: PoseAngles;
}

export type ThemeId = 'studio' | 'dark' | 'neon' | 'monolith' | 'red' | 'brown' | 'light-gray';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  bgColor: string;
  groundColor: string;
  gridColor: string;
  bodyColor: string;
  accentColor: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}
