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

export type AppTheme = 'peper' | 'colors' | 'black' | 'light' | 'red' | 'mocha';

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

export type ColorScope = 'theme' | 'common';

export interface ThemeColorSetting {
  characterColor: string;
  savedCustomCharacterColor: string;
  themeId: ThemeId;
  customBgColor: string | null;
  savedCustomBgColor: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  isDefault?: boolean;
  appTheme: AppTheme;
  characterColor: string;
  bgColor: string;
  themeId?: ThemeId;
}
