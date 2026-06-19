import { PosePreset, ThemeConfig } from './types';

export const POSES: PosePreset[] = [
  {
    id: 'standing',
    name: 'Standing',
    angles: {
      head: [0, 0, 0],
      torso: [0, 0, 0],
      arm_l_upper: [0, 0, 0.2],
      arm_r_upper: [0, 0, -0.2],
      leg_l_upper: [0, 0, 0.05],
      leg_r_upper: [0, 0, -0.05],
    }
  },
  {
    id: 'running',
    name: 'Running',
    angles: {
      head: [0.2, 0, 0],
      torso: [0.3, 0.2, 0],
      arm_l_upper: [-0.8, 0, 0],
      arm_l_lower: [1.2, 0, 0],
      arm_r_upper: [0.8, 0, 0],
      arm_r_lower: [1.2, 0, 0],
      leg_l_upper: [0.8, 0, 0],
      leg_l_lower: [-1.2, 0, 0],
      leg_r_upper: [-0.6, 0, 0],
      leg_r_lower: [-0.4, 0, 0],
    }
  },
  {
    id: 'sitting',
    name: 'Sitting',
    angles: {
      head: [0, 0, 0],
      torso: [0.1, 0, 0],
      arm_l_upper: [0.2, 0, 0.3],
      arm_l_lower: [0.8, 0, 0],
      arm_r_upper: [0.2, 0, -0.3],
      arm_r_lower: [0.8, 0, 0],
      leg_l_upper: [-1.5, 0.2, 0],
      leg_l_lower: [1.5, 0, 0],
      leg_r_upper: [-1.5, -0.2, 0],
      leg_r_lower: [1.5, 0, 0],
    }
  },
  {
    id: 'hero',
    name: 'Hero',
    angles: {
      head: [-0.2, 0.5, 0],
      torso: [0, 0.3, 0],
      arm_l_upper: [0, 0, 1.2],
      arm_l_lower: [0.5, 0, 0],
      arm_r_upper: [0.3, 0, -0.5],
      arm_r_lower: [0, 0, 0],
      leg_l_upper: [0, 0, 0.4],
      leg_r_upper: [0.4, 0, -0.2],
    }
  },
  {
    id: 'yoga',
    name: 'Yoga',
    angles: {
      head: [0, 0, 0],
      torso: [0, 0, 0],
      arm_l_upper: [0, 0, 2.8],
      arm_r_upper: [0, 0, -2.8],
      leg_l_upper: [-0.5, 0.8, 0],
      leg_l_lower: [1.5, 0, 0],
      leg_r_upper: [0, 0, -0.1],
    }
  },
  {
    id: 'disco',
    name: 'Disco',
    angles: {
      head: [0, 0.5, 0],
      torso: [0, 0, -0.3],
      arm_l_upper: [0, 0, 2.5],
      arm_l_lower: [0, 0, 0],
      arm_r_upper: [1.2, 0, -0.5],
      arm_r_lower: [1.2, 0, 0],
      leg_l_upper: [0, 0, 0.5],
      leg_r_upper: [0, 0, -0.2],
    }
  }
];

export const THEMES: ThemeConfig[] = [
  {
    id: 'light-gray',
    name: 'Light Gray',
    bgColor: '#E5E7EB',
    groundColor: '#D1D5DB',
    gridColor: '#9CA3AF',
    bodyColor: '#6B7280',
    accentColor: '#ffffff',
  },
  {
    id: 'studio',
    name: 'Pro Studio',
    bgColor: '#3A4B5C',
    groundColor: '#2C3946',
    gridColor: '#4F657A',
    bodyColor: '#6B88A1',
    accentColor: '#ffffff',
  },
  {
    id: 'dark',
    name: 'Blueprint',
    bgColor: '#384D42',
    groundColor: '#2A3B32',
    gridColor: '#4D695B',
    bodyColor: '#668A78',
    accentColor: '#ffffff',
  },
  {
    id: 'neon',
    name: 'Amber Glow',
    bgColor: '#5C4A3D',
    groundColor: '#47392F',
    gridColor: '#7A6352',
    bodyColor: '#9C7F6A',
    accentColor: '#ffffff',
  },
  {
    id: 'monolith',
    name: 'Wireframe',
    bgColor: '#3D4045',
    groundColor: '#2E3034',
    gridColor: '#54585F',
    bodyColor: '#808691',
    accentColor: '#ffffff',
  },
  {
    id: 'red',
    name: 'Crimson Red',
    bgColor: '#5C3D3D',
    groundColor: '#472E2E',
    gridColor: '#7A5252',
    bodyColor: '#A36D6D', 
    accentColor: '#ffffff',
  },
  {
    id: 'brown',
    name: 'Harvest Brown',
    bgColor: '#544439',
    groundColor: '#40342C',
    gridColor: '#755E4F',
    bodyColor: '#947764', 
    accentColor: '#ffffff',
  }
];
