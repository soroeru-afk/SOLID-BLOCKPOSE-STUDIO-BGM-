import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Center, PerspectiveCamera, ContactShadows, Environment } from '@react-three/drei';
import { BlockPerson } from './components/BlockPerson';
import { POSES as INITIAL_POSES, THEMES } from './constants';
import { ThemeId, PosePreset, PoseAngles, AppTheme, ColorScope, ThemeColorSetting, ColorPreset } from './types';
import { 
  User, Palette, Library, Settings2, ZoomIn, RefreshCw, Layers, 
  Play, Pause, Plus, Minus, Save, Trash2, Edit3, SlidersHorizontal,
  Download, Upload, Volume2, VolumeX, Music, Music2,
  Camera, Video, Square, GripVertical, ChevronsUp, ChevronsDown,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  LayoutGrid, Circle, Triangle, Target, Tornado, List, FolderPlus,
  SkipBack, SkipForward, Zap, Maximize, Minimize, Check, Monitor, Sparkles, ArrowLeftRight
} from 'lucide-react';
import { SoundManager, SoundEffectType } from './lib/sound';
import { AudioDB, StoredTrack } from './lib/audioDb';

const STORAGE_KEY = 'voxelpose_pro_settings';

export const THEME_ACCENTS: Record<AppTheme, { name: string; color: string }> = {
  peper: { name: 'PEPER ORANGE', color: '#D95430' },
  mocha: { name: 'MOCHA', color: '#C48A58' },
  colors: { name: 'DARK GRAY', color: '#26262B' },
  black: { name: 'PITCH BLACK', color: '#050505' },
  red: { name: 'DARK RED', color: '#7A2020' },
  light: { name: 'STUDIO GRAY', color: '#52525B' },
};

export const DEFAULT_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'default-peper',
    name: 'PEPER',
    isDefault: true,
    appTheme: 'peper',
    characterColor: '#D95430',
    bgColor: '#F2EFE6',
    themeId: 'light-gray',
  },
  {
    id: 'default-mocha',
    name: 'MOCHA',
    isDefault: true,
    appTheme: 'mocha',
    characterColor: '#45372C',
    bgColor: '#D8CEBD',
    themeId: 'brown',
  },
  {
    id: 'default-colors',
    name: 'DARK',
    isDefault: true,
    appTheme: 'colors',
    characterColor: '#26262B',
    bgColor: '#D8D8DC',
    themeId: 'light-gray',
  },
  {
    id: 'default-black',
    name: 'BLACK',
    isDefault: true,
    appTheme: 'black',
    characterColor: '#050505',
    bgColor: '#2E2E33',
    themeId: 'monolith',
  },
  {
    id: 'default-red',
    name: 'RED',
    isDefault: true,
    appTheme: 'red',
    characterColor: '#7A2020',
    bgColor: '#2B2B30',
    themeId: 'red',
  },
  {
    id: 'default-light',
    name: 'LIGHT',
    isDefault: true,
    appTheme: 'light',
    characterColor: '#52525B',
    bgColor: '#F4F4F6',
    themeId: 'studio',
  },
];

export const DEFAULT_THEME_COLORS: Record<AppTheme, ThemeColorSetting> = {
  peper: {
    characterColor: '#D95430',
    savedCustomCharacterColor: '#D95430',
    themeId: 'light-gray',
    customBgColor: '#F2EFE6',
    savedCustomBgColor: '#F2EFE6',
  },
  mocha: {
    characterColor: '#45372C',
    savedCustomCharacterColor: '#45372C',
    themeId: 'brown',
    customBgColor: '#D8CEBD',
    savedCustomBgColor: '#D8CEBD',
  },
  colors: {
    characterColor: '#26262B',
    savedCustomCharacterColor: '#26262B',
    themeId: 'light-gray',
    customBgColor: '#D8D8DC',
    savedCustomBgColor: '#D8D8DC',
  },
  black: {
    characterColor: '#050505',
    savedCustomCharacterColor: '#050505',
    themeId: 'monolith',
    customBgColor: '#2E2E33',
    savedCustomBgColor: '#2E2E33',
  },
  red: {
    characterColor: '#7A2020',
    savedCustomCharacterColor: '#7A2020',
    themeId: 'red',
    customBgColor: '#2B2B30',
    savedCustomBgColor: '#2B2B30',
  },
  light: {
    characterColor: '#52525B',
    savedCustomCharacterColor: '#52525B',
    themeId: 'studio',
    customBgColor: '#F4F4F6',
    savedCustomBgColor: '#F4F4F6',
  },
};

export const PresetColorBadge = ({ 
  chrColor, 
  bgColor, 
  size = 'sm' 
}: { 
  chrColor: string; 
  bgColor: string; 
  size?: 'sm' | 'md' | 'lg' 
}) => {
  const dims = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div 
      className={`relative ${dims} border border-[#555] rounded-none overflow-hidden flex-shrink-0 shadow-sm`} 
      style={{ backgroundColor: bgColor }} 
      title={`Character: ${chrColor} | Background: ${bgColor}`}
    >
      <div 
        className="absolute inset-y-0 left-0 w-1/2 border-r border-black/30" 
        style={{ backgroundColor: chrColor }} 
      />
    </div>
  );
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('PCFSoftShadowMap has been deprecated')) return;
  originalWarn(...args);
};

const CinematicCamera = ({ isAutoCamera, isSlowRotate, autoCameraSpeed, autoCameraMinHeight, autoCameraMaxHeight, autoCameraMinDistance, autoCameraMaxDistance, autoCameraReverse, rotateSpeed, isEditing, orbitRef }: { isAutoCamera: boolean, isSlowRotate: boolean, autoCameraSpeed: number, autoCameraMinHeight: number, autoCameraMaxHeight: number, autoCameraMinDistance: number, autoCameraMaxDistance: number, autoCameraReverse: boolean, rotateSpeed: number, isEditing: boolean, orbitRef: any }) => {
  useFrame((state) => {
    // Re-center target and FOV incrementally if autoCamera is off
    if (!isAutoCamera && orbitRef.current) {
      if (Math.abs(orbitRef.current.target.x) > 0.01 || Math.abs(orbitRef.current.target.z) > 0.01) {
        orbitRef.current.target.x = THREE.MathUtils.lerp(orbitRef.current.target.x, 0, 0.05);
        orbitRef.current.target.z = THREE.MathUtils.lerp(orbitRef.current.target.z, 0, 0.05);
        orbitRef.current.update();
      }
    }
    if (!isAutoCamera && state.camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(state.camera.fov - 45) > 0.1) {
        state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 45, 0.05);
        state.camera.updateProjectionMatrix();
      }
    }

    // Return early if neither is active, or if currently editing
    if ((!isAutoCamera && !isSlowRotate) || isEditing) {
      if (orbitRef.current && orbitRef.current.autoRotate) {
        orbitRef.current.autoRotate = false;
      }
      return;
    }
    
    const time = state.clock.getElapsedTime() * autoCameraSpeed * 0.5;
          
    if (isAutoCamera) {
      // Auto Rotation
      if (orbitRef.current) {
        orbitRef.current.autoRotate = true;
        orbitRef.current.autoRotateSpeed = autoCameraSpeed * 2.5 * (autoCameraReverse ? -1 : 1);
        
        // Smooth Target Breathing
        const targetX = Math.sin(time * 0.5) * 0.8;
        const targetZ = Math.cos(time * 0.3) * 0.8;
        orbitRef.current.target.x = THREE.MathUtils.lerp(orbitRef.current.target.x, targetX, 0.03);
        orbitRef.current.target.z = THREE.MathUtils.lerp(orbitRef.current.target.z, targetZ, 0.03);
        
        orbitRef.current.update();
      }

      // Vertical oscillation & dynamic zoom - Smooth Transition
      const camera = state.camera;
      
      // Calculate interpolation factor (0 to 1) based on a sine wave
      const cycle = (Math.sin(time * 0.5) + 1) / 2;
      
      // Target Height logic: Oscillate between Min and Max
      const targetY = THREE.MathUtils.lerp(autoCameraMinHeight, autoCameraMaxHeight, cycle);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.02);
      
      // Target Distance logic:
      if (orbitRef.current && orbitRef.current.target) {
        const offset = camera.position.clone().sub(orbitRef.current.target);
        
        // Oscillate between Min and Max Distance
        // We use Math.cos to give it an elliptical breathing pattern relative to height
        const distCycle = (Math.cos(time * 0.4) + 1) / 2;
        const targetDistance = THREE.MathUtils.lerp(autoCameraMinDistance, autoCameraMaxDistance, distCycle);
        
        const currentDistance = offset.length();
        const newDistance = THREE.MathUtils.lerp(currentDistance, targetDistance, 0.02);
        
        offset.setLength(newDistance);
        camera.position.copy(orbitRef.current.target).add(offset);
      }
      
      // Subtle focal depth variation
      if (camera instanceof THREE.PerspectiveCamera) {
        const targetFov = 45 + Math.cos(time * 0.4) * 3;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.02);
        camera.updateProjectionMatrix();
      }
    } else if (isSlowRotate) {
      // Slow Rotation only
      if (orbitRef.current) {
        orbitRef.current.autoRotate = true;
        orbitRef.current.autoRotateSpeed = rotateSpeed; // configurable rotation
        orbitRef.current.update();
      }
    }
  });
  return null;
};

export default function App() {
  const [appTheme, setAppTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_appTheme`);
    if (saved === 'peper' || saved === 'paper') return 'peper';
    if (saved === 'mocha') return 'mocha';
    if (saved === 'colors' || saved === 'black' || saved === 'light' || saved === 'red') return saved as AppTheme;
    return 'peper';
  });

  const [colorScope, setColorScope] = useState<ColorScope>(() => {
    return (localStorage.getItem(`${STORAGE_KEY}_colorScope`) as ColorScope) || 'theme';
  });

  const [themeColors, setThemeColors] = useState<Record<AppTheme, ThemeColorSetting>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_themeColors`);
    if (saved) {
      try {
        return { ...DEFAULT_THEME_COLORS, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    const initial = { ...DEFAULT_THEME_COLORS };
    const existingChar = localStorage.getItem(`${STORAGE_KEY}_characterColor`);
    const existingSavedCustomChar = localStorage.getItem(`${STORAGE_KEY}_savedCustomCharacterColor`);
    const existingThemeId = localStorage.getItem(`${STORAGE_KEY}_themeId`) as ThemeId;
    const existingBg = localStorage.getItem(`${STORAGE_KEY}_customBgColor`);
    const existingSavedBg = localStorage.getItem(`${STORAGE_KEY}_savedCustomBgColor`);
    const currentAppTheme = (localStorage.getItem(`${STORAGE_KEY}_appTheme`) as AppTheme) || 'peper';
    if (existingChar) {
      initial[currentAppTheme] = {
        characterColor: existingChar,
        savedCustomCharacterColor: existingSavedCustomChar || existingChar,
        themeId: existingThemeId || initial[currentAppTheme].themeId,
        customBgColor: existingBg || null,
        savedCustomBgColor: existingSavedBg || initial[currentAppTheme].savedCustomBgColor,
      };
    }
    return initial;
  });

  const [commonColors, setCommonColors] = useState<ThemeColorSetting>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_commonColors`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      characterColor: '#0F172A',
      savedCustomCharacterColor: '#ffffff',
      themeId: 'light-gray',
      customBgColor: null,
      savedCustomBgColor: '#121214',
    };
  });

  const [isCopiedToAll, setIsCopiedToAll] = useState(false);

  const APP_THEMES = useMemo<{ id: AppTheme; label: string; dotColor: string }[]>(() => [
    { id: 'peper', label: 'PEPER', dotColor: '#D95430' },
    { id: 'mocha', label: 'MOCHA', dotColor: '#C48A58' },
    { id: 'colors', label: 'DARK', dotColor: '#26262B' },
    { id: 'black', label: 'BLACK', dotColor: '#050505' },
    { id: 'red', label: 'RED', dotColor: '#7A2020' },
    { id: 'light', label: 'LIGHT', dotColor: '#52525B' },
  ], []);

  const currentThemeObj = useMemo(() => {
    return APP_THEMES.find(t => t.id === appTheme) || APP_THEMES[0];
  }, [APP_THEMES, appTheme]);

  // Custom Color Presets (Character + Background combined presets)
  const [customColorPresets, setCustomColorPresets] = useState<ColorPreset[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_customColorPresets`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [activePresetId, setActivePresetId] = useState<string>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_activePresetId`);
    if (saved) return saved;
    const currentAppTheme = localStorage.getItem(`${STORAGE_KEY}_appTheme`);
    if (currentAppTheme === 'mocha') return 'default-mocha';
    if (currentAppTheme === 'colors') return 'default-colors';
    if (currentAppTheme === 'black') return 'default-black';
    if (currentAppTheme === 'red') return 'default-red';
    if (currentAppTheme === 'light') return 'default-light';
    return 'default-peper';
  });

  const [isRegisteringPreset, setIsRegisteringPreset] = useState(false);
  const [newPresetNameInput, setNewPresetNameInput] = useState('');
  const [isSidebarPresetDropdownOpen, setIsSidebarPresetDropdownOpen] = useState(false);

  // State Initialization from LocalStorage
  const [poses, setPoses] = useState<PosePreset[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_poses`);
    return saved ? JSON.parse(saved) : INITIAL_POSES;
  });
  const [poseId, setPoseId] = useState(() => localStorage.getItem(`${STORAGE_KEY}_poseId`) || INITIAL_POSES[0].id);

  const initialActiveColorConfig = useMemo(() => {
    return colorScope === 'theme' ? (themeColors[appTheme] || DEFAULT_THEME_COLORS[appTheme]) : commonColors;
  }, [colorScope, appTheme, themeColors, commonColors]);

  const [themeId, setThemeId] = useState<ThemeId>(() => (localStorage.getItem(`${STORAGE_KEY}_themeId`) as ThemeId) || initialActiveColorConfig.themeId);
  const [formationLevel, setFormationLevel] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_formationLevel`);
    if (saved) return Math.min(8, parseInt(saved));
    const oldCount = parseInt(localStorage.getItem(`${STORAGE_KEY}_count`) || '25');
    return Math.max(1, Math.min(8, Math.round(Math.sqrt(oldCount))));
  });
  const [formationType, setFormationType] = useState<'square' | 'circle' | 'triangle' | 'cross' | 'ring' | 'spiral'>(() => {
    return (localStorage.getItem(`${STORAGE_KEY}_formationType`) as any) || 'ring';
  });
  const [formationSpacing, setFormationSpacing] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_formationSpacing`);
    return saved ? parseFloat(saved) : 1.0;
  });
  const [personScale, setPersonScale] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_personScale`) || '0.5'));
  const [isAutoCycle, setIsAutoCycle] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isAutoCycle`) === 'true');
  const [cycleSpeed, setCycleSpeed] = useState(() => parseInt(localStorage.getItem(`${STORAGE_KEY}_cycleSpeed`) || '3000'));
  const [customBgColor, setCustomBgColor] = useState<string | null>(() => localStorage.getItem(`${STORAGE_KEY}_customBgColor`));
  const [characterColor, setCharacterColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_characterColor`) || initialActiveColorConfig.characterColor);
  const [savedCustomCharacterColor, setSavedCustomCharacterColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_savedCustomCharacterColor`) || initialActiveColorConfig.savedCustomCharacterColor);
  const [savedCustomBgColor, setSavedCustomBgColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_savedCustomBgColor`) || initialActiveColorConfig.savedCustomBgColor);

  const allPresets = useMemo(() => {
    return [...DEFAULT_COLOR_PRESETS, ...customColorPresets];
  }, [customColorPresets]);

  const activePreset = useMemo(() => {
    return allPresets.find(p => p.id === activePresetId) || DEFAULT_COLOR_PRESETS[0];
  }, [allPresets, activePresetId]);

  const isModifiedFromPreset = useMemo(() => {
    if (!activePreset) return false;
    const currentBg = (customBgColor || '#E5E7EB').toLowerCase();
    const presetBg = activePreset.bgColor.toLowerCase();
    const currentChr = characterColor.toLowerCase();
    const presetChr = activePreset.characterColor.toLowerCase();
    return currentChr !== presetChr || currentBg !== presetBg;
  }, [activePreset, characterColor, customBgColor]);

  const applyColorPreset = useCallback((preset: ColorPreset) => {
    setAppTheme(preset.appTheme);
    setCharacterColor(preset.characterColor);
    setCustomBgColor(preset.bgColor);
    setSavedCustomBgColor(preset.bgColor);
    setSavedCustomCharacterColor(preset.characterColor);
    if (preset.themeId) setThemeId(preset.themeId);
    setActivePresetId(preset.id);

    localStorage.setItem(`${STORAGE_KEY}_activePresetId`, preset.id);
    localStorage.setItem(`${STORAGE_KEY}_appTheme`, preset.appTheme);
    localStorage.setItem(`${STORAGE_KEY}_characterColor`, preset.characterColor);
    localStorage.setItem(`${STORAGE_KEY}_customBgColor`, preset.bgColor);
    localStorage.setItem(`${STORAGE_KEY}_savedCustomBgColor`, preset.bgColor);
    localStorage.setItem(`${STORAGE_KEY}_savedCustomCharacterColor`, preset.characterColor);
    if (preset.themeId) localStorage.setItem(`${STORAGE_KEY}_themeId`, preset.themeId);

    setThemeColors(prev => ({
      ...prev,
      [preset.appTheme]: {
        characterColor: preset.characterColor,
        savedCustomCharacterColor: preset.characterColor,
        themeId: preset.themeId || prev[preset.appTheme]?.themeId || 'light-gray',
        customBgColor: preset.bgColor,
        savedCustomBgColor: preset.bgColor,
      }
    }));

    setIsThemeDropdownOpen(false);
    setIsSidebarPresetDropdownOpen(false);
  }, []);

  const handleRegisterCustomPreset = useCallback((nameInput?: string) => {
    const currentBg = customBgColor || '#E5E7EB';
    const count = customColorPresets.length + 1;
    const name = (nameInput && nameInput.trim()) ? nameInput.trim() : `CUSTOM ${String(count).padStart(2, '0')}`;
    const newPreset: ColorPreset = {
      id: `custom_${Date.now()}`,
      name,
      isDefault: false,
      appTheme,
      characterColor,
      bgColor: currentBg,
      themeId,
    };
    const updated = [...customColorPresets, newPreset];
    setCustomColorPresets(updated);
    setActivePresetId(newPreset.id);
    localStorage.setItem(`${STORAGE_KEY}_customColorPresets`, JSON.stringify(updated));
    localStorage.setItem(`${STORAGE_KEY}_activePresetId`, newPreset.id);
    setIsRegisteringPreset(false);
    setNewPresetNameInput('');
    setIsThemeDropdownOpen(false);
    setIsSidebarPresetDropdownOpen(false);
  }, [customBgColor, customColorPresets, appTheme, characterColor, themeId]);

  const handleUpdateCustomPreset = useCallback(() => {
    if (!activePresetId || activePresetId.startsWith('default-')) return;
    const currentBg = customBgColor || '#E5E7EB';
    const updated = customColorPresets.map(p => {
      if (p.id === activePresetId) {
        return {
          ...p,
          characterColor,
          bgColor: currentBg,
          themeId,
          appTheme,
        };
      }
      return p;
    });
    setCustomColorPresets(updated);
    localStorage.setItem(`${STORAGE_KEY}_customColorPresets`, JSON.stringify(updated));
  }, [activePresetId, customBgColor, customColorPresets, characterColor, themeId, appTheme]);

  const handleDeleteCustomPreset = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = customColorPresets.filter(p => p.id !== id);
    setCustomColorPresets(updated);
    localStorage.setItem(`${STORAGE_KEY}_customColorPresets`, JSON.stringify(updated));
    if (activePresetId === id) {
      applyColorPreset(DEFAULT_COLOR_PRESETS[0]);
    }
  }, [customColorPresets, activePresetId, applyColorPreset]);

  const updateColorSetting = useCallback((updates: Partial<ThemeColorSetting>) => {
    if (updates.characterColor !== undefined) setCharacterColor(updates.characterColor);
    if (updates.savedCustomCharacterColor !== undefined) setSavedCustomCharacterColor(updates.savedCustomCharacterColor);
    if (updates.themeId !== undefined) setThemeId(updates.themeId);
    if (updates.customBgColor !== undefined) setCustomBgColor(updates.customBgColor);
    if (updates.savedCustomBgColor !== undefined) setSavedCustomBgColor(updates.savedCustomBgColor);

    if (colorScope === 'theme') {
      setThemeColors(prev => {
        const current = prev[appTheme] || DEFAULT_THEME_COLORS[appTheme];
        const updated = {
          ...prev,
          [appTheme]: {
            ...current,
            ...updates,
          }
        };
        localStorage.setItem(`${STORAGE_KEY}_themeColors`, JSON.stringify(updated));
        return updated;
      });
    } else {
      setCommonColors(prev => {
        const updated = {
          ...prev,
          ...updates,
        };
        localStorage.setItem(`${STORAGE_KEY}_commonColors`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [colorScope, appTheme]);

  const handleSelectTheme = useCallback((newTheme: AppTheme) => {
    setAppTheme(newTheme);
    setIsThemeDropdownOpen(false);

    // Map theme to default preset id
    const defPreset = DEFAULT_COLOR_PRESETS.find(p => p.appTheme === newTheme);
    if (defPreset) {
      setActivePresetId(defPreset.id);
      localStorage.setItem(`${STORAGE_KEY}_activePresetId`, defPreset.id);
    }

    if (colorScope === 'theme') {
      const config = themeColors[newTheme] || DEFAULT_THEME_COLORS[newTheme];
      if (config) {
        setCharacterColor(config.characterColor);
        setSavedCustomCharacterColor(config.savedCustomCharacterColor);
        setThemeId(config.themeId);
        setCustomBgColor(config.customBgColor);
        setSavedCustomBgColor(config.savedCustomBgColor);
      }
    }
  }, [colorScope, themeColors]);

  const handleToggleColorScope = useCallback((scope: ColorScope) => {
    setColorScope(scope);
    localStorage.setItem(`${STORAGE_KEY}_colorScope`, scope);
    if (scope === 'theme') {
      const config = themeColors[appTheme] || DEFAULT_THEME_COLORS[appTheme];
      if (config) {
        setCharacterColor(config.characterColor);
        setSavedCustomCharacterColor(config.savedCustomCharacterColor);
        setThemeId(config.themeId);
        setCustomBgColor(config.customBgColor);
        setSavedCustomBgColor(config.savedCustomBgColor);
      }
    } else {
      setCharacterColor(commonColors.characterColor);
      setSavedCustomCharacterColor(commonColors.savedCustomCharacterColor);
      setThemeId(commonColors.themeId);
      setCustomBgColor(commonColors.customBgColor);
      setSavedCustomBgColor(commonColors.savedCustomBgColor);
    }
  }, [appTheme, themeColors, commonColors]);

  const copyCurrentColorsToAllThemes = useCallback(() => {
    const currentConfig: ThemeColorSetting = {
      characterColor,
      savedCustomCharacterColor,
      themeId,
      customBgColor,
      savedCustomBgColor,
    };
    setThemeColors(prev => {
      const updated = { ...prev };
      (Object.keys(DEFAULT_THEME_COLORS) as AppTheme[]).forEach(k => {
        updated[k] = { ...currentConfig };
      });
      localStorage.setItem(`${STORAGE_KEY}_themeColors`, JSON.stringify(updated));
      return updated;
    });
    setCommonColors(currentConfig);
    localStorage.setItem(`${STORAGE_KEY}_commonColors`, JSON.stringify(currentConfig));
    setIsCopiedToAll(true);
    setTimeout(() => setIsCopiedToAll(false), 2000);
  }, [characterColor, savedCustomCharacterColor, themeId, customBgColor, savedCustomBgColor]);
  
  // Sound settings
  const [soundType, setSoundType] = useState<SoundEffectType>(() => (localStorage.getItem(`${STORAGE_KEY}_soundType`) as SoundEffectType) || 'mechanical');
  const [sfxVolume, setSfxVolume] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_sfxVolume`) || '0.5'));
  const [bgmVolume, setBgmVolume] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_bgmVolume`) || '0.3'));
  const [isSfxMuted, setIsSfxMuted] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isSfxMuted`) === 'true');
  const [playlists, setPlaylists] = useState<import('./types').Playlist[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_playlists`);
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Default Playlist', trackIds: [] }];
  });
  const [activePlaylistId, setActivePlaylistId] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_activePlaylistId`) || 'default';
  });
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isPlaylistExpanded`) === 'true');
  const [allTracks, setAllTracks] = useState<{ id: string, name: string, file: File | Blob }[]>([]);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0] || { id: 'default', name: 'Default Playlist', trackIds: [] };
  const bgmPlaylist = activePlaylist.trackIds.map(id => allTracks.find(t => t.id === id)).filter(Boolean) as { id: string, name: string, file: File | Blob }[];

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const stored = await AudioDB.getAllTracks();
        if (stored.length > 0) {
          const loadedTracks = stored.map(t => ({ id: t.id, name: t.name, file: t.data }));
          setAllTracks(loadedTracks);
          
          const savedPlaylists = localStorage.getItem(`${STORAGE_KEY}_playlists`);
          if (!savedPlaylists) {
            const savedOrder = localStorage.getItem(`${STORAGE_KEY}_bgmOrder`);
            let trackIds = loadedTracks.map(t => t.id);
            if (savedOrder) {
              const orderIds = JSON.parse(savedOrder) as string[];
              trackIds = orderIds.filter(id => loadedTracks.some(t => t.id === id));
            }
            setPlaylists([{ id: 'default', name: 'Default Playlist', trackIds }]);
          }
        }
      } catch (err) {
        console.error('Failed to load tracks:', err);
      }
    };
    loadTracks();
  }, []);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_playlists`, JSON.stringify(playlists));
    localStorage.setItem(`${STORAGE_KEY}_activePlaylistId`, activePlaylistId);
    localStorage.setItem(`${STORAGE_KEY}_isPlaylistExpanded`, isPlaylistExpanded.toString());
  }, [playlists, activePlaylistId, isPlaylistExpanded]);

  const setBgmPlaylist = (newTracks: { id: string, name: string, file: File | Blob }[]) => {
    const newTrackIds = newTracks.map(t => t.id);
    setPlaylists(prev => prev.map(p => p.id === activePlaylistId ? { ...p, trackIds: newTrackIds } : p));
  };

  const [currentBgmId, setCurrentBgmId] = useState<string | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [soundMode, setSoundMode] = useState<'bgm' | 'sfx'>('bgm');
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [isBgmLoading, setIsBgmLoading] = useState(false);
  const [isSamplesLoading, setIsSamplesLoading] = useState(false);
  const [bgmRepeatMode, setBgmRepeatMode] = useState<0 | 1 | 2>(0); // 0: Off, 1: Playlist, 2: Track
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isRandomCycle, setIsRandomCycle] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isRandomCycle`) === 'true');
  const [isSlowRotate, setIsSlowRotate] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isSlowRotate`) === 'true');
  const [rotateSpeed, setRotateSpeed] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_rotateSpeed`) || '0.5'));
  const [savedCycleSpeed, setSavedCycleSpeed] = useState<number | null>(null);
  const [bgmProgress, setBgmProgress] = useState(0);
  const [bgmTimeStr, setBgmTimeStr] = useState("0:00 / 0:00");
  
  const playTrackByIdRef = React.useRef<(id: string | null, forcePlay?: boolean) => Promise<void>>(() => Promise.resolve());
  const stateRefs = React.useRef({
    bgmPlaylist,
    currentBgmId,
    bgmRepeatMode
  });

  useEffect(() => {
    stateRefs.current = { bgmPlaylist, currentBgmId, bgmRepeatMode };
  }, [bgmPlaylist, currentBgmId, bgmRepeatMode]);

  useEffect(() => {
    SoundManager.setBgmEndedCallback(() => {
      const { bgmPlaylist, currentBgmId, bgmRepeatMode } = stateRefs.current;
      if (!currentBgmId || bgmPlaylist.length === 0) {
        setIsBgmPlaying(false);
        setIsSoundOn(false);
        return;
      }
      
      const currentIndex = bgmPlaylist.findIndex(t => t.id === currentBgmId);
      if (bgmRepeatMode === 2) {
        // Track Repeat
        playTrackByIdRef.current(currentBgmId, true);
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < bgmPlaylist.length) {
          playTrackByIdRef.current(bgmPlaylist[nextIndex].id, true);
        } else if (bgmRepeatMode === 1) {
          // Playlist Repeat
          playTrackByIdRef.current(bgmPlaylist[0].id, true);
        } else {
          // Off
          setIsBgmPlaying(false);
          setIsSoundOn(false);
          setCurrentBgmId(null);
        }
      }
    });

    const updateProgress = () => {
      const d = SoundManager.getBgmDuration();
      const c = SoundManager.getBgmTime();
      if (d > 0 && isFinite(d)) {
        setBgmProgress(c / d);
        const cm = Math.floor(c / 60);
        const cs = Math.floor(c % 60).toString().padStart(2, '0');
        const dm = Math.floor(d / 60);
        const ds = Math.floor(d % 60).toString().padStart(2, '0');
        setBgmTimeStr(`${cm}:${cs} / ${dm}:${ds}`);
      } else {
        setBgmProgress(0);
        setBgmTimeStr("0:00 / 0:00");
      }
    };
    const progressIntervalId = setInterval(updateProgress, 500);

    return () => clearInterval(progressIntervalId);
  }, []);

  // Camera settings
  const [isAutoCamera, setIsAutoCamera] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isAutoCamera`) === 'true');
  const [isAutoFormation, setIsAutoFormation] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isAutoFormation`) === 'true');
  const [isRandomFormation, setIsRandomFormation] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isRandomFormation`) === 'true');
  const [autoCameraSpeed, setAutoCameraSpeed] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_autoCameraSpeed`) || '1'));
  const [autoCameraMinHeight, setAutoCameraMinHeight] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_autoCameraMinHeight`) || '2'));
  const [autoCameraMaxHeight, setAutoCameraMaxHeight] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_autoCameraMaxHeight`) || '8'));
  const [autoCameraMinDistance, setAutoCameraMinDistance] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_autoCameraMinDistance`) || '8'));
  const [autoCameraMaxDistance, setAutoCameraMaxDistance] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_autoCameraMaxDistance`) || '16'));
  const [autoCameraReverse, setAutoCameraReverse] = useState(() => localStorage.getItem(`${STORAGE_KEY}_autoCameraReverse`) === 'true');
  const [isPoseSettingOpen, setIsPoseSettingOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isPoseSettingOpen`) !== 'false');
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isAdvancedOptionsOpen`) !== 'false');
  const [isPoseLibraryOpen, setIsPoseLibraryOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isPoseLibraryOpen`) !== 'false');
  const [isEffectSettingOpen, setIsEffectSettingOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isEffectSettingOpen`) !== 'false');
  const [isBgmSettingOpen, setIsBgmSettingOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isBgmSettingOpen`) !== 'false');
  const [isPlaylistSectionOpen, setIsPlaylistSectionOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isPlaylistSectionOpen`) !== 'false');

  // Section Ordering & DnD
  type VisualSectionId = 'pose-setting' | 'pose-library' | 'colors';
  type SoundSectionId = 'effect-setting' | 'bgm-setting' | 'playlists';

  const [visualSectionOrder, setVisualSectionOrder] = useState<VisualSectionId[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_visualSectionOrder`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3 && (['pose-setting', 'pose-library', 'colors'] as VisualSectionId[]).every(s => parsed.includes(s))) {
          return parsed;
        }
      }
    } catch (e) {}
    return ['pose-setting', 'pose-library', 'colors'];
  });

  const [soundSectionOrder, setSoundSectionOrder] = useState<SoundSectionId[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_soundSectionOrder`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3 && (['effect-setting', 'bgm-setting', 'playlists'] as SoundSectionId[]).every(s => parsed.includes(s))) {
          return parsed;
        }
      }
    } catch (e) {}
    return ['effect-setting', 'bgm-setting', 'playlists'];
  });

  const [draggingSection, setDraggingSection] = useState<{ tab: 'visual' | 'sound'; id: string } | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const handleSectionDragStart = (e: React.DragEvent, tab: 'visual' | 'sound', id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ tab, id }));
    setDraggingSection({ tab, id });
  };

  const handleSectionDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSectionId !== targetId) {
      setDragOverSectionId(targetId);
    }
  };

  const handleSectionDragLeave = (e: React.DragEvent, targetId: string) => {
    if (dragOverSectionId === targetId) {
      setDragOverSectionId(null);
    }
  };

  const handleSectionDrop = (e: React.DragEvent, tab: 'visual' | 'sound', targetId: string) => {
    e.preventDefault();
    setDragOverSectionId(null);
    if (!draggingSection || draggingSection.tab !== tab) return;
    const sourceId = draggingSection.id;
    if (sourceId === targetId) return;

    if (tab === 'visual') {
      setVisualSectionOrder(prev => {
        const fromIdx = prev.indexOf(sourceId as VisualSectionId);
        const toIdx = prev.indexOf(targetId as VisualSectionId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [removed] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, removed);
        localStorage.setItem(`${STORAGE_KEY}_visualSectionOrder`, JSON.stringify(next));
        return next;
      });
    } else {
      setSoundSectionOrder(prev => {
        const fromIdx = prev.indexOf(sourceId as SoundSectionId);
        const toIdx = prev.indexOf(targetId as SoundSectionId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [removed] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, removed);
        localStorage.setItem(`${STORAGE_KEY}_soundSectionOrder`, JSON.stringify(next));
        return next;
      });
    }
    setDraggingSection(null);
  };

  const handleSectionDragEnd = () => {
    setDraggingSection(null);
    setDragOverSectionId(null);
  };

  // UI Theme settings
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_accentColor`) || '#80858C');
  const [isColorSettingsOpen, setIsColorSettingsOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isColorSettingsOpen`) !== 'false');
  const [activeTab, setActiveTab] = useState<'visual' | 'sound'>('visual');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isSidebarOpen`) !== 'false');
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => (localStorage.getItem(`${STORAGE_KEY}_sidebarPosition`) as 'left' | 'right') || 'left');
  const [sidebarWidth, setSidebarWidth] = useState(() => parseInt(localStorage.getItem(`${STORAGE_KEY}_sidebarWidth`) || '300', 10));
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  useEffect(() => {
    if (!isResizingSidebar) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = sidebarPosition === 'left' ? e.clientX : window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(300, Math.min(newWidth, 600)));
    };
    
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, sidebarPosition]);
  const [appLanguage, setAppLanguage] = useState<'en' | 'ja'>(() => (localStorage.getItem(`${STORAGE_KEY}_appLanguage`) as any) || 'en');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    if (isThemeDropdownOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeDropdownOpen]);

  const [isHUDControlsVisible, setIsHUDControlsVisible] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isHUDControlsVisible`) !== 'false');

  const [themeDropdownMode, setThemeDropdownMode] = useState<'ui-only' | 'preset'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_themeDropdownMode`);
    return saved === 'preset' ? 'preset' : 'ui-only';
  });

  const switchThemeDropdownMode = (mode: 'ui-only' | 'preset') => {
    setThemeDropdownMode(mode);
    localStorage.setItem(`${STORAGE_KEY}_themeDropdownMode`, mode);
  };

  const handleSelectUIThemeOnly = useCallback((newTheme: AppTheme) => {
    setAppTheme(newTheme);
    localStorage.setItem(`${STORAGE_KEY}_appTheme`, newTheme);
    setIsThemeDropdownOpen(false);
  }, []);

  const t = (enText: string) => {
    if (appLanguage === 'en') return enText;
    const jaDict: Record<string, string> = {
      'Theme:': 'テーマ:',
      'Reset View': '視点リセット',
      'Pose Library': 'ポーズライブラリ',
      'Formation': '配置',
      'Shadow': '影',
      'Display': '表示',
      'Advanced Cycle Options': '詳細自動サイクル設定',
      'Colors': 'カラー',
      'Effects': 'エフェクト',
      'Sound': 'サウンド',
      'Character Color': 'キャラクターカラー',
      'Background Color': '背景カラー',
      'Theme Accent': 'アクセントカラー',
      'Visual Effects': '視覚効果',
      'Enable Bloom': 'ブルーム効果',
      'Enable Vignette': 'ビネット効果',
      'Noise Filter': 'ノイズフィルター',
      'Cinematic View': 'シネマティックビュー',
      'Camera Speed': 'カメラスピード',
      'Camera Height (Min / Max)': 'カメラの高さ (最小 / 最大)',
      'Camera Zoom (Min / Max)': 'カメラズーム (最小 / 最大)',
      'Reverse Rotation': '逆回転',
      'Reset Camera': 'カメラ設定をリセット',
      'Cycle Speed': '再生スピード',
      'Base Scale': '基本スケール',
      'Spacing': '間隔',
      'Rotation Speed': '回転スピード',
      'Sound Effects': '効果音',
      'Mute SFX': '効果音ミュート',
      'Background Music': 'BGM',
      'HUD Controls': 'HUDコントロール',
      'NEW': '新規',
      'Scale': 'スケール',
      'Level': 'レベル',
      'Space': '間隔',
      'Format': '形式',
      'New Pose': '新規ポーズ',
      'Edit Pose': 'ポーズ編集',
      'Cancel': 'キャンセル',
      'Save': '保存',
      'Custom Poses': 'カスタムポーズ',
      'Auto Cycle': '自動サイクル',
      'Visual Themes': 'ビジュアルテーマ',
      'EFFECT SETTING': 'エフェクト設定',
      'BGM SETTING': 'BGM設定',
      'PLAYLISTS': 'プレイリスト',
      'POSE SETTING': 'ポーズセッティング',
      'POSE LIBRARY': 'ポーズライブラリ',
      'COLORS': 'カラー',
      'Drag to reorder': 'ドラッグして並べ替え',
      'Custom': 'カスタム',
      'EXPORT': '出力',
      'IMPORT': '入力',
      'Mirror Symmetry': '左右対称',
      'Drop Audio Files Here': 'ここにオーディオファイルをドロップ',
      'DARK': 'ダーク',
      'Visual': 'ビジュアル',
      'Cycle Interval': 'サイクル間隔',
      'Turn Speed': '回転速度',
      'Camera Intensity': 'カメラ強度',
      'Pose Name': 'ポーズ名',
      'Effect Style': 'エフェクトスタイル',
      'SFX Volume': '効果音音量',
      'BGM Volume': 'BGM音量',
      'Shadow Op': '影の濃さ',
      'Angle': '角度',
      'Length': '長さ',
      'Blur': 'ぼかし',
      'HUD Opacity': 'HUD不透明度',
      'Reset Shadow': '影をリセット',
      'Reset Shadow Settings': '影の設定をリセット',
      'Random Pose': 'ランダムポーズ',
      'Auto Turn': '自動回転',
      'Auto-save Ready': 'オートセーブ準備完了',
      'Workspace persistence active': 'ワークスペース永続化有効',
      'OFF': 'オフ',
      'ON': 'オン',
      'MODE': 'モード',
      'SOUND': 'サウンド',
      'Custom Character Color': 'カスタムキャラクターカラー',
      'Custom Background Color': 'カスタム背景カラー',
      'Toggle Playlist View': 'プレイリスト表示切替',
      'Delete all tracks': '全トラック削除',
      'Move Up': '上に移動',
      'Move Down': '下に移動',
      'Rename': '名前の変更',
      'Delete Selected': '選択したものを削除',
      'Move to Top': '一番上に移動',
      'Move to Bottom': '一番下に移動',
      'Toggle Sidebar Position': 'サイドチェンジ (左右切替)',
      'Hide Sidebar': 'サイドバーを隠す',
      'Show Sidebar': 'サイドバーを表示',
      'Playlist Repeat': 'プレイリストリピート',
      'Track Repeat': 'トラックリピート',
      'Repeat Off': 'リピートオフ',
      'Click to confirm': 'クリックして確定',
      'Delete': '削除',
      'Exit Fullscreen': 'フルスクリーン終了',
      'Enter Fullscreen': 'フルスクリーン開始',
      'Auto Format Change': 'フォーマットチェンジ',
      'New Set': '新規作成',
      'Color Scope': 'カラー適用範囲',
      'Per Theme': 'テーマ別',
      'Common': '共通',
      'ALL THEMES': '全テーマ共通',
      'Saved for': '保存先:',
      'Copy to All Themes': '全テーマに複製',
      'Copied!': '複製完了',
      'THEME ACCENT': 'テーマアクセント',
      'Apply Theme Accent': 'テーマのアクセントカラーを適用',
      'DEFAULT PRESETS': 'レギュラー / デフォルト',
      'CUSTOM SETS': 'カスタムセット',
      'No custom sets registered': '登録済みカスタムセットなし',
      'Save Current as Custom Set': '現在の配色をカスタム登録',
      'Register New Custom Set': '新規カスタムセット登録',
      'Overwrite Custom Set': 'カスタムセット上書き保存',
      'Delete Preset': 'プリセット削除',
      'Color Set': 'カラーセット',
      'Active Set': '適用中セット',
      'Modified': '変更あり',
      'Preset': 'プリセット',
      'Enter custom preset name': 'カスタムセット名を入力',
      'Select Theme & Color Preset': 'テーマ・カラーセット選択',
      'UI Theme Only': 'UIのみ変更（シーン維持）',
      'Full Preset Set': '全連動セット',
      'UI THEMES': 'UIテーマ (5色)',
      'SCENE INTACT': 'シーン維持',
      'Character and background colors will remain unchanged.': 'キャラクター・背景色は変更されません',
    };
    return jaDict[enText] || enText;
  };
  const [hudPanelTab, setHudPanelTab] = useState<'formation' | 'shadow' | 'display'>('formation');
  const [hudOpacity, setHudOpacity] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_hudOpacity`) || '0.8'));
  const [shadowOpacity, setShadowOpacity] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_shadowOpacity`) || '0.15'));
  const [shadowAngle, setShadowAngle] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_shadowAngle`) || '0.6981317007977318'));
  const [shadowBlur, setShadowBlur] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_shadowBlur`) || '5.0'));
  const [shadowLength, setShadowLength] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_shadowLength`) || '0.8'));
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const themeColors: Record<AppTheme, string> = {
      peper: '#EBE4D5',
      mocha: '#45372C',
      colors: '#121214',
      black: '#000000',
      red: '#1A0A0A',
      light: '#F0F2F5',
    };
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColors[appTheme] || '#121214');
    }
  }, [appTheme]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSymmetric, setIsSymmetric] = useState(false);
  const [editingPoseId, setEditingPoseId] = useState<string | null>(null);
  const [editPoseName, setEditPoseName] = useState('');
  const [editPose, setEditPose] = useState<PoseAngles>(INITIAL_POSES[0].angles);
  
  const orbitRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const resumeBgmRef = React.useRef(false);

  // Persistence logic
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_poses`, JSON.stringify(poses));
    localStorage.setItem(`${STORAGE_KEY}_poseId`, poseId);
    localStorage.setItem(`${STORAGE_KEY}_themeId`, themeId);
    localStorage.setItem(`${STORAGE_KEY}_formationLevel`, formationLevel.toString());
    localStorage.setItem(`${STORAGE_KEY}_formationType`, formationType);
    localStorage.setItem(`${STORAGE_KEY}_formationSpacing`, formationSpacing.toString());
    localStorage.setItem(`${STORAGE_KEY}_personScale`, personScale.toString());
    localStorage.setItem(`${STORAGE_KEY}_isAutoCycle`, isAutoCycle.toString());
    localStorage.setItem(`${STORAGE_KEY}_isRandomCycle`, isRandomCycle.toString());
    localStorage.setItem(`${STORAGE_KEY}_isSlowRotate`, isSlowRotate.toString());
    localStorage.setItem(`${STORAGE_KEY}_rotateSpeed`, rotateSpeed.toString());
    localStorage.setItem(`${STORAGE_KEY}_cycleSpeed`, cycleSpeed.toString());
    if (customBgColor) localStorage.setItem(`${STORAGE_KEY}_customBgColor`, customBgColor);
    else localStorage.removeItem(`${STORAGE_KEY}_customBgColor`);

    localStorage.setItem(`${STORAGE_KEY}_soundType`, soundType);
    localStorage.setItem(`${STORAGE_KEY}_sfxVolume`, sfxVolume.toString());
    localStorage.setItem(`${STORAGE_KEY}_bgmVolume`, bgmVolume.toString());
    localStorage.setItem(`${STORAGE_KEY}_isSfxMuted`, isSfxMuted.toString());
    localStorage.setItem(`${STORAGE_KEY}_isAutoCamera`, isAutoCamera.toString());
    localStorage.setItem(`${STORAGE_KEY}_isAutoFormation`, isAutoFormation.toString());
    localStorage.setItem(`${STORAGE_KEY}_isRandomFormation`, isRandomFormation.toString());
    localStorage.setItem(`${STORAGE_KEY}_autoCameraSpeed`, autoCameraSpeed.toString());
    localStorage.setItem(`${STORAGE_KEY}_autoCameraMinHeight`, autoCameraMinHeight.toString());
    localStorage.setItem(`${STORAGE_KEY}_autoCameraMaxHeight`, autoCameraMaxHeight.toString());
    localStorage.setItem(`${STORAGE_KEY}_autoCameraMinDistance`, autoCameraMinDistance.toString());
    localStorage.setItem(`${STORAGE_KEY}_autoCameraMaxDistance`, autoCameraMaxDistance.toString());
    localStorage.setItem(`${STORAGE_KEY}_isPoseSettingOpen`, isPoseSettingOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isAdvancedOptionsOpen`, isAdvancedOptionsOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isPoseLibraryOpen`, isPoseLibraryOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isEffectSettingOpen`, isEffectSettingOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isBgmSettingOpen`, isBgmSettingOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isPlaylistSectionOpen`, isPlaylistSectionOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_visualSectionOrder`, JSON.stringify(visualSectionOrder));
    localStorage.setItem(`${STORAGE_KEY}_soundSectionOrder`, JSON.stringify(soundSectionOrder));
    localStorage.setItem(`${STORAGE_KEY}_accentColor`, accentColor);
    localStorage.setItem(`${STORAGE_KEY}_characterColor`, characterColor);
    localStorage.setItem(`${STORAGE_KEY}_savedCustomCharacterColor`, savedCustomCharacterColor);
    localStorage.setItem(`${STORAGE_KEY}_savedCustomBgColor`, savedCustomBgColor);
    localStorage.setItem(`${STORAGE_KEY}_colorScope`, colorScope);
    localStorage.setItem(`${STORAGE_KEY}_themeColors`, JSON.stringify(themeColors));
    localStorage.setItem(`${STORAGE_KEY}_commonColors`, JSON.stringify(commonColors));
    localStorage.setItem(`${STORAGE_KEY}_isColorSettingsOpen`, isColorSettingsOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isSidebarOpen`, isSidebarOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_sidebarPosition`, sidebarPosition);
    localStorage.setItem(`${STORAGE_KEY}_sidebarWidth`, sidebarWidth.toString());
    localStorage.setItem(`${STORAGE_KEY}_appLanguage`, appLanguage);
    localStorage.setItem(`${STORAGE_KEY}_appTheme`, appTheme);
    localStorage.setItem(`${STORAGE_KEY}_isHUDControlsVisible`, isHUDControlsVisible.toString());
    localStorage.setItem(`${STORAGE_KEY}_hudOpacity`, hudOpacity.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowOpacity`, shadowOpacity.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowAngle`, shadowAngle.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowBlur`, shadowBlur.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowLength`, shadowLength.toString());
  }, [poses, poseId, themeId, formationLevel, formationType, formationSpacing, personScale, isAutoCycle, isRandomCycle, isSlowRotate, rotateSpeed, cycleSpeed, customBgColor, soundType, sfxVolume, bgmVolume, isSfxMuted, isAutoCamera, isAutoFormation, isRandomFormation, autoCameraSpeed, autoCameraMinHeight, autoCameraMaxHeight, autoCameraMinDistance, autoCameraMaxDistance, autoCameraReverse, isPoseSettingOpen, isAdvancedOptionsOpen, isPoseLibraryOpen, isEffectSettingOpen, isBgmSettingOpen, isPlaylistSectionOpen, visualSectionOrder, soundSectionOrder, accentColor, characterColor, savedCustomCharacterColor, savedCustomBgColor, colorScope, themeColors, commonColors, isColorSettingsOpen, isSidebarOpen, sidebarPosition, sidebarWidth, appLanguage, appTheme, isHUDControlsVisible, hudOpacity, shadowOpacity, shadowAngle, shadowBlur, shadowLength]);

  // Sync sound manager state
  useEffect(() => {
    SoundManager.setVolume(isSfxMuted ? 0 : sfxVolume);
    SoundManager.setBgmVolume(bgmVolume);
  }, [sfxVolume, bgmVolume, isSfxMuted]);



  const setSfxMutedWithSpeed = (mute: boolean) => {
    if (mute === isSfxMuted) return;
    
    if (mute) {
      if (savedCycleSpeed !== null) {
        setCycleSpeed(savedCycleSpeed);
        setSavedCycleSpeed(null);
      }
    } else {
      if (cycleSpeed < 1000) {
        setSavedCycleSpeed(cycleSpeed);
        setCycleSpeed(1000);
      }
    }
    setIsSfxMuted(mute);
  };

  // Export Logic
  const exportSettings = async () => {
    const data = {
      poses, poseId, themeId, formationLevel, formationType, formationSpacing, personScale, isAutoCycle, isRandomCycle, isSlowRotate, rotateSpeed, cycleSpeed, customBgColor,
      soundType, sfxVolume, bgmVolume, isSfxMuted, isAutoCamera, isAutoFormation, isRandomFormation, autoCameraSpeed, autoCameraMinHeight, autoCameraMaxHeight, autoCameraMinDistance, autoCameraMaxDistance, autoCameraReverse, accentColor,
      characterColor, savedCustomCharacterColor, savedCustomBgColor, colorScope, themeColors, commonColors, isColorSettingsOpen, isPoseSettingOpen, isPoseLibraryOpen, isEffectSettingOpen, isBgmSettingOpen, isPlaylistSectionOpen, visualSectionOrder, soundSectionOrder, isSidebarOpen, sidebarPosition, sidebarWidth, isHUDControlsVisible, hudOpacity, shadowOpacity, shadowAngle, shadowBlur, shadowLength,
      playlists, activePlaylistId, isPlaylistExpanded,
      customColorPresets, activePresetId,
      appTheme, themeDropdownMode,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0') + '_' + 
      String(now.getHours()).padStart(2, '0') + 
      String(now.getMinutes()).padStart(2, '0') + 
      String(now.getSeconds()).padStart(2, '0');
    link.download = `voxelpose_settings_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Import Logic
  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.poses) setPoses(data.poses);
        if (data.poseId) setPoseId(data.poseId);
        if (data.themeId) setThemeId(data.themeId);
        if (data.formationLevel) setFormationLevel(data.formationLevel);
        if (data.formationType) setFormationType(data.formationType);
        if (data.formationSpacing) setFormationSpacing(data.formationSpacing);
        if (data.personScale) setPersonScale(data.personScale);
        if (data.isAutoCycle !== undefined) setIsAutoCycle(data.isAutoCycle);
        if (data.isRandomCycle !== undefined) setIsRandomCycle(data.isRandomCycle);
        if (data.isSlowRotate !== undefined) setIsSlowRotate(data.isSlowRotate);
        if (data.rotateSpeed !== undefined) setRotateSpeed(data.rotateSpeed);
        if (data.cycleSpeed) setCycleSpeed(data.cycleSpeed);
        if (data.customBgColor !== undefined) setCustomBgColor(data.customBgColor);
        if (data.soundType) setSoundType(data.soundType);
        if (data.sfxVolume !== undefined) setSfxVolume(data.sfxVolume);
        if (data.bgmVolume !== undefined) setBgmVolume(data.bgmVolume);
        if (data.isSfxMuted !== undefined) setIsSfxMuted(data.isSfxMuted);
        if (data.isAutoCamera !== undefined) setIsAutoCamera(data.isAutoCamera);
        if (data.isAutoFormation !== undefined) setIsAutoFormation(data.isAutoFormation);
        if (data.isRandomFormation !== undefined) setIsRandomFormation(data.isRandomFormation);
        if (data.autoCameraSpeed !== undefined) setAutoCameraSpeed(data.autoCameraSpeed);
        if (data.autoCameraMinHeight !== undefined) setAutoCameraMinHeight(data.autoCameraMinHeight);
        if (data.autoCameraMaxHeight !== undefined) setAutoCameraMaxHeight(data.autoCameraMaxHeight);
        if (data.autoCameraMinDistance !== undefined) setAutoCameraMinDistance(data.autoCameraMinDistance);
        if (data.autoCameraMaxDistance !== undefined) setAutoCameraMaxDistance(data.autoCameraMaxDistance);
        if (data.autoCameraReverse !== undefined) setAutoCameraReverse(data.autoCameraReverse);
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.characterColor) setCharacterColor(data.characterColor);
        if (data.savedCustomCharacterColor) setSavedCustomCharacterColor(data.savedCustomCharacterColor);
        if (data.savedCustomBgColor) setSavedCustomBgColor(data.savedCustomBgColor);
        if (data.colorScope) setColorScope(data.colorScope);
        if (data.themeColors) setThemeColors(data.themeColors);
        if (data.commonColors) setCommonColors(data.commonColors);
        if (data.customColorPresets) setCustomColorPresets(data.customColorPresets);
        if (data.activePresetId) setActivePresetId(data.activePresetId);
        if (data.appTheme) {
          setAppTheme(data.appTheme);
          localStorage.setItem(`${STORAGE_KEY}_appTheme`, data.appTheme);
        }
        if (data.themeDropdownMode) {
          setThemeDropdownMode(data.themeDropdownMode);
          localStorage.setItem(`${STORAGE_KEY}_themeDropdownMode`, data.themeDropdownMode);
        }
        if (data.isColorSettingsOpen !== undefined) setIsColorSettingsOpen(data.isColorSettingsOpen);
        if (data.isPoseSettingOpen !== undefined) setIsPoseSettingOpen(data.isPoseSettingOpen);
        if (data.isPoseLibraryOpen !== undefined) setIsPoseLibraryOpen(data.isPoseLibraryOpen);
        if (data.isEffectSettingOpen !== undefined) setIsEffectSettingOpen(data.isEffectSettingOpen);
        if (data.isBgmSettingOpen !== undefined) setIsBgmSettingOpen(data.isBgmSettingOpen);
        if (data.isPlaylistSectionOpen !== undefined) setIsPlaylistSectionOpen(data.isPlaylistSectionOpen);
        if (data.visualSectionOrder && Array.isArray(data.visualSectionOrder)) setVisualSectionOrder(data.visualSectionOrder);
        if (data.soundSectionOrder && Array.isArray(data.soundSectionOrder)) setSoundSectionOrder(data.soundSectionOrder);
        if (data.isSidebarOpen !== undefined) setIsSidebarOpen(data.isSidebarOpen);
        if (data.sidebarPosition) setSidebarPosition(data.sidebarPosition);
        if (data.sidebarWidth) setSidebarWidth(data.sidebarWidth);
        if (data.isHUDControlsVisible !== undefined) setIsHUDControlsVisible(data.isHUDControlsVisible);
        if (data.hudOpacity !== undefined) setHudOpacity(data.hudOpacity);
        if (data.shadowOpacity !== undefined) setShadowOpacity(data.shadowOpacity);
        if (data.shadowAngle !== undefined) setShadowAngle(data.shadowAngle);
        if (data.shadowBlur !== undefined) setShadowBlur(data.shadowBlur);
        if (data.shadowLength !== undefined) setShadowLength(data.shadowLength);
        if (data.playlists) setPlaylists(data.playlists);
        if (data.activePlaylistId) setActivePlaylistId(data.activePlaylistId);
        if (data.isPlaylistExpanded !== undefined) setIsPlaylistExpanded(data.isPlaylistExpanded);
        
        if (data.tracks && Array.isArray(data.tracks)) {
          const importedTracks = await Promise.all(data.tracks.map(async (t: any) => {
            const res = await fetch(t.data);
            const blob = await res.blob();
            return { id: t.id, name: t.name, file: blob };
          }));
          
          await AudioDB.clearAllTracks();
          for (const track of importedTracks) {
            await AudioDB.saveTrack({ id: track.id, name: track.name, data: track.file });
          }
          setAllTracks(importedTracks);
        }
        
        SoundManager.playPoseChange(data.soundType || soundType);
      } catch (err) {
        console.error(err);
        alert('Invalid settings file or data too large to parse.');
      }
    };
    reader.readAsText(file);
  };

  const currentPose = useMemo(() => {
    if (isEditing) return editPose;
    return poses.find(p => p.id === poseId)?.angles || poses[0].angles;
  }, [poseId, poses, isEditing, editPose]);

  const baseTheme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);
  const currentTheme = useMemo(() => {
    if (!customBgColor) return baseTheme;
    
    const bg = new THREE.Color(customBgColor);
    const hsl = { h: 0, s: 0, l: 0 };
    bg.getHSL(hsl);
    
    // Create matching ground and grid colors based on lightness
    const ground = bg.clone().offsetHSL(0, 0, hsl.l > 0.5 ? -0.05 : 0.05);
    const grid = bg.clone().offsetHSL(0, 0, hsl.l > 0.5 ? -0.15 : 0.15);
    
    return {
      ...baseTheme,
      bgColor: customBgColor,
      groundColor: '#' + ground.getHexString(),
      gridColor: '#' + grid.getHexString(),
    };
  }, [baseTheme, customBgColor]);

  // Auto-cycle logic
  useEffect(() => {
    let interval: any;
    if (isAutoCycle && !isEditing) {
          interval = setInterval(() => {
            if (!isSfxMuted) SoundManager.playPoseChange(soundType);
            setPoseId(prev => {
              if (isRandomCycle && poses.length > 1) {
                let nextIndex;
                do {
                  nextIndex = Math.floor(Math.random() * poses.length);
                } while (poses[nextIndex].id === prev);
                return poses[nextIndex].id;
              } else {
                const currentIndex = poses.findIndex(p => p.id === prev);
                const nextIndex = (currentIndex + 1) % poses.length;
                return poses[nextIndex].id;
              }
            });
          }, cycleSpeed);
        }
        return () => clearInterval(interval);
      }, [isAutoCycle, isRandomCycle, poses, isEditing, cycleSpeed, soundType, isSfxMuted]);
    
  // Auto-cycle formation logic
  useEffect(() => {
    let interval: any;
    if (isAutoFormation && !isEditing) {
      interval = setInterval(() => {
        setFormationType(prev => {
          const FORMATIONS = ['square', 'circle', 'triangle', 'cross', 'ring', 'spiral'] as const;
          if (isRandomFormation) {
            let nextIndex;
            do {
              nextIndex = Math.floor(Math.random() * FORMATIONS.length);
            } while (FORMATIONS[nextIndex] === prev);
            return FORMATIONS[nextIndex];
          } else {
            const currentIndex = FORMATIONS.indexOf(prev as any);
            const nextIndex = (currentIndex + 1) % FORMATIONS.length;
            return FORMATIONS[nextIndex];
          }
        });
      }, 7500);
    }
    return () => clearInterval(interval);
  }, [isAutoFormation, isRandomFormation, isEditing]);

  const handlePoseChange = (id: string) => {
    if (id !== poseId) {
      setPoseId(id);
      if (!isSfxMuted) SoundManager.playPoseChange(soundType);
    }
  };

  const startEditing = (pose?: PosePreset) => {
    if (pose) {
      setEditingPoseId(pose.id);
      setEditPoseName(pose.name);
      setEditPose(JSON.parse(JSON.stringify(pose.angles)));
    } else {
      setEditingPoseId(null);
      setEditPoseName(`Custom ${poses.length - INITIAL_POSES.length + 1}`);
      setEditPose(JSON.parse(JSON.stringify(currentPose)));
    }
    setIsEditing(true);
  };

  const saveCustomPose = () => {
    if (editingPoseId) {
      setPoses(prev => prev.map(p => 
        p.id === editingPoseId 
          ? { ...p, name: editPoseName, angles: { ...editPose } } 
          : p
      ));
    } else {
      const newPose: PosePreset = {
        id: `custom-${Date.now()}`,
        name: editPoseName || `Custom ${poses.length - INITIAL_POSES.length + 1}`,
        angles: { ...editPose }
      };
      setPoses(prev => [...prev, newPose]);
      setPoseId(newPose.id);
    }
    setIsEditing(false);
    setEditingPoseId(null);
    if (!isSfxMuted) SoundManager.playPoseChange(soundType);
  };

  const deletePose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id.startsWith('custom-')) return;
    if (window.confirm('Delete this custom pose?')) {
      const remainingPoses = poses.filter(p => p.id !== id);
      setPoses(remainingPoses);
      if (poseId === id) {
        setPoseId(INITIAL_POSES[0].id);
      }
    }
  };

  const updateEditPart = (part: keyof PoseAngles, axis: 0 | 1 | 2, value: number) => {
    setEditPose(prev => {
      const current = prev[part] || [0, 0, 0];
      const next = [...current] as [number, number, number];
      next[axis] = value;
      
      const newState = { ...prev, [part]: next };

      if (isSymmetric) {
        let mirrorPart: string | null = null;
        if (part.includes('_l_')) mirrorPart = part.replace('_l_', '_r_');
        else if (part.includes('_r_')) mirrorPart = part.replace('_r_', '_l_');

        if (mirrorPart) {
          const mirrorVal = [...(prev[mirrorPart as keyof PoseAngles] || [0, 0, 0])] as [number, number, number];
          // Mirroring logic: 
          // Axis 0 (Pitch/Forward): Same value
          // Axis 1 (Yaw/Twist): Negated value
          // Axis 2 (Roll/Spread): Negated value
          if (axis === 0) mirrorVal[0] = value;
          else mirrorVal[axis] = -value;
          
          newState[mirrorPart as keyof PoseAngles] = mirrorVal;
        }
      }

      return newState;
    });
  };

  const resetCamera = () => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
  };

  const bgmInputRef = React.useRef<HTMLInputElement>(null);

  const loadSamples = async () => {
    setIsSamplesLoading(true);
    const samples = [
      { name: "Casa Bossa Nova (Kevin MacLeod)", url: "https://upload.wikimedia.org/wikipedia/commons/7/70/Casa_Bossa_Nova_%28ISRC_USUAN1600012%29.mp3" },
      { name: "Outfoxing (MDN Sample)", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-basics/outfoxing.mp3" }
    ];

    const newTracks: { id: string, name: string, file: File | Blob }[] = [];
    const newTrackIds: string[] = [];

    try {
      for (const sample of samples) {
        const res = await fetch(sample.url);
        const blob = await res.blob();
        const id = Math.random().toString(36).substring(2, 9);
        newTracks.push({ id, name: sample.name, file: blob });
        newTrackIds.push(id);
        
        try {
          await AudioDB.saveTrack({ id, name: sample.name, data: blob });
        } catch (err) {
          console.error('Failed to persist sample:', err);
        }
      }

      setAllTracks(prev => [...prev, ...newTracks]);
      
      const newPlaylist = [...bgmPlaylist, ...newTracks];
      setBgmPlaylist(newPlaylist);

      if (currentBgmId === null && newPlaylist.length > 0) {
        playTrackById(newTracks[0].id, true);
      }
    } catch (e) {
      console.error('Failed to load samples', e);
      alert('Failed to load samples due to network error.');
    } finally {
      setIsSamplesLoading(false);
    }
  };

  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const newTracks: { id: string, name: string, file: File | Blob }[] = [];
    const newTrackIds: string[] = [];
    
    for (const file of Array.from(files) as File[]) {
      const id = Math.random().toString(36).substring(2, 9);
      const name = file.name.replace(/\.[^/.]+$/, "");
      const track = { id, name, file };
      newTracks.push(track);
      newTrackIds.push(id);
      
      try {
        await AudioDB.saveTrack({ id, name, data: file });
      } catch (err) {
        console.error('Failed to persist track:', err);
      }
    }

    setAllTracks(prev => [...prev, ...newTracks]);
    setPlaylists(prev => prev.map(p => 
      p.id === activePlaylistId 
        ? { ...p, trackIds: [...p.trackIds, ...newTrackIds] } 
        : p
    ));

    if (currentBgmId === null && newTracks.length > 0) {
      try {
        setIsBgmLoading(true);
        await SoundManager.loadBGM(newTracks[0].file as File);
        setCurrentBgmId(newTracks[0].id);
      } catch (e) {
        alert("Failed to load audio file.");
      } finally {
        setIsBgmLoading(false);
      }
    }
  };

  const moveToTop = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPlaylist = bgmPlaylist.filter((_, i) => i !== index);
    newPlaylist.unshift(bgmPlaylist[index]);
    setBgmPlaylist(newPlaylist);
  };

  const moveToBottom = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPlaylist = bgmPlaylist.filter((_, i) => i !== index);
    newPlaylist.push(bgmPlaylist[index]);
    setBgmPlaylist(newPlaylist);
  };

  const moveTrackUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    const newPlaylist = [...bgmPlaylist];
    const temp = newPlaylist[index];
    newPlaylist[index] = newPlaylist[index - 1];
    newPlaylist[index - 1] = temp;
    setBgmPlaylist(newPlaylist);
  };

  const moveTrackDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === bgmPlaylist.length - 1) return;
    const newPlaylist = [...bgmPlaylist];
    const temp = newPlaylist[index];
    newPlaylist[index] = newPlaylist[index + 1];
    newPlaylist[index + 1] = temp;
    setBgmPlaylist(newPlaylist);
  };

  const playTrackById = async (id: string | null, forcePlay: boolean = false) => {
    if (!id) return;
    const track = allTracks.find(t => t.id === id);
    if (!track) return;

    if (id === currentBgmId && !forcePlay) {
      if (isBgmPlaying) {
        SoundManager.pauseBGM();
        setIsBgmPlaying(false);
        setIsSoundOn(false);
        setIsAutoCycle(false);
      } else {
        setIsBgmPlaying(true);
        setIsSoundOn(true);
        setSoundMode('bgm');
        setIsAutoCycle(true);
        SoundManager.playBGM();
        if (!isSfxMuted) setSfxMutedWithSpeed(true);
      }
      return;
    }
    SoundManager.stopBGM();
    try {
      setIsBgmLoading(true);
      await SoundManager.loadBGM(track.file as File);
      setCurrentBgmId(id);
      setIsBgmPlaying(true);
      setIsSoundOn(true);
      setSoundMode('bgm');
      setIsAutoCycle(true);
      SoundManager.playBGM();
      if (!isSfxMuted) setSfxMutedWithSpeed(true);
    } catch (e) {
      alert("Failed to load audio file. It may be corrupt or unsupported.");
      setCurrentBgmId(null);
      setIsBgmPlaying(false);
      setIsSoundOn(false);
      setIsAutoCycle(false);
    } finally {
      setIsBgmLoading(false);
    }
  };

  playTrackByIdRef.current = playTrackById;

  const removeSelectedTracks = () => {
    if (selectedTrackIds.size === 0) return;
    
    const selectedIds = Array.from(selectedTrackIds);
    setPlaylists(prev => prev.map(p => {
      if (p.id === activePlaylistId) {
        return { ...p, trackIds: p.trackIds.filter(id => !selectedIds.includes(id)) };
      }
      return p;
    }));
    setSelectedTrackIds(new Set());
    
    if (currentBgmId && selectedIds.includes(currentBgmId)) {
      SoundManager.stopBGM();
      setIsBgmPlaying(false);
      setCurrentBgmId(null);
    }
  };

  const removeTrack = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const track = bgmPlaylist[index];
    
    if (track.id === currentBgmId) {
      SoundManager.stopBGM();
      setIsBgmPlaying(false);
      setCurrentBgmId(null);
    }
    
    // Remove from the current playlist only
    setBgmPlaylist(bgmPlaylist.filter((_, i) => i !== index));
    
    // Optionally remove from AudioDB if orphaned, but for now just keep simple
  };

  const toggleTrackSelection = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const moveSelectedTracksToPlaylist = (targetPlaylistId: string) => {
    if (selectedTrackIds.size === 0 || !targetPlaylistId) return;
    
    const selectedIds = Array.from(selectedTrackIds);
    setPlaylists(prev => prev.map(p => {
      if (p.id === activePlaylistId) {
        return { ...p, trackIds: p.trackIds.filter(id => !selectedIds.includes(id)) };
      }
      if (p.id === targetPlaylistId) {
        return { ...p, trackIds: [...p.trackIds, ...selectedIds] };
      }
      return p;
    }));
    setSelectedTrackIds(new Set()); // Clear selection after move
  };

  const createPlaylist = () => {
    const id = Math.random().toString(36).substring(2, 9);
    setPlaylists(prev => [...prev, { id, name: `Playlist ${prev.length + 1}`, trackIds: [] }]);
    setActivePlaylistId(id);
  };

  const renamePlaylist = (id: string, name: string) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const movePlaylist = (id: string, dir: -1 | 1) => {
    setPlaylists(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      if (idx === 0 && dir === -1) return prev; // Cannot move above Default if we treat Default special? Wait, if we want to move any up/down it's fine.
      if (dir === -1 && idx > 0) {
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[idx-1];
        next[idx-1] = temp;
        return next;
      }
      if (dir === 1 && idx < prev.length - 1) {
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[idx+1];
        next[idx+1] = temp;
        return next;
      }
      return prev;
    });
  };

  const deletePlaylist = (id: string) => {
    const nextPlaylists = playlists.filter(p => p.id !== id);
    if (nextPlaylists.length === 0) {
      const newId = Math.random().toString(36).substring(2, 9);
      setActivePlaylistId(newId);
      setPlaylists([{ id: newId, name: 'Default Playlist', trackIds: [] }]);
    } else {
      if (id === activePlaylistId) {
        setActivePlaylistId(nextPlaylists[0].id);
      }
      setPlaylists(nextPlaylists);
    }
  };



  const toggleSound = () => {
    const nextIsSoundOn = !isSoundOn;
    setIsSoundOn(nextIsSoundOn);
    
    if (nextIsSoundOn) {
      if (soundMode === 'bgm') {
        setSfxMutedWithSpeed(true);
        if (isAutoCycle) {
          setIsBgmPlaying(true);
          if (currentBgmId !== null) {
            SoundManager.playBGM();
          } else if (bgmPlaylist.length > 0) {
            playTrackById(bgmPlaylist[0].id, true);
          }
        }
      } else {
        setIsBgmPlaying(false);
        SoundManager.pauseBGM();
        setSfxMutedWithSpeed(false);
      }
    } else {
      setIsBgmPlaying(false);
      SoundManager.pauseBGM();
      setSfxMutedWithSpeed(true);
    }
  };

  const changeSoundMode = (mode: 'bgm' | 'sfx') => {
    setSoundMode(mode);
    if (isSoundOn) {
      if (mode === 'bgm') {
        setSfxMutedWithSpeed(true);
        if (isAutoCycle) {
          setIsBgmPlaying(true);
          if (currentBgmId !== null) {
            SoundManager.playBGM();
          } else if (bgmPlaylist.length > 0) {
            playTrackById(bgmPlaylist[0].id, true);
          }
        }
      } else {
        setIsBgmPlaying(false);
        SoundManager.pauseBGM();
        setSfxMutedWithSpeed(false);
      }
    }
  };

  const toggleBgmFromPlayer = () => {
    if (isBgmPlaying) {
      setIsBgmPlaying(false);
      SoundManager.pauseBGM();
      setIsSoundOn(false);
      setIsAutoCycle(false);
    } else {
      setIsBgmPlaying(true);
      setIsSoundOn(true);
      setSoundMode('bgm');
      setIsAutoCycle(true);
      if (!isSfxMuted) setSfxMutedWithSpeed(true);
      
      if (currentBgmId !== null) {
        SoundManager.playBGM();
      } else if (bgmPlaylist.length > 0) {
        playTrackById(bgmPlaylist[0].id, true);
      }
    }
  };

  const stopBgm = () => {
    SoundManager.stopBGM();
    setIsBgmPlaying(false);
    setIsSoundOn(false);
    setIsAutoCycle(false);
  };

  const playPreviousTrack = () => {
    if (!currentBgmId || bgmPlaylist.length === 0) return;
    const currentIndex = bgmPlaylist.findIndex(t => t.id === currentBgmId);
    if (currentIndex > 0) {
      playTrackById(bgmPlaylist[currentIndex - 1].id);
    } else {
      playTrackById(bgmPlaylist[bgmPlaylist.length - 1].id);
    }
  };

  const playNextTrack = () => {
    if (!currentBgmId || bgmPlaylist.length === 0) return;
    const currentIndex = bgmPlaylist.findIndex(t => t.id === currentBgmId);
    if (currentIndex < bgmPlaylist.length - 1) {
      playTrackById(bgmPlaylist[currentIndex + 1].id);
    } else {
      playTrackById(bgmPlaylist[0].id);
    }
  };


  const people = useMemo(() => {
    const items = [];
    const spacing = formationSpacing;
    const level = formationLevel;

    if (formationType === 'square') {
      if (level === 1) {
        items.push({ id: 0, position: [0, 0, 0] });
      } else if (level === 2) {
        items.push({ id: 0, position: [-spacing/2, 0, 0] });
        items.push({ id: 1, position: [spacing/2, 0, 0] });
      } else {
        const side = level;
        const total = side * side;
        for (let i = 0; i < total; i++) {
          const row = Math.floor(i / side);
          const col = i % side;
          const x = (col - (side - 1) / 2) * spacing;
          const z = (row - (side - 1) / 2) * spacing;
          items.push({ id: i, position: [x, 0, z] as [number, number, number] });
        }
      }
    } else if (formationType === 'circle') {
      if (level === 1) {
        items.push({ id: 0, position: [0, 0, 0] });
      } else if (level === 2) {
        items.push({ id: 0, position: [-spacing/2, 0, 0] });
        items.push({ id: 1, position: [spacing/2, 0, 0] });
      } else {
        items.push({ id: 0, position: [0, 0, 0] });
        let currentId = 1;
        const numRings = Math.max(1, level - 2);
        for (let ring = 1; ring <= numRings; ring++) {
          const ringCount = ring * 6;
          const radius = ring * spacing * 0.9;
          for (let i = 0; i < ringCount; i++) {
            const theta = i * (Math.PI * 2) / ringCount;
            items.push({ 
              id: currentId++, 
              position: [Math.cos(theta) * radius, 0, Math.sin(theta) * radius] 
            });
          }
        }
      }
    } else if (formationType === 'triangle') {
      if (level === 1) {
        items.push({ id: 0, position: [0, 0, 0] });
      } else if (level === 2) {
        items.push({ id: 0, position: [-spacing/2, 0, 0] });
        items.push({ id: 1, position: [spacing/2, 0, 0] });
      } else {
        let currentId = 0;
        const totalRows = Math.floor(level * 1.2);
        const rowSpacing = spacing * Math.sqrt(3) / 2;
        for (let row = 0; row < totalRows; row++) {
          const cols = row + 1;
          const z = (row - (totalRows - 1) / 2) * rowSpacing;
          for (let col = 0; col < cols; col++) {
            const x = (col - (cols - 1) / 2) * spacing;
            items.push({ id: currentId++, position: [x, 0, z] as [number, number, number] });
          }
        }
      }
    } else if (formationType === 'cross') {
      if (level === 1) {
        items.push({ id: 0, position: [0, 0, 0] });
      } else if (level === 2) {
        items.push({ id: 0, position: [-spacing/2, 0, 0] });
        items.push({ id: 1, position: [spacing/2, 0, 0] });
      } else {
        items.push({ id: 0, position: [0, 0, 0] });
        let currentId = 1;
        const arms = 4;
        const distLimit = Math.floor(level * 1.5);
        for (let dist = 1; dist < distLimit; dist++) {
          for (let dir = 0; dir < arms; dir++) {
            const theta = dir * (Math.PI / 2);
            items.push({ 
              id: currentId++, 
              position: [
                Math.round(Math.cos(theta)) * dist * spacing, 
                0, 
                Math.round(Math.sin(theta)) * dist * spacing
              ] as [number, number, number]
            });
          }
        }
      }
    } else if (formationType === 'ring') {
      if (level === 1) {
        items.push({ id: 0, position: [0, 0, 0] });
      } else {
        const radius = (level - 1) * spacing * 1.2;
        const targetCount = (level - 1) * 8;
        for (let i = 0; i < targetCount; i++) {
          const theta = i * (Math.PI * 2) / targetCount;
          items.push({ 
            id: i, 
            position: [Math.cos(theta) * radius, 0, Math.sin(theta) * radius] 
          });
        }
      }
    } else if (formationType === 'spiral') {
      items.push({ id: 0, position: [0, 0, 0] });
      const targetCount = level * level + 1;
      let currentTheta = 0;
      for (let i = 1; i < targetCount; i++) {
        const r = Math.sqrt(i) * spacing * 0.55;
        currentTheta += spacing * 0.85 / r;
        items.push({ 
          id: i, 
          position: [Math.cos(currentTheta) * r, 0, Math.sin(currentTheta) * r] 
        });
      }
    }

    return items;
  }, [formationLevel, formationType, formationSpacing]);

  const highlightClasses = {
    text: appTheme === 'peper' ? 'text-[#D95430]' : (appTheme === 'mocha' ? 'text-[#C48A58]' : (appTheme === 'light' ? 'text-[#009FBA]' : 'text-[#05DFFC]')),
    bg: appTheme === 'peper' ? 'bg-[#D95430]' : (appTheme === 'mocha' ? 'bg-[#C48A58]' : (appTheme === 'light' ? 'bg-[#009FBA]' : 'bg-[#05DFFC]')),
    bgMuted: appTheme === 'peper' ? 'bg-[#D95430]/15' : (appTheme === 'mocha' ? 'bg-[#C48A58]/20' : (appTheme === 'light' ? 'bg-[#009FBA]/10' : 'bg-[#05DFFC]/10')),
    border: appTheme === 'peper' ? 'border-[#D95430]' : (appTheme === 'mocha' ? 'border-[#C48A58]' : (appTheme === 'light' ? 'border-[#009FBA]' : 'border-[#05DFFC]')),
    accent: appTheme === 'peper' ? 'accent-[#D95430]' : (appTheme === 'mocha' ? 'accent-[#C48A58]' : (appTheme === 'light' ? 'accent-[#009FBA]' : 'accent-[#05DFFC]')),
  };

  const renderSectionCard = (
    tab: 'visual' | 'sound',
    id: string,
    title: string,
    isOpen: boolean,
    setIsOpen: (val: boolean) => void,
    badge: React.ReactNode,
    children: React.ReactNode
  ) => {
    const isOver = dragOverSectionId === id;
    const isDraggingThis = draggingSection?.id === id;

    return (
      <div
        key={id}
        onDragOver={(e) => handleSectionDragOver(e, id)}
        onDragLeave={(e) => handleSectionDragLeave(e, id)}
        onDrop={(e) => handleSectionDrop(e, tab, id)}
        className={`p-3 flex flex-col gap-3 relative transition-all rounded-none ${
          isOver ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] shadow-lg' : ''
        } ${isDraggingThis ? 'opacity-40' : ''} ${
          appTheme === 'light' 
            ? 'bg-white border border-gray-200 shadow-sm' 
            : (appTheme === 'black' ? 'bg-[#1a1a1e]/40 border border-[#4A4A52]' : 'bg-[#1a1a1e]/40 border border-[#323238]')
        }`}
      >
        <div className={`flex items-center justify-between w-full ${isOpen ? 'border-b pb-2 mb-1' : ''} ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')}`}>
          <div className="section-title-wrapper flex items-center gap-1.5 min-w-0">
            <div
              draggable
              onDragStart={(e) => handleSectionDragStart(e, tab, id)}
              onDragEnd={handleSectionDragEnd}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-500 hover:text-white transition-colors flex-shrink-0"
              title={t('Drag to reorder')}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <div className={`w-1 h-3 transition-colors flex-shrink-0 ${isOpen ? highlightClasses.bg : 'bg-gray-600'}`} />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="section-title-button flex items-center gap-2 text-left min-w-0 cursor-pointer group !bg-transparent !border-none !shadow-none p-0"
            >
              <span className={`text-[10px] font-black tracking-widest uppercase transition-colors truncate ${
                isOpen 
                  ? (appTheme === 'light' ? 'text-gray-800' : (appTheme === 'peper' ? 'text-[#3A2F24]' : 'text-[#E1E1E6]')) 
                  : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-600 group-hover:text-gray-800' : 'text-gray-500 group-hover:text-gray-400')
              }`}>
                {title}
              </span>
              {badge}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-5 h-5 border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
              appTheme === 'light' 
                ? 'bg-white border-gray-400 hover:border-gray-500' 
                : (appTheme === 'peper' 
                  ? 'bg-white border-[#D1C7B4] hover:border-[#8C7B68]' 
                  : 'bg-[#1a1a1e] border-[#323238] hover:border-gray-400')
            } ${isOpen ? highlightClasses.border : ''}`}
          >
            {isOpen ? <Minus className={`w-3 h-3 ${highlightClasses.text}`} /> : <Plus className="w-3 h-3 text-gray-500" />}
          </button>
        </div>

        {isOpen && (
          <div className="flex flex-col gap-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  const renderPoseSettingCard = () => {
    return renderSectionCard(
      'visual',
      'pose-setting',
      t('POSE SETTING'),
      isPoseSettingOpen,
      setIsPoseSettingOpen,
      !isPoseSettingOpen && isAutoCycle ? (
        <span className="text-[8px] font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 border border-[var(--accent)]/30 leading-none">
          AUTO
        </span>
      ) : null,
      (
        <div className="flex flex-col gap-3">
          {/* Auto Cycle Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAutoCycle ? <Play className={`w-4 h-4 ${highlightClasses.text} opacity-80`} /> : <Pause className="w-4 h-4 text-gray-500" />}
              <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('Auto Cycle')}</span>
            </div>
            
            <button 
              onClick={() => {
                const nextState = !isAutoCycle;
                setIsAutoCycle(nextState);
                
                if (nextState) {
                  if (isSoundOn) {
                    if (soundMode === 'bgm') {
                      setIsBgmPlaying(true);
                      setSfxMutedWithSpeed(true);
                      if (currentBgmId !== null) {
                        SoundManager.playBGM();
                      } else if (bgmPlaylist.length > 0) {
                        playTrackById(bgmPlaylist[0].id, true);
                      }
                    } else {
                      setIsBgmPlaying(false);
                      SoundManager.pauseBGM();
                      setSfxMutedWithSpeed(false);
                    }
                  }
                } else {
                  if (isSoundOn && soundMode === 'bgm') {
                    setIsBgmPlaying(false);
                    SoundManager.pauseBGM();
                  }
                  setSfxMutedWithSpeed(true);
                  setIsAutoCamera(false);
                  setIsAutoFormation(false);
                  setIsSlowRotate(false);
                  if (orbitRef.current) {
                    orbitRef.current.autoRotate = false;
                  }
                }
              }}
              className={`w-10 h-5 transition-colors relative border ${isAutoCycle ? `bg-transparent ${highlightClasses.border}` : (appTheme === 'mocha' ? 'border-[#C8BCAB] bg-[#DDD4C5]' : (appTheme === 'light' ? 'border-gray-400 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]'))}`}
            >
              <div className={`absolute top-[1px] w-4 h-4 transition-all ${isAutoCycle ? `${highlightClasses.bg} right-[1px]` : (appTheme === 'mocha' ? 'bg-[#7C6C5C] left-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]'))}`} />
            </button>
          </div>
          
          <div className="pt-1">
            <div className={`flex items-center justify-between mb-3 pb-3 border-b ${appTheme === 'mocha' ? 'border-[#C8BCAB]' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')}`}>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className={`text-[8px] font-bold uppercase tracking-widest leading-none ${appTheme === 'mocha' ? 'text-[#483A2E]' : (appTheme === 'red' ? 'text-white' : 'text-gray-500')}`}>{t('SOUND')}</span>
                  <button 
                    onClick={toggleSound}
                    className={`flex items-center justify-center gap-1.5 w-[84px] py-1 border transition-colors cursor-pointer ${
                      isSoundOn 
                        ? (isAutoCycle ? `bg-transparent ${highlightClasses.border} ${highlightClasses.text}` : (appTheme === 'mocha' ? 'bg-[#1F1813] border-[#524032] text-[#EDE4D3]' : (appTheme === 'light' ? 'bg-transparent border-gray-400 text-gray-800' : 'bg-transparent border-gray-300 text-gray-200')))
                        : (appTheme === 'mocha' ? 'border-[#C8BCAB] bg-[#DDD4C5] text-[#7C6C5C]' : 'border-gray-500 bg-[#1a1a1e] text-gray-500')
                    }`}
                  >
                    {isSoundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    <span className="text-[9px] uppercase font-bold">{isSoundOn ? t('ON') : t('OFF')}</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={`text-[8px] font-bold uppercase tracking-widest leading-none ${appTheme === 'mocha' ? 'text-[#483A2E]' : (appTheme === 'red' ? 'text-white' : 'text-gray-500')}`}>{t('MODE')}</span>
                  <div className={`flex items-center h-[26px] w-[96px] border p-0.5 ${appTheme === 'mocha' ? 'bg-[#1F1813] border-[#524032]' : 'bg-[#1a1a1e] border-[#323238]'}`}>
                    <button
                      onClick={() => changeSoundMode('bgm')}
                      className={`flex-1 flex items-center justify-center h-full transition-colors text-[9px] font-bold tracking-widest cursor-pointer ${
                        soundMode === 'bgm' 
                          ? (appTheme === 'mocha' ? 'bg-[#EDE4D3] text-[#1F1813]' : 'bg-[#323238] text-white')
                          : (appTheme === 'mocha' ? 'text-[#A59281] hover:text-[#EDE4D3]' : 'text-gray-500 hover:text-gray-300')
                      }`}
                    >
                      BGM
                    </button>
                    <button
                      onClick={() => changeSoundMode('sfx')}
                      className={`flex-1 flex items-center justify-center h-full transition-colors text-[9px] font-bold tracking-widest cursor-pointer ${
                        soundMode === 'sfx' 
                          ? (appTheme === 'mocha' ? 'bg-[#EDE4D3] text-[#1F1813]' : 'bg-[#323238] text-white')
                          : (appTheme === 'mocha' ? 'text-[#A59281] hover:text-[#EDE4D3]' : 'text-gray-500 hover:text-gray-300')
                      }`}
                    >
                      SFX
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] font-bold text-gray-500 uppercase">{t('Cycle Interval')}</label>
              <span className={`text-[9px] font-mono font-bold ${isAutoCycle ? `${highlightClasses.text} ${highlightClasses.bgMuted}` : 'text-gray-500 bg-[#1a1a1e]'} px-1.5 py-0.5 transition-colors`}>{(cycleSpeed / 1000).toFixed(2)}s</span>
            </div>
            <input 
              type="range" 
              min={!isSfxMuted ? "50" : "0"} 
              max="100" 
              step="1" 
              value={Math.round((Math.log(Math.max(100, Math.min(10000, cycleSpeed)) / 100) / Math.log(10000 / 100)) * 100)} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const rawSpeed = 100 * Math.exp((val / 100) * Math.log(10000 / 100));
                let finalSpeed = rawSpeed;
                if (rawSpeed < 1000) finalSpeed = Math.round(rawSpeed / 50) * 50;
                else finalSpeed = Math.round(rawSpeed / 100) * 100;
                
                let minSpeed = 100;
                if (!isSfxMuted) minSpeed = 1000;
                setCycleSpeed(Math.max(minSpeed, Math.min(10000, finalSpeed)));
              }}
              className={`w-full h-1 appearance-none cursor-pointer mb-4 ${
                appTheme === 'mocha' 
                  ? 'bg-[#A3917F] accent-[#C48A58]' 
                  : (appTheme === 'light' ? 'bg-gray-300 accent-[#009FBA]' : `${appTheme === 'black' ? 'bg-[#4A4A52]' : 'bg-[#2A2A30]'} ${highlightClasses.accent}`)
              }`}
            />

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${isRandomCycle ? highlightClasses.text : (appTheme === 'mocha' ? 'text-[#7C6856]' : 'text-gray-500')}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' ? 'text-gray-600' : 'text-gray-400')}`}>{t('Random Pose')}</span>
              </div>
              <button 
                onClick={() => setIsRandomCycle(!isRandomCycle)}
                className={`w-10 h-5 transition-colors relative border ${
                  isRandomCycle 
                    ? `bg-transparent ${highlightClasses.border}` 
                    : (appTheme === 'mocha' 
                        ? 'border-[#7C6856] bg-[#C8BEAE]' 
                        : (appTheme === 'light' ? 'border-gray-400 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]'))
                }`}
              >
                <div className={`absolute top-[1px] w-4 h-4 transition-all ${
                  isRandomCycle 
                    ? `${highlightClasses.bg} right-[1px]` 
                    : (appTheme === 'mocha' 
                        ? 'bg-[#6E5D4E] left-[1px]' 
                        : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]'))
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Camera className={`w-3.5 h-3.5 ${isSlowRotate ? highlightClasses.text : (appTheme === 'mocha' ? 'text-[#7C6856]' : 'text-gray-500')}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' ? 'text-gray-600' : 'text-gray-400')}`}>{t('Auto Turn')}</span>
              </div>
              <button 
                onClick={() => {
                  const next = !isSlowRotate;
                  setIsSlowRotate(next);
                  if (orbitRef.current) {
                    orbitRef.current.autoRotate = next;
                    orbitRef.current.autoRotateSpeed = rotateSpeed;
                  }
                }}
                className={`w-10 h-5 transition-colors relative border ${
                  isSlowRotate 
                    ? `bg-transparent ${highlightClasses.border}` 
                    : (appTheme === 'mocha' 
                        ? 'border-[#7C6856] bg-[#C8BEAE]' 
                        : (appTheme === 'light' ? 'border-gray-400 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]'))
                }`}
              >
                <div className={`absolute top-[1px] w-4 h-4 transition-all ${
                  isSlowRotate 
                    ? `${highlightClasses.bg} right-[1px]` 
                    : (appTheme === 'mocha' 
                        ? 'bg-[#6E5D4E] left-[1px]' 
                        : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]'))
                }`} />
              </button>
            </div>

            {isSlowRotate && (
              <div className="pt-2 pb-1 space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">{t('Turn Speed')}</label>
                  <span className={`text-[9px] font-mono font-bold ${highlightClasses.text} ${appTheme === 'mocha' ? 'bg-[#EDE4D3] border-[#7C6856]' : (appTheme === 'peper' || appTheme === 'light' ? 'bg-white border-gray-300' : 'bg-[#1a1a1e] border-[#323238]')} border px-1.5 py-0.5 leading-none transition-colors`}>
                    {rotateSpeed.toFixed(1)}x
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="10" 
                  step="0.1" 
                  value={rotateSpeed} 
                  onChange={(e) => {
                    const speed = parseFloat(e.target.value);
                    setRotateSpeed(speed);
                    if (orbitRef.current) {
                      orbitRef.current.autoRotateSpeed = speed;
                    }
                  }}
                  className={`w-full h-1 appearance-none cursor-pointer ${
                    appTheme === 'mocha' 
                      ? 'bg-[#A3917F] accent-[#C48A58]' 
                      : (appTheme === 'light' ? 'bg-gray-300 accent-[#009FBA]' : `${appTheme === 'black' ? 'bg-[#4A4A52]' : 'bg-[#2A2A30]'} ${highlightClasses.accent}`)
                  }`}
                />
              </div>
            )}

            {/* Collapsible Advanced Options Sub-section */}
            <div className={`mt-3 pt-3 border-t ${appTheme === 'mocha' ? 'border-[#7C6856]' : (appTheme === 'light' ? 'border-gray-200' : (appTheme === 'peper' ? 'border-[#D1C7B4]' : 'border-[#323238]/50'))}`}>
              <button 
                onClick={() => setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen)}
                className="flex items-center justify-between w-full group py-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1 h-3 transition-colors ${isAdvancedOptionsOpen ? highlightClasses.bg : (appTheme === 'mocha' ? 'bg-[#7C6856]' : 'bg-gray-600')}`}></div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase transition-colors ${
                    isAdvancedOptionsOpen 
                      ? (appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' ? 'text-gray-800' : (appTheme === 'peper' ? 'text-[#3A2F24]' : 'text-gray-200'))) 
                      : (appTheme === 'mocha' ? 'text-[#6E5D4E] group-hover:text-[#382B20]' : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-600 group-hover:text-gray-800' : 'text-gray-500 group-hover:text-gray-400'))
                  }`}>
                    {t('Advanced Cycle Options')}
                  </span>
                </div>
                <div className={`w-5 h-5 border flex items-center justify-center transition-colors flex-shrink-0 ${
                  appTheme === 'mocha'
                    ? 'bg-[#EDE4D3] border-[#7C6856] group-hover:border-[#382B20]'
                    : (appTheme === 'light' 
                      ? 'bg-white border-gray-400 group-hover:border-gray-500' 
                      : (appTheme === 'peper' 
                        ? 'bg-white border-[#D1C7B4] group-hover:border-[#8C7B68]' 
                        : 'bg-[#1a1a1e] border-[#323238] group-hover:border-gray-400'))
                } ${isAdvancedOptionsOpen ? highlightClasses.border : ''}`}>
                  {isAdvancedOptionsOpen ? <Minus className={`w-3 h-3 ${highlightClasses.text}`} /> : <Plus className="w-3 h-3 text-gray-500" />}
                </div>
              </button>

              {isAdvancedOptionsOpen && (
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-3.5 h-3.5 ${isAutoFormation ? highlightClasses.text : (appTheme === 'mocha' ? 'text-[#7C6856]' : 'text-gray-500')}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-700' : 'text-gray-400')}`}>{t('Auto Format Change')}</span>
                    </div>
                    <button 
                      onClick={() => setIsAutoFormation(!isAutoFormation)}
                      className={`w-10 h-5 transition-colors relative border ${
                        isAutoFormation 
                          ? `bg-transparent ${highlightClasses.border}` 
                          : (appTheme === 'mocha' 
                              ? 'border-[#7C6856] bg-[#C8BEAE]' 
                              : (appTheme === 'light' ? 'border-gray-400 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]'))
                      }`}
                    >
                      <div className={`absolute top-[1px] w-4 h-4 transition-all ${
                        isAutoFormation 
                          ? `${highlightClasses.bg} right-[1px]` 
                          : (appTheme === 'mocha' 
                              ? 'bg-[#6E5D4E] left-[1px]' 
                              : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]'))
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className={`w-3.5 h-3.5 ${isAutoCamera ? highlightClasses.text : (appTheme === 'mocha' ? 'text-[#7C6856]' : 'text-gray-500')}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-700' : 'text-gray-400')}`}>{t('Cinematic View')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isAutoCamera && (
                        <button 
                          onClick={() => {
                            setAutoCameraSpeed(1);
                            setAutoCameraMinHeight(-2);
                            setAutoCameraMaxHeight(10);
                            setAutoCameraMinDistance(6);
                            setAutoCameraMaxDistance(20);
                            setAutoCameraReverse(false);
                          }}
                          className={`${appTheme === 'mocha' ? 'text-[#7C6856] hover:text-[#1F1813]' : 'text-gray-500 hover:text-white'} transition-colors`}
                          title={t('Reset Camera')}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => setIsAutoCamera(!isAutoCamera)}
                        className={`w-10 h-5 transition-colors relative border ${
                          isAutoCamera 
                            ? `bg-transparent ${highlightClasses.border}` 
                            : (appTheme === 'mocha' 
                                ? 'border-[#7C6856] bg-[#C8BEAE]' 
                                : (appTheme === 'light' ? 'border-gray-400 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]'))
                        }`}
                      >
                        <div className={`absolute top-[1px] w-4 h-4 transition-all ${
                          isAutoCamera 
                            ? `${highlightClasses.bg} right-[1px]` 
                            : (appTheme === 'mocha' 
                                ? 'bg-[#6E5D4E] left-[1px]' 
                                : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]'))
                        }`} />
                      </button>
                    </div>
                  </div>

                  {isAutoCamera && (
                    <div className="pt-2 pb-2 space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">{t('Camera Intensity')}</label>
                          <span className={`cinematic-badge text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                            appTheme === 'mocha'
                              ? 'text-[#2C1F16] bg-[#C8BEAE] border-[#7C6856]'
                              : `${highlightClasses.text} ${highlightClasses.bgMuted} ${highlightClasses.border}/30`
                          }`}>
                            {autoCameraSpeed.toFixed(1)}x
                          </span>
                        </div>
                        <input 
                          type="range" min="0.1" max="10" step="0.1" value={autoCameraSpeed} 
                          onChange={(e) => setAutoCameraSpeed(parseFloat(e.target.value))}
                          className={`cinematic-slider w-full h-1 appearance-none cursor-pointer ${
                            appTheme === 'mocha'
                              ? 'bg-[#A3917F] accent-[#2C1F16]'
                              : (appTheme === 'light' ? `bg-gray-300 ${highlightClasses.accent}` : `bg-gray-700 ${highlightClasses.accent}`)
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">{t('Camera Height (Min / Max)')}</label>
                          <span className={`cinematic-badge text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                            appTheme === 'mocha'
                              ? 'text-[#2C1F16] bg-[#C8BEAE] border-[#7C6856]'
                              : `${highlightClasses.text} ${highlightClasses.bgMuted} ${highlightClasses.border}/30`
                          }`}>
                            {autoCameraMinHeight.toFixed(1)} / {autoCameraMaxHeight.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="range" min="-5" max="10" step="0.5" value={autoCameraMinHeight} 
                            onChange={(e) => setAutoCameraMinHeight(parseFloat(e.target.value))}
                            className={`cinematic-slider w-full h-1 appearance-none cursor-pointer ${
                              appTheme === 'mocha'
                                ? 'bg-[#A3917F] accent-[#2C1F16]'
                                : (appTheme === 'light' ? `bg-gray-300 ${highlightClasses.accent}` : `bg-gray-700 ${highlightClasses.accent}`)
                            }`}
                          />
                          <input 
                            type="range" min="0" max="20" step="0.5" value={autoCameraMaxHeight} 
                            onChange={(e) => setAutoCameraMaxHeight(parseFloat(e.target.value))}
                            className={`cinematic-slider w-full h-1 appearance-none cursor-pointer ${
                              appTheme === 'mocha'
                                ? 'bg-[#A3917F] accent-[#2C1F16]'
                                : (appTheme === 'light' ? `bg-gray-300 ${highlightClasses.accent}` : `bg-gray-700 ${highlightClasses.accent}`)
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">{t('Camera Zoom (Min / Max)')}</label>
                          <span className={`cinematic-badge text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                            appTheme === 'mocha'
                              ? 'text-[#2C1F16] bg-[#C8BEAE] border-[#7C6856]'
                              : `${highlightClasses.text} ${highlightClasses.bgMuted} ${highlightClasses.border}/30`
                          }`}>
                            {autoCameraMinDistance.toFixed(1)} / {autoCameraMaxDistance.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="range" min="3" max="20" step="1" value={autoCameraMinDistance} 
                            onChange={(e) => setAutoCameraMinDistance(parseFloat(e.target.value))}
                            className={`cinematic-slider w-full h-1 appearance-none cursor-pointer ${
                              appTheme === 'mocha'
                                ? 'bg-[#A3917F] accent-[#2C1F16]'
                                : (appTheme === 'light' ? `bg-gray-300 ${highlightClasses.accent}` : `bg-gray-700 ${highlightClasses.accent}`)
                            }`}
                          />
                          <input 
                            type="range" min="5" max="50" step="1" value={autoCameraMaxDistance} 
                            onChange={(e) => setAutoCameraMaxDistance(parseFloat(e.target.value))}
                            className={`cinematic-slider w-full h-1 appearance-none cursor-pointer ${
                              appTheme === 'mocha'
                                ? 'bg-[#A3917F] accent-[#2C1F16]'
                                : (appTheme === 'light' ? `bg-gray-300 ${highlightClasses.accent}` : `bg-gray-700 ${highlightClasses.accent}`)
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">{t('Reverse Rotation')}</label>
                        <button 
                          onClick={() => setAutoCameraReverse(!autoCameraReverse)}
                          className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                            autoCameraReverse 
                              ? (appTheme === 'mocha' ? 'bg-[#2C1F16]' : highlightClasses.bg)
                              : (appTheme === 'mocha' ? 'bg-[#C8BEAE] border border-[#7C6856]' : (appTheme === 'light' ? 'bg-gray-300' : 'bg-[#1a1a1e] border border-gray-600'))
                          }`}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                            autoCameraReverse 
                              ? 'bg-white right-0.5' 
                              : (appTheme === 'mocha' ? 'bg-[#6E5D4E] left-0.5' : 'bg-gray-500 left-0.5')
                          }`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    );
  };

  const renderPoseLibraryCard = () => {
    return renderSectionCard(
      'visual',
      'pose-library',
      t('POSE LIBRARY'),
      isPoseLibraryOpen,
      setIsPoseLibraryOpen,
      !isPoseLibraryOpen ? (
        <span 
          className="inline-block w-[68px] text-center text-[8px] font-mono font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 border border-white/10 leading-none truncate shrink-0"
          title={poses.find(p => p.id === poseId)?.name || 'POSE'}
        >
          {poses.find(p => p.id === poseId)?.name || 'POSE'}
        </span>
      ) : null,
      (
        <>
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
              {poses.map((pose, idx) => {
                const isActive = poseId === pose.id && !isAutoCycle;
                const isCustom = pose.id.startsWith('custom-');
                return (
                  <div
                    key={pose.id}
                    onClick={() => handlePoseChange(pose.id)}
                    className={`text-left p-2 border transition-all flex flex-col justify-between h-[45px] relative overflow-hidden group cursor-pointer ${
                      isActive 
                       ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg z-10' 
                       : 'bg-[#2A2A30] border-[#323238] hover:border-gray-500 text-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full relative z-10">
                      <span className={`font-bold text-[9px] truncate uppercase tracking-tighter leading-tight max-w-[70%] ${isActive || appTheme === 'red' ? 'text-white' : 'text-gray-500'}`}>{pose.name}</span>
                      {isCustom && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(pose); }}
                            className="p-1 hover:bg-white/20 cursor-pointer"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={(e) => deletePose(pose.id, e)} 
                            className="p-1 hover:bg-red-500/50 cursor-pointer text-white"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono mt-1 ${isActive ? 'text-white/40' : (appTheme === 'light' ? 'text-gray-500' : 'text-[#878e9b]')}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {isActive && (
                      <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 -3xl -mr-2 -mt-2" />
                    )}
                    {!isActive && poseId === pose.id && isAutoCycle && (
                      <div className="absolute inset-0 border border-[var(--accent)]/50 pointer-events-none" />
                    )}
                  </div>
                );
              })}
              <button
                onClick={(e) => { e.stopPropagation(); startEditing(); }}
                className={`flex items-center justify-center gap-1.5 h-[45px] text-[10px] font-bold uppercase tracking-widest border border-dashed transition-colors ${appTheme === 'light' ? 'border-gray-400 text-gray-500 hover:border-[var(--accent)] hover:text-[var(--accent)] bg-white/50' : 'border-[#323238] text-gray-500 hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[#1E1E22] hover:bg-[var(--accent)]/5'}`}
              >
                <Plus className="w-3.5 h-3.5" /> {t('New Set')}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[var(--accent)]/10 border border-[#323238]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-bold flex items-center gap-2">
                  <SlidersHorizontal className="w-3 h-3" /> {editingPoseId ? 'Edit Pose' : 'New Pose'}
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="text-[10px] text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={saveCustomPose} className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Save className="w-3 h-3" /> SAVE
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-3">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block font-bold mb-1">Pose Name</label>
                  <input 
                    type="text" 
                    value={editPoseName} 
                    onChange={(e) => setEditPoseName(e.target.value)} 
                    className="w-full bg-[#121214] border border-[#323238] p-1.5 text-xs text-white uppercase font-bold outline-none focus:border-[var(--accent)]"
                    placeholder="Enter pose name..."
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-black/20 border border-[#323238]">
                  <div className="flex items-center gap-2">
                    <Layers className={`w-3 h-3 ${isSymmetric ? 'text-[var(--accent)]' : 'text-gray-500'}`} />
                    <span className="text-[10px] uppercase font-bold text-gray-400">{t('Mirror Symmetry')}</span>
                  </div>
                  <button 
                    onClick={() => setIsSymmetric(!isSymmetric)}
                    className={`w-8 h-4 transition-colors relative ${isSymmetric ? 'bg-[var(--accent)]' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white transition-all ${isSymmetric ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setEditPose({
                      head: [0, 0, 0],
                      torso: [0, 0, 0],
                      arm_l_upper: [0, 0, 0],
                      arm_l_lower: [0, 0, 0],
                      arm_r_upper: [0, 0, 0],
                      arm_r_lower: [0, 0, 0],
                      leg_l_upper: [0, 0, 0],
                      leg_l_lower: [0, 0, 0],
                      leg_r_upper: [0, 0, 0],
                      leg_r_lower: [0, 0, 0],
                    });
                  }}
                  className="w-full py-1.5 bg-[#2A2A30] hover:bg-[#323238] border border-[#323238] text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
                >
                  All Reset
                </button>
              </div>
              
              <div className="space-y-3 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                {[
                  { id: 'torso', name: 'Body Tilt', axis: 0 },
                  { id: 'torso', name: 'Body Twist', axis: 1 },
                  { id: 'head', name: 'Head Turn', axis: 0 },
                  { id: 'arm_l_upper', name: 'L-Arm Upper', axis: 0 },
                  { id: 'arm_l_lower', name: 'L-Elbow', axis: 0 },
                  { id: 'arm_l_upper', name: 'L-Arm Spread', axis: 2 },
                  { id: 'arm_r_upper', name: 'R-Arm Upper', axis: 0 },
                  { id: 'arm_r_lower', name: 'R-Elbow', axis: 0 },
                  { id: 'arm_r_upper', name: 'R-Arm Spread', axis: 2 },
                  { id: 'leg_l_upper', name: 'L-Leg Upper', axis: 0 },
                  { id: 'leg_l_lower', name: 'L-Knee', axis: 0 },
                  { id: 'leg_l_upper', name: 'L-Leg Spread', axis: 2 },
                  { id: 'leg_r_upper', name: 'R-Leg Upper', axis: 0 },
                  { id: 'leg_r_lower', name: 'R-Knee', axis: 0 },
                  { id: 'leg_r_upper', name: 'R-Leg Spread', axis: 2 }
                ].map((part: any, pIdx) => {
                  const rawVal = editPose[part.id as keyof PoseAngles]?.[part.axis] || 0;
                  const degVal = Math.round(rawVal * 180 / Math.PI);
                  return (
                    <div key={`${part.id}-${part.axis}-${pIdx}`}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] text-gray-500 uppercase block font-bold">{part.name}</label>
                          <span className={`text-[9px] font-mono font-bold px-1 ${degVal === 0 ? 'text-gray-500 bg-gray-500/10' : 'text-[var(--accent)] bg-[var(--accent)]/10'}`}>
                            {degVal > 0 ? '+' : ''}{degVal}°
                          </span>
                        </div>
                        <button 
                          onClick={() => updateEditPart(part.id as any, part.axis, 0)}
                          className="text-[8px] text-gray-500 hover:text-[var(--accent)] transition-colors font-bold uppercase"
                        >
                          Reset
                        </button>
                      </div>
                      <input 
                        type="range" min="-3.14" max="3.14" step="0.1" 
                        value={rawVal}
                        onChange={(e) => updateEditPart(part.id as any, part.axis, parseFloat(e.target.value))}
                        className={`w-full h-1 bg-[#2A2A30] appearance-none cursor-pointer ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )
    );
  };

  const renderColorsCard = () => {
    return renderSectionCard(
      'visual',
      'colors',
      t('COLORS'),
      isColorSettingsOpen,
      setIsColorSettingsOpen,
      !isColorSettingsOpen ? (
        <div className="flex items-center gap-1.5">
          <PresetColorBadge chrColor={characterColor} bgColor={customBgColor || '#E5E7EB'} size="sm" />
          <span className="text-[8px] font-mono text-gray-400 truncate max-w-[80px]">{activePreset.name}</span>
        </div>
      ) : null,
      (
        <div className="flex flex-col gap-3">
          {/* Preset & Custom Set Selector */}
          <div className={`p-2.5 border flex flex-col gap-2 ${
            appTheme === 'mocha'
              ? 'bg-[#E3D9C9] border-[#9E8C7A] text-[#382B20]'
              : (appTheme === 'light'
                ? 'bg-gray-100 border-gray-200 text-gray-800'
                : (appTheme === 'peper'
                  ? 'bg-[#DDD4C4] border-[#C2B6A2] text-[#3A2F24]'
                  : 'bg-[#1E1E22]/80 border-[#323238]'))
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${
                appTheme === 'mocha' ? 'text-[#5C4C3E]' : (appTheme === 'light' ? 'text-gray-700' : (appTheme === 'peper' ? 'text-[#5F5241]' : 'text-gray-400'))
              }`}>
                {t('Color Set')}
              </span>
              {isModifiedFromPreset && (
                <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/30">
                  {t('MODIFIED')}
                </span>
              )}
            </div>

            {/* Set Dropdown / Select Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSidebarPresetDropdownOpen(prev => !prev)}
                className={`w-full py-1.5 px-2 flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase transition-colors border ${
                  appTheme === 'mocha'
                    ? 'bg-[#EDE4D3] hover:bg-[#F5EFE6] border-[#9E8C7A] text-[#382B20]'
                    : (appTheme === 'light'
                      ? 'bg-white hover:bg-gray-50 border-gray-300 text-gray-800'
                      : (appTheme === 'peper'
                        ? 'bg-white hover:bg-[#FAF8F5] border-[#C2B6A2] text-[#3A2F24]'
                        : 'bg-[#121214] hover:bg-[#1a1a1e] border-[#323238] text-white'))
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PresetColorBadge chrColor={characterColor} bgColor={customBgColor || '#E5E7EB'} size="sm" />
                  <span className="truncate">{activePreset.name}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${
                  appTheme === 'mocha' ? 'text-[#7C6856]' : (appTheme === 'light' ? 'text-gray-600' : (appTheme === 'peper' ? 'text-[#73634F]' : 'text-gray-400'))
                } ${isSidebarPresetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSidebarPresetDropdownOpen && (
                <div className={`absolute left-0 right-0 top-full mt-1 border shadow-2xl z-50 py-1 flex flex-col text-[10px] font-mono max-h-56 overflow-y-auto no-scrollbar ${
                  appTheme === 'mocha'
                    ? 'bg-[#EDE4D3] border-[#9E8C7A] text-[#382B20]'
                    : (appTheme === 'light'
                      ? 'bg-white border-gray-300 text-gray-800'
                      : (appTheme === 'peper'
                        ? 'bg-[#EBE4D5] border-[#C2B6A2] text-[#3A2F24]'
                        : 'bg-[#1E1E22] border-[#323238] text-gray-300'))
                }`}>
                  <div className={`px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest border-b ${
                    appTheme === 'mocha'
                      ? 'text-[#5C4C3E] bg-[#DDD3C3] border-[#9E8C7A]'
                      : (appTheme === 'light'
                        ? 'text-gray-600 bg-gray-100 border-gray-200'
                        : (appTheme === 'peper'
                          ? 'text-[#5F5241] bg-[#DDD4C4] border-[#C2B6A2]'
                          : 'text-gray-400 bg-[#121214] border-[#323238]/60'))
                  }`}>
                    ── {t('DEFAULT PRESETS')} ──
                  </div>
                  {DEFAULT_COLOR_PRESETS.map(preset => {
                    const isSelected = activePresetId === preset.id && !isModifiedFromPreset;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyColorPreset(preset)}
                        className={`w-full px-2.5 py-1.5 flex items-center justify-between transition-colors text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-[var(--accent)] text-white font-bold' 
                            : (appTheme === 'mocha'
                              ? 'text-[#382B20] hover:text-[#1F1813] hover:bg-[#DDD3C3]'
                              : (appTheme === 'light'
                                ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                                : (appTheme === 'peper'
                                  ? 'text-[#5F5241] hover:text-[#2B221A] hover:bg-[#DDD4C4]'
                                  : 'text-gray-300 hover:text-white hover:bg-[#323238]')))
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PresetColorBadge chrColor={preset.characterColor} bgColor={preset.bgColor} size="sm" />
                          <span>{preset.name}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}

                  <div className={`px-2.5 py-1 mt-1 text-[8px] font-bold uppercase tracking-widest border-t border-b flex items-center justify-between ${
                    appTheme === 'mocha'
                      ? 'text-[#5C4C3E] bg-[#DDD3C3] border-[#9E8C7A]'
                      : (appTheme === 'light'
                        ? 'text-gray-600 bg-gray-100 border-gray-200'
                        : (appTheme === 'peper'
                          ? 'text-[#5F5241] bg-[#DDD4C4] border-[#C2B6A2]'
                          : 'text-gray-400 bg-[#121214] border-[#323238]/60'))
                  }`}>
                    <span>── {t('CUSTOM SETS')} ──</span>
                    <span className="text-[7px] text-gray-500 font-normal">({customColorPresets.length})</span>
                  </div>

                  {customColorPresets.length === 0 ? (
                    <div className="px-2.5 py-2 text-[9px] text-gray-500 text-center italic">
                      {t('No custom sets registered')}
                    </div>
                  ) : (
                    customColorPresets.map(preset => {
                      const isSelected = activePresetId === preset.id && !isModifiedFromPreset;
                      return (
                        <div
                          key={preset.id}
                          className={`w-full px-2.5 py-1.5 flex items-center justify-between transition-colors text-left group ${
                            isSelected 
                              ? 'bg-[var(--accent)] text-white font-bold' 
                              : (appTheme === 'mocha'
                                ? 'text-[#382B20] hover:text-[#1F1813] hover:bg-[#DDD3C3]'
                                : (appTheme === 'light'
                                  ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                                  : (appTheme === 'peper'
                                    ? 'text-[#5F5241] hover:text-[#2B221A] hover:bg-[#DDD4C4]'
                                    : 'text-gray-300 hover:text-white hover:bg-[#323238]')))
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => applyColorPreset(preset)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <PresetColorBadge chrColor={preset.characterColor} bgColor={preset.bgColor} size="sm" />
                            <span className="truncate">{preset.name}</span>
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                              title={t('Delete custom preset')}
                              className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Preview Details: Character color + Background color */}
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
              <div className={`p-1.5 border flex items-center gap-1.5 ${
                appTheme === 'mocha'
                  ? 'bg-[#EDE4D3] border-[#9E8C7A]'
                  : (appTheme === 'light'
                    ? 'bg-white border-gray-300'
                    : (appTheme === 'peper'
                      ? 'bg-white border-[#C2B6A2]'
                      : 'bg-[#121214] border-[#323238]'))
              }`}>
                <span className="w-3 h-3 border border-[#444] inline-block flex-shrink-0" style={{ backgroundColor: characterColor }} />
                <div className="flex flex-col min-w-0">
                  <span className={`text-[7px] uppercase leading-none ${
                    appTheme === 'mocha' ? 'text-[#7C6856]' : (appTheme === 'light' ? 'text-gray-500' : (appTheme === 'peper' ? 'text-[#8F7F6C]' : 'text-gray-500'))
                  }`}>CHR</span>
                  <span className={`uppercase truncate leading-none mt-0.5 font-bold ${
                    appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' ? 'text-gray-800' : (appTheme === 'peper' ? 'text-[#3A2F24]' : 'text-gray-200'))
                  }`}>{characterColor}</span>
                </div>
              </div>
              <div className={`p-1.5 border flex items-center gap-1.5 ${
                appTheme === 'mocha'
                  ? 'bg-[#EDE4D3] border-[#9E8C7A]'
                  : (appTheme === 'light'
                    ? 'bg-white border-gray-300'
                    : (appTheme === 'peper'
                      ? 'bg-white border-[#C2B6A2]'
                      : 'bg-[#121214] border-[#323238]'))
              }`}>
                <span className="w-3 h-3 border border-[#444] inline-block flex-shrink-0" style={{ backgroundColor: customBgColor || '#E5E7EB' }} />
                <div className="flex flex-col min-w-0">
                  <span className={`text-[7px] uppercase leading-none ${
                    appTheme === 'mocha' ? 'text-[#7C6856]' : (appTheme === 'light' ? 'text-gray-500' : (appTheme === 'peper' ? 'text-[#8F7F6C]' : 'text-gray-500'))
                  }`}>BG</span>
                  <span className={`uppercase truncate leading-none mt-0.5 font-bold ${
                    appTheme === 'mocha' ? 'text-[#382B20]' : (appTheme === 'light' ? 'text-gray-800' : (appTheme === 'peper' ? 'text-[#3A2F24]' : 'text-gray-200'))
                  }`}>{customBgColor || '#E5E7EB'}</span>
                </div>
              </div>
            </div>

            {/* Custom Registration & Overwrite Actions */}
            <div className={`flex flex-col gap-1.5 pt-1 border-t ${
              appTheme === 'mocha'
                ? 'border-[#9E8C7A]'
                : (appTheme === 'light'
                  ? 'border-gray-200'
                  : (appTheme === 'peper'
                    ? 'border-[#C2B6A2]'
                    : 'border-[#323238]/60'))
            }`}>
              {isRegisteringPreset ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newPresetNameInput}
                    onChange={(e) => setNewPresetNameInput(e.target.value)}
                    placeholder={`CUSTOM ${String(customColorPresets.length + 1).padStart(2, '0')}`}
                    className={`flex-1 border px-2 py-1 text-[9px] font-mono uppercase outline-none focus:border-[var(--accent)] ${
                      appTheme === 'mocha'
                        ? 'bg-[#EDE4D3] border-[#9E8C7A] text-[#382B20]'
                        : (appTheme === 'light'
                          ? 'bg-white border-gray-300 text-gray-800'
                          : (appTheme === 'peper'
                            ? 'bg-white border-[#C2B6A2] text-[#3A2F24]'
                            : 'bg-[#121214] border-[#323238] text-white'))
                    }`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRegisterCustomPreset(newPresetNameInput);
                      if (e.key === 'Escape') setIsRegisteringPreset(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRegisterCustomPreset(newPresetNameInput)}
                    className="px-2 py-1 bg-[var(--accent)] text-white text-[9px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    {t('Save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegisteringPreset(false)}
                    className={`px-2 py-1 text-[9px] uppercase transition-colors cursor-pointer ${
                      appTheme === 'mocha'
                        ? 'bg-[#DDD3C3] text-[#5C4C3E] hover:text-[#1F1813]'
                        : (appTheme === 'light'
                          ? 'bg-gray-200 text-gray-700 hover:text-black'
                          : (appTheme === 'peper'
                            ? 'bg-[#EBE4D5] text-[#5F5241] hover:text-[#2B221A]'
                            : 'bg-[#25252B] text-gray-400 hover:text-white'))
                    }`}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsRegisteringPreset(true)}
                    className={`flex-1 py-1.5 px-2 border flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      appTheme === 'mocha'
                        ? 'bg-[#EDE4D3] hover:bg-[#F5EFE6] hover:text-[#C48A58] text-[#382B20] border-[#9E8C7A]'
                        : (appTheme === 'light'
                          ? 'bg-white hover:bg-gray-50 hover:text-[var(--accent)] text-gray-800 border-gray-300'
                          : (appTheme === 'peper'
                            ? 'bg-white hover:bg-[#FAF8F5] hover:text-[var(--accent)] text-[#3A2F24] border-[#C2B6A2]'
                            : 'bg-[#25252B] hover:bg-[#323238] hover:text-[var(--accent)] text-gray-200 border-[#3A3A42]'))
                    }`}
                    title={t('Register New Custom Set')}
                  >
                    <Plus className="w-3 h-3 text-[var(--accent)]" />
                    {t('REGISTER NEW CUSTOM')}
                  </button>
                  {!activePresetId.startsWith('default-') && (
                    <button
                      type="button"
                      onClick={handleUpdateCustomPreset}
                      className={`px-2.5 py-1.5 border text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        appTheme === 'mocha'
                          ? 'bg-[#EDE4D3] hover:bg-[#F5EFE6] text-[#382B20] border-[#9E8C7A]'
                          : (appTheme === 'light'
                            ? 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                            : (appTheme === 'peper'
                              ? 'bg-white hover:bg-[#FAF8F5] text-[#3A2F24] border-[#C2B6A2]'
                              : 'bg-[#25252B] hover:bg-[#323238] text-gray-200 border-[#3A3A42]'))
                      }`}
                      title={t('Overwrite Custom Set')}
                    >
                      {t('OVERWRITE')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scope Selector: PER THEME vs COMMON */}
          <div className={`p-2.5 border flex flex-col gap-2 ${
            appTheme === 'mocha'
              ? 'bg-[#E3D9C9] border-[#9E8C7A]'
              : (appTheme === 'light'
                ? 'bg-gray-100 border-gray-200'
                : (appTheme === 'peper'
                  ? 'bg-[#DDD4C4] border-[#C2B6A2]'
                  : 'bg-[#1E1E22]/60 border-[#323238]'))
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${
                appTheme === 'mocha'
                  ? 'text-[#5C4C3E]'
                  : (appTheme === 'light'
                    ? 'text-gray-800'
                    : (appTheme === 'peper'
                      ? 'text-[#5F5241]'
                      : 'text-gray-400'))
              }`}>
                {t('Color Scope')}
              </span>
              <span className={`text-[9px] font-mono font-bold flex items-center gap-1.5 ${
                appTheme === 'mocha'
                  ? 'text-[#C48A58]'
                  : (appTheme === 'light'
                    ? 'text-gray-900'
                    : (appTheme === 'peper'
                      ? 'text-[#D95430]'
                      : 'text-[var(--accent)]'))
              }`}>
                {colorScope === 'theme' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: currentThemeObj.dotColor }} />
                    {currentThemeObj.label}
                  </>
                ) : (
                  t('ALL THEMES')
                )}
              </span>
            </div>
            
            <div className={`flex border overflow-hidden text-[9px] font-bold tracking-wider ${
              appTheme === 'mocha'
                ? 'border-[#9E8C7A]'
                : (appTheme === 'light'
                  ? 'border-gray-300'
                  : (appTheme === 'peper'
                    ? 'border-[#C2B6A2]'
                    : 'border-[#323238]'))
            }`}>
              <button
                type="button"
                onClick={() => handleToggleColorScope('theme')}
                className={`flex-1 py-1.5 px-2 transition-colors uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                  colorScope === 'theme'
                    ? (appTheme === 'mocha' ? 'bg-[#C48A58] text-white font-bold' : 'bg-[var(--accent)] text-white')
                    : (appTheme === 'mocha'
                      ? 'bg-[#EDE4D3] text-[#5C4C3E] hover:text-[#2B2017] hover:bg-[#F5EFE6]'
                      : (appTheme === 'light'
                        ? 'bg-white text-gray-700 hover:text-black hover:bg-gray-50'
                        : (appTheme === 'peper'
                          ? 'bg-white text-[#73634F] hover:text-[#3A2F24] hover:bg-[#FAF8F5]'
                          : 'bg-[#121214] text-gray-500 hover:text-gray-300')))
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentThemeObj.dotColor }} />
                {t('Per Theme')}
              </button>
              <button
                type="button"
                onClick={() => handleToggleColorScope('common')}
                className={`flex-1 py-1.5 px-2 transition-colors uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                  colorScope === 'common'
                    ? (appTheme === 'mocha' ? 'bg-[#C48A58] text-white font-bold' : 'bg-[var(--accent)] text-white')
                    : (appTheme === 'mocha'
                      ? 'bg-[#EDE4D3] text-[#5C4C3E] hover:text-[#2B2017] hover:bg-[#F5EFE6]'
                      : (appTheme === 'light'
                        ? 'bg-white text-gray-700 hover:text-black hover:bg-gray-50'
                        : (appTheme === 'peper'
                          ? 'bg-white text-[#73634F] hover:text-[#3A2F24] hover:bg-[#FAF8F5]'
                          : 'bg-[#121214] text-gray-500 hover:text-gray-300')))
                }`}
              >
                {t('Common')}
              </button>
            </div>

            {colorScope === 'theme' && (
              <div className={`flex justify-between items-center pt-1 border-t ${
                appTheme === 'light'
                  ? 'border-gray-300'
                  : (appTheme === 'peper'
                    ? 'border-[#C2B6A2]'
                    : 'border-[#323238]/40')
              }`}>
                <span className={`text-[8px] ${
                  appTheme === 'light'
                    ? 'text-gray-700'
                    : (appTheme === 'peper'
                      ? 'text-[#5F5241]'
                      : 'text-gray-500')
                }`}>
                  {t('Saved for')} <strong className={appTheme === 'light' ? 'text-gray-900 font-bold' : (appTheme === 'peper' ? 'text-[#D95430] font-bold' : 'text-[var(--accent)]')}>{currentThemeObj.label}</strong>
                </span>
                <button
                  type="button"
                  onClick={copyCurrentColorsToAllThemes}
                  className={`text-[8px] uppercase font-bold underline transition-colors cursor-pointer ${
                    appTheme === 'light'
                      ? 'text-gray-800 hover:text-black'
                      : (appTheme === 'peper'
                        ? 'text-[#73634F] hover:text-[#D95430]'
                        : 'text-gray-400 hover:text-[var(--accent)]')
                  }`}
                  title={t('Apply to all themes')}
                >
                  {isCopiedToAll ? t('Copied!') : t('Copy to All Themes')}
                </button>
              </div>
            )}
          </div>

          {/* Character Color */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('Character Color')}</label>
                <button
                  type="button"
                  onClick={() => {
                    const accentHex = currentThemeObj.dotColor;
                    updateColorSetting({
                      characterColor: accentHex,
                      savedCustomCharacterColor: accentHex
                    });
                  }}
                  className="px-1.5 py-0.5 border border-[#323238] bg-[#1E1E22] hover:border-[var(--accent)] text-[8px] font-mono font-bold flex items-center gap-1 text-[var(--accent)] transition-colors shadow-sm cursor-pointer"
                  title={t('Apply Theme Accent')}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentThemeObj.dotColor }} />
                  {t('THEME ACCENT')}
                </button>
              </div>
              <button 
                onClick={() => updateColorSetting({ characterColor: DEFAULT_THEME_COLORS[appTheme].characterColor })}
                className="text-[8px] text-gray-500 hover:text-white underline uppercase font-bold transition-colors cursor-pointer"
              >
                RESET
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {['#D95430', '#26262B', '#050505', '#7A2020', '#52525B', '#475569', '#355E42', '#7A5026'].map((color) => (
                  <button
                    key={color}
                    onClick={() => updateColorSetting({ characterColor: color })}
                    className={`w-6 h-6 border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center ${
                      characterColor === color ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {characterColor === color && <div className="w-1 h-1 bg-white shadow-sm" />}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3 pt-2 border-t border-[#323238]/50 mt-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('Custom')}</span>
                <div className={`relative w-6 h-6 border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center overflow-hidden ${
                  savedCustomCharacterColor && characterColor === savedCustomCharacterColor ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                }`}>
                  <input 
                    type="color" 
                    value={savedCustomCharacterColor}
                    onChange={(e) => {
                      updateColorSetting({
                        savedCustomCharacterColor: e.target.value,
                        characterColor: e.target.value
                      });
                    }}
                    className="absolute inset-0 w-10 h-10 -ml-2 -mt-2 cursor-pointer bg-transparent border-none appearance-none group-hover:scale-110"
                    title={t('Custom Character Color')}
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-difference">
                    <Plus className="w-3 h-3 text-white opacity-75" />
                  </div>
                  {savedCustomCharacterColor && characterColor === savedCustomCharacterColor && <div className="w-1.5 h-1.5 bg-white shadow-sm pointer-events-none absolute mix-blend-difference" />}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Themes */}
          <div className="pt-2 border-t border-[#323238]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('Visual Themes')}</label>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      updateColorSetting({
                        themeId: theme.id,
                        customBgColor: null
                      });
                    }}
                    className={`w-6 h-6 border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center ${
                      themeId === theme.id && !customBgColor ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                    }`}
                    style={{ backgroundColor: theme.bodyColor }}
                    title={theme.name}
                  >
                    {themeId === theme.id && !customBgColor && <div className="w-1 h-1 bg-white shadow-sm" />}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3 pt-2 border-t border-[#323238]/50 mt-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('Custom')}</span>
                <div className={`relative w-6 h-6 border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center overflow-hidden ${
                  customBgColor ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                }`}>
                  <input 
                    type="color" 
                    value={savedCustomBgColor}
                    onChange={(e) => {
                      updateColorSetting({
                        savedCustomBgColor: e.target.value,
                        customBgColor: e.target.value
                      });
                    }}
                    onClick={() => updateColorSetting({ customBgColor: savedCustomBgColor })}
                    className="absolute inset-0 w-10 h-10 -ml-2 -mt-2 cursor-pointer bg-transparent border-none appearance-none group-hover:scale-110"
                    title={t('Custom Background Color')}
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-difference">
                    <Plus className="w-3 h-3 text-white opacity-75" />
                  </div>
                  {customBgColor && <div className="w-1.5 h-1.5 bg-white shadow-sm pointer-events-none absolute mix-blend-difference" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    );
  };

  const renderEffectSettingCard = () => {
    return renderSectionCard(
      'sound',
      'effect-setting',
      t('EFFECT SETTING'),
      isEffectSettingOpen,
      setIsEffectSettingOpen,
      !isEffectSettingOpen ? (
        <span className="text-[8px] font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 border border-[var(--accent)]/30 leading-none">
          {soundType.slice(0, 3).toUpperCase()}
        </span>
      ) : null,
      (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[9px] text-gray-500 uppercase font-bold">{t('Effect Style')}</label>
            <span className={`text-[9px] ${highlightClasses.text} font-mono`}>{soundType}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(['mechanical', 'retro', 'ping', 'wood', 'pop'] as SoundEffectType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSoundType(type);
                  SoundManager.playPoseChange(type, sfxVolume);
                }}
                className={`h-6 border transition-all text-[8px] font-bold uppercase ${
                  soundType === type 
                  ? `${highlightClasses.bg} ${highlightClasses.border} ${appTheme === 'light' ? 'text-white' : 'text-[#121214]'}` 
                  : (appTheme === 'light' ? 'bg-gray-200 border-gray-200 text-gray-600 hover:bg-gray-300 hover:border-gray-300' : 'bg-[#2A2A30] border-[#323238] text-gray-500 hover:border-[#424248] hover:text-gray-300')
                }`}
              >
                {type.slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-gray-500 uppercase font-bold">{t('SFX Volume')}</label>
              </div>
              <span className="text-[9px] text-gray-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" value={sfxVolume} 
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className={`w-full h-1 appearance-none cursor-pointer ${appTheme === 'light' ? 'bg-gray-300 accent-gray-500' : `${appTheme === 'black' ? 'bg-[#4A4A52]' : 'bg-[#2A2A30]'} ${highlightClasses.accent}`}`}
            />
          </div>
        </div>
      )
    );
  };

  const renderBgmSettingCard = () => {
    return renderSectionCard(
      'sound',
      'bgm-setting',
      t('BGM SETTING'),
      isBgmSettingOpen,
      setIsBgmSettingOpen,
      !isBgmSettingOpen && isBgmPlaying ? (
        <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 border border-emerald-400/30 leading-none">
          PLAYING
        </span>
      ) : null,
      (
        <div className="flex flex-col gap-3">
          {/* Active Track Title */}
          <div className="flex items-center justify-between min-h-[16px] px-0.5">
            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold truncate max-w-[200px] ${currentBgmId ? (appTheme === 'light' ? 'text-gray-800' : 'text-white') : 'text-gray-500 italic'}`}>
              {currentBgmId ? allTracks.find(t => t.id === currentBgmId)?.name || 'Unknown Track' : 'NO TRACK READY'}
            </span>
            {isBgmLoading && (
              <span className="text-[8px] font-mono text-[var(--accent)] animate-pulse uppercase tracking-widest">{t('Loading...')}</span>
            )}
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={playPreviousTrack}
                disabled={!currentBgmId || bgmPlaylist.length === 0}
                className={`w-8 h-8 border transition-all flex items-center justify-center cursor-pointer ${
                  appTheme === 'mocha'
                    ? 'bg-[#1E1813] border-[#524032] hover:border-[#7C6552] text-[#EDE4D3] hover:bg-[#352922]'
                    : (appTheme === 'peper' 
                      ? 'bg-white border-[#8C7B68] hover:border-[#5F5241] text-[#44372B] hover:bg-[#FAF8F5]' 
                      : (appTheme === 'light' 
                        ? 'bg-white border-gray-400 hover:border-gray-600 text-gray-800 hover:bg-gray-50' 
                        : 'bg-[#1a1a1e] border-[#4A4A52] hover:border-gray-300 hover:bg-[#323238] text-white'))
                }`}
                title={t('Previous Track')}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={toggleBgmFromPlayer}
                disabled={!currentBgmId && bgmPlaylist.length === 0}
                className={`w-10 h-8 border transition-all flex items-center justify-center cursor-pointer ${
                  appTheme === 'mocha'
                    ? (isBgmPlaying
                        ? 'bg-[#C48A58] border-[#C48A58] text-white force-white-text shadow-sm'
                        : 'bg-[#1E1813] border-[#524032] hover:border-[#7C6552] text-[#EDE4D3] hover:bg-[#352922]')
                    : (appTheme === 'peper' 
                      ? (isBgmPlaying 
                          ? 'bg-[#D95430] border-[#D95430] text-white force-white-text shadow-sm' 
                          : 'bg-white border-[#8C7B68] hover:border-[#5F5241] text-[#44372B] hover:bg-[#FAF8F5]')
                      : (appTheme === 'light' 
                        ? (isBgmPlaying 
                            ? 'bg-gray-800 border-gray-800 text-white force-white-text' 
                            : 'bg-white border-gray-400 hover:border-gray-600 text-gray-800 hover:bg-gray-50')
                        : (isBgmPlaying 
                            ? `${highlightClasses.bg} ${highlightClasses.border} text-[#121214]` 
                            : 'bg-[#1a1a1e] border-[#4A4A52] hover:border-gray-300 hover:bg-[#323238] text-white')))
                }`}
                title={isBgmPlaying ? t('Pause') : t('Play')}
              >
                {isBgmPlaying ? <Pause className="w-4 h-4 text-white force-white-text" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button 
                onClick={stopBgm}
                disabled={!currentBgmId && !isBgmPlaying}
                className={`w-8 h-8 border transition-all flex items-center justify-center cursor-pointer ${
                  appTheme === 'mocha'
                    ? 'bg-[#1E1813] border-[#524032] hover:border-[#7C6552] text-[#EDE4D3] hover:bg-[#352922]'
                    : (appTheme === 'peper' 
                      ? 'bg-white border-[#8C7B68] hover:border-[#5F5241] text-[#44372B] hover:bg-[#FAF8F5]' 
                      : (appTheme === 'light' 
                        ? 'bg-white border-gray-400 hover:border-gray-600 text-gray-800 hover:bg-gray-50' 
                        : 'bg-[#1a1a1e] border-[#4A4A52] hover:border-gray-300 hover:bg-[#323238] text-white'))
                }`}
                title={t('Stop')}
              >
                <Square className={`w-3.5 h-3.5 fill-current ${appTheme === 'mocha' ? 'text-[#EDE4D3]' : (appTheme === 'peper' ? 'text-[#44372B]' : (appTheme === 'light' ? 'text-gray-800' : 'text-white'))}`} />
              </button>

              <button 
                onClick={playNextTrack}
                disabled={!currentBgmId || bgmPlaylist.length === 0}
                className={`w-8 h-8 border transition-all flex items-center justify-center cursor-pointer ${
                  appTheme === 'mocha'
                    ? 'bg-[#1E1813] border-[#524032] hover:border-[#7C6552] text-[#EDE4D3] hover:bg-[#352922]'
                    : (appTheme === 'peper' 
                      ? 'bg-white border-[#8C7B68] hover:border-[#5F5241] text-[#44372B] hover:bg-[#FAF8F5]' 
                      : (appTheme === 'light' 
                        ? 'bg-white border-gray-400 hover:border-gray-600 text-gray-800 hover:bg-gray-50' 
                        : 'bg-[#1a1a1e] border-[#4A4A52] hover:border-gray-300 hover:bg-[#323238] text-white'))
                }`}
                title={t('Next Track')}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setBgmRepeatMode(prev => prev === 0 ? 1 : prev === 1 ? 2 : 0)}
                className={`w-8 h-8 border transition-all flex items-center justify-center relative cursor-pointer ${
                  bgmRepeatMode !== 0 
                    ? (appTheme === 'mocha'
                        ? 'bg-[#1E1813] border-2 border-[#C48A58] text-[#C48A58] shadow-sm'
                        : (appTheme === 'peper' 
                          ? 'bg-white border-2 border-[#D95430] text-[#D95430] shadow-sm' 
                          : (appTheme === 'light' 
                            ? 'bg-white border-2 border-gray-800 text-gray-900 shadow-sm' 
                            : `bg-[#1a1a1e] ${highlightClasses.border} ${highlightClasses.text}`))) 
                    : (appTheme === 'mocha'
                        ? 'bg-[#1E1813] border-[#524032] hover:border-[#7C6552] text-[#EDE4D3] hover:bg-[#352922]'
                        : (appTheme === 'peper' 
                          ? 'bg-white border-[#8C7B68] hover:border-[#5F5241] text-[#44372B] hover:bg-[#FAF8F5]' 
                          : (appTheme === 'light' 
                            ? 'bg-white border-gray-400 hover:border-gray-600 text-gray-800 hover:bg-gray-50' 
                            : 'bg-[#1a1a1e] border-[#4A4A52] hover:border-gray-300 hover:bg-[#323238] text-white')))
                }`}
                title={bgmRepeatMode === 1 ? t('Playlist Repeat') : bgmRepeatMode === 2 ? t('Track Repeat') : t('Repeat Off')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {bgmRepeatMode === 2 && (
                  <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-bold flex items-center justify-center w-3.5 h-3.5 pt-[0.5px] shadow-sm select-none ${
                    appTheme === 'mocha'
                      ? 'bg-[#C48A58] text-white force-white-text border border-white/40'
                      : (appTheme === 'peper' 
                        ? 'bg-[#D95430] text-white force-white-text border border-white/40' 
                        : (appTheme === 'light' 
                          ? 'bg-gray-800 text-white force-white-text border border-white/40' 
                          : `${highlightClasses.bg} text-[#121214]`))
                  }`}>1</span>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-1 relative group cursor-pointer mb-1" onClick={(e) => {
            if (!currentBgmId) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            SoundManager.seekBgm(pos * SoundManager.getBgmDuration());
          }}>
            <div className="flex justify-between items-center px-0.5 pointer-events-none mb-1">
              <span className={`text-[10px] font-mono tracking-wider ${appTheme === 'mocha' ? 'text-[#7C6C5C]' : 'text-gray-400'}`}>{bgmTimeStr.split(' / ')[0]}</span>
              <span className={`text-[10px] font-mono tracking-wider ${appTheme === 'mocha' ? 'text-[#8F7E6D]' : 'text-gray-500'}`}>{bgmTimeStr.split(' / ')[1]}</span>
            </div>
            <div className={`w-full h-1 overflow-hidden relative pointer-events-none transition-all ${appTheme === 'mocha' ? 'bg-[#C2B6A3]' : (appTheme === 'light' ? 'bg-gray-300' : 'bg-[#2A2A30]')}`}>
              <div 
                className={`h-full ${appTheme === 'mocha' ? 'bg-[#1E1813]' : (appTheme === 'light' ? 'bg-gray-500' : highlightClasses.bg)} transition-all ease-linear`}
                style={{ width: `${Math.max(0, Math.min(100, bgmProgress * 100))}%`, transitionDuration: isBgmPlaying ? '500ms' : '0ms' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'mocha' ? 'text-[#483A2E]' : (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300')}`}>{t('BGM Volume')}</span>
              <span className={`text-[8px] font-mono ${appTheme === 'mocha' ? 'text-[#7C6C5C]' : 'text-gray-400'}`}>{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" value={bgmVolume} 
              onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
              className={`w-full h-1 appearance-none cursor-pointer ${appTheme === 'mocha' ? 'bg-[#C2B6A3] accent-[#1E1813]' : (appTheme === 'light' ? 'bg-gray-300 accent-gray-500' : `${appTheme === 'black' ? 'bg-[#4A4A52]' : 'bg-[#2A2A30]'} ${highlightClasses.accent}`)}`}
            />
          </div>
        </div>
      )
    );
  };

  const renderPlaylistsCard = () => {
    return renderSectionCard(
      'sound',
      'playlists',
      t('PLAYLISTS'),
      isPlaylistSectionOpen,
      setIsPlaylistSectionOpen,
      !isPlaylistSectionOpen ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 border border-white/10 leading-none truncate max-w-[100px]">
            {activePlaylist.name}
          </span>
          <span className="text-[8px] font-mono text-gray-500">
            ({activePlaylist.trackIds.length})
          </span>
        </div>
      ) : null,
      (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button 
              onClick={createPlaylist}
              className={`flex-1 py-1.5 px-3 border transition-colors flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer ${
                appTheme === 'peper'
                  ? 'bg-[#D95430] hover:bg-[#C24422] text-white force-white-text border-[#D95430] shadow-sm'
                  : (appTheme === 'mocha'
                    ? 'bg-[#C48A58] hover:bg-[#B37B49] text-white force-white-text border-[#A87242] shadow-sm'
                    : (appTheme === 'light'
                      ? 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                      : `bg-[#1a1a1e] hover:bg-[#323238] text-[var(--accent)] ${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'}`))
              }`}
            >
              <Plus className={`w-3 h-3 ${appTheme === 'peper' || appTheme === 'mocha' ? 'text-white force-white-text' : ''}`} /> {t('New Set')}
            </button>
            <button 
              onClick={() => setIsPlaylistExpanded(!isPlaylistExpanded)}
              className={`w-8 flex items-center justify-center border transition-colors cursor-pointer ${
                appTheme === 'peper'
                  ? 'bg-white hover:bg-[#FAF8F5] border-[#8C7B68] text-[#44372B]'
                  : (appTheme === 'mocha'
                    ? 'bg-[#DDD3C3] hover:bg-[#C8BEAE] border-[#7C6856] text-[#382B20]'
                    : (appTheme === 'light'
                      ? 'bg-white hover:bg-gray-50 border-gray-400 text-gray-700'
                      : `bg-[#1a1a1e] hover:bg-[#323238] ${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'} text-gray-400 hover:text-white`))
              }`}
              title={t('Toggle Playlist View')}
            >
              {isPlaylistExpanded ? <ChevronDown className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setShowClearConfirm(true)}
              className={`w-8 flex items-center justify-center border transition-colors cursor-pointer ${
                appTheme === 'peper'
                  ? 'bg-white hover:bg-red-50 border-[#8C7B68] text-red-500 hover:border-red-400'
                  : (appTheme === 'mocha'
                    ? 'bg-[#DDD3C3] hover:bg-red-500/10 border-[#7C6856] text-[#786756] hover:text-red-500'
                    : (appTheme === 'light'
                      ? 'bg-white hover:bg-red-50 border-gray-400 text-gray-600 hover:text-red-500'
                      : `bg-[#1a1a1e] hover:bg-red-500/10 text-gray-400 hover:text-red-400 ${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'}`))
              }`}
              title={t('Delete all tracks')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-between items-center px-1">
            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">
              Total DB Tracks:
            </label>
            <span className="text-[10px] text-gray-400 font-bold">{allTracks.length}</span>
          </div>

          <div className="border-t border-[#323238] pt-2">
            {isPlaylistExpanded ? (
              <div className="space-y-1 mb-2">
                {playlists.map(p => (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between p-2 border transition-colors cursor-pointer group ${
                      activePlaylistId === p.id 
                      ? `${highlightClasses.bgMuted} ${highlightClasses.border} ${highlightClasses.text}` 
                      : 'bg-[#121214] border-[#323238] hover:border-gray-500 text-white'
                    }`}
                    onClick={() => {
                      if (editingPlaylistId !== p.id) {
                        setActivePlaylistId(p.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {editingPlaylistId === p.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingPlaylistName}
                          onChange={(e) => setEditingPlaylistName(e.target.value)}
                          onBlur={() => {
                            if (editingPlaylistName.trim()) renamePlaylist(p.id, editingPlaylistName.trim());
                            setEditingPlaylistId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingPlaylistName.trim()) renamePlaylist(p.id, editingPlaylistName.trim());
                              setEditingPlaylistId(null);
                            } else if (e.key === 'Escape') {
                              setEditingPlaylistId(null);
                            }
                          }}
                          className="bg-black/50 text-white text-[10px] uppercase font-bold w-full px-1 py-0.5 outline-none border border-[var(--accent)]"
                        />
                      ) : (
                        <>
                          <span className={`text-[10px] uppercase font-bold truncate ${activePlaylistId === p.id ? highlightClasses.text : 'text-gray-400'}`}>
                            {p.name}
                          </span>
                          <span className={`text-[9px] ${activePlaylistId === p.id ? highlightClasses.text : 'text-gray-600'}`}>({p.trackIds.length})</span>
                        </>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${activePlaylistId === p.id ? 'opacity-100' : ''}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); movePlaylist(p.id, -1); }} 
                        className="text-gray-500 hover:text-white p-0.5"
                        title={t('Move Up')}
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); movePlaylist(p.id, 1); }} 
                        className="text-gray-500 hover:text-white p-0.5"
                        title={t('Move Down')}
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingPlaylistId(p.id);
                          setEditingPlaylistName(p.name);
                        }} 
                        className="text-gray-500 hover:text-white p-0.5"
                        title={t('Rename')}
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (confirmDeleteId === p.id) {
                            deletePlaylist(p.id);
                            setConfirmDeleteId(null);
                          } else {
                            setConfirmDeleteId(p.id);
                            setTimeout(() => setConfirmDeleteId(null), 3000);
                          }
                        }} 
                        className={`p-0.5 transition-all ${confirmDeleteId === p.id ? 'text-red-500 bg-red-500/20' : 'text-gray-500 hover:text-red-400'}`}
                        title={confirmDeleteId === p.id ? t('Click to confirm') : t('Delete')}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-2 relative">
                <select 
                  value={activePlaylistId} 
                  onChange={e => setActivePlaylistId(e.target.value)}
                  className={`playlist-accent-select w-full text-[10px] font-bold uppercase p-2 border outline-none cursor-pointer appearance-none transition-colors ${
                    appTheme === 'mocha'
                      ? 'bg-[#C48A58] hover:bg-[#B37B49] text-white border-[#A87242] shadow-sm tracking-wider font-extrabold force-white-text'
                      : (appTheme === 'peper'
                        ? 'bg-[#D95430] hover:bg-[#C24422] text-white border-[#D95430] shadow-sm force-white-text'
                        : 'bg-[#121214] hover:border-gray-500 text-[var(--accent)] border-[#323238]')
                  }`}
                >
                  {playlists.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#2C1F16] text-[#EDE4D3] py-1">{p.name} ({p.trackIds.length})</option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${
                  appTheme === 'mocha' || appTheme === 'peper' ? 'text-white force-white-text' : 'text-[var(--accent)]'
                }`} />
              </div>
            )}

            <div className="flex justify-between items-center mb-1 mt-3 px-1">
              <label className="text-[9px] text-[#777] uppercase font-bold tracking-widest">
                TRACKS
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={loadSamples}
                  disabled={isSamplesLoading}
                  className={`track-action-link text-[8px] font-bold uppercase underline cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-none p-0 ${
                    appTheme === 'peper'
                      ? 'text-[#73634F] hover:text-[#2B221A]'
                      : (appTheme === 'light'
                        ? 'text-gray-700 hover:text-black'
                        : 'text-gray-300 hover:text-white')
                  }`}
                >
                  <Music className="w-2.5 h-2.5" /> {isSamplesLoading ? 'Loading...' : 'Add Samples'}
                </button>
                <label className={`track-action-link text-[8px] font-bold uppercase underline cursor-pointer flex items-center gap-1 bg-transparent border-none p-0 ${
                  appTheme === 'peper'
                    ? 'text-[#73634F] hover:text-[#2B221A]'
                    : (appTheme === 'light'
                      ? 'text-gray-700 hover:text-black'
                      : 'text-gray-300 hover:text-white')
                }`}>
                  <Plus className="w-2.5 h-2.5" /> Add Files
                  <input 
                    type="file" 
                    ref={bgmInputRef}
                    onChange={handleBgmUpload} 
                    accept="audio/*" 
                    className="hidden" 
                    multiple
                  />
                </label>
              </div>
            </div>
            
            <div className={`mt-1 mb-2 px-1 flex items-center justify-between border-b ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'} pb-2`}>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
                const activePlaylist = playlists.find(p => p.id === activePlaylistId);
                if (!activePlaylist) return;
                const allActiveTrackIds = activePlaylist.trackIds;
                if (allActiveTrackIds.length === 0) return;
                
                const isAllSelected = allActiveTrackIds.every(id => selectedTrackIds.has(id));
                if (isAllSelected) {
                  setSelectedTrackIds(new Set());
                } else {
                  setSelectedTrackIds(new Set(allActiveTrackIds));
                }
              }}>
                <div className={`w-3 h-3 flex items-center justify-center border transition-colors ${
                  playlists.find(p => p.id === activePlaylistId)?.trackIds.length && playlists.find(p => p.id === activePlaylistId)?.trackIds.every(id => selectedTrackIds.has(id))
                    ? 'bg-[#323238] border-gray-500' 
                    : 'bg-transparent border-gray-500 group-hover:border-gray-400'
                }`}>
                  {playlists.find(p => p.id === activePlaylistId)?.trackIds.length > 0 && playlists.find(p => p.id === activePlaylistId)?.trackIds.every(id => selectedTrackIds.has(id)) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors select-none">
                  {selectedTrackIds.size > 0 ? `${selectedTrackIds.size} Selected` : '0 Selected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {playlists.length > 1 && (
                  <select 
                    onChange={(e) => moveSelectedTracksToPlaylist(e.target.value)}
                    value=""
                    className="bg-[#121214] w-28 text-[9px] font-bold uppercase text-[var(--accent)] border border-[#323238] px-1.5 py-0.5 outline-none cursor-pointer hover:border-gray-500 transition-colors appearance-none"
                  >
                    <option value="" disabled>Move to...</option>
                    {playlists.filter(p => p.id !== activePlaylistId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={removeSelectedTracks}
                  className="p-1 hover:text-red-400 text-gray-500 transition-colors border border-[#323238] bg-[#121214]"
                  title={t('Delete Selected')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="mt-2 max-h-56 overflow-y-auto dark-scrollbar pr-1">
              <div className="space-y-1">
                {bgmPlaylist.length > 0 ? bgmPlaylist.map((track, idx) => (
                  <div 
                    key={`${track.id}-${idx}`} 
                    onClick={() => playTrackById(track.id)}
                    className="group flex items-center justify-between p-2 border bg-[#121214] border-[#323238] hover:border-gray-500 transition-all cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                      <div 
                        className="flex items-center justify-center p-1 -ml-1 cursor-pointer flex-shrink-0"
                        onClick={(e) => toggleTrackSelection(track.id, e)}
                      >
                        <div className={`w-3 h-3 border flex items-center justify-center transition-colors ${
                          selectedTrackIds.has(track.id) 
                          ? 'bg-[#323238] border-gray-500' 
                          : 'border-gray-500'
                        }`}>
                          {selectedTrackIds.has(track.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                      <span className={`text-[10px] truncate ${
                        currentBgmId === track.id ? `${highlightClasses.text} font-bold` : (selectedTrackIds.has(track.id) ? highlightClasses.text : 'text-white')
                      }`}>
                        {track.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-2">
                      <button 
                        onClick={(e) => moveToTop(idx, e)}
                        className="p-0.5 hover:text-[var(--accent)] transition-colors"
                        title={t('Move to Top')}
                      >
                        <ChevronsUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => moveTrackUp(idx, e)}
                        className="p-0.5 hover:text-[var(--accent)] transition-colors"
                        title={t('Move Up')}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => moveTrackDown(idx, e)}
                        className="p-0.5 hover:text-[var(--accent)] transition-colors"
                        title={t('Move Down')}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => moveToBottom(idx, e)}
                        className="p-0.5 hover:text-[var(--accent)] transition-colors"
                        title={t('Move to Bottom')}
                      >
                        <ChevronsDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center opacity-50 border border-transparent border-dashed h-12">
                    <p className="text-[9px] uppercase tracking-widest font-bold">No tracks in this playlist</p>
                  </div>
                )}
              </div>
            </div>

            <div 
              className="mt-3 border-2 border-dashed border-[#323238] transition-colors relative flex flex-col items-center justify-center p-4 text-center group hover:border-[var(--accent)] cursor-pointer"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-[var(--accent)]', 'bg-[var(--accent)]/5');
                e.currentTarget.classList.remove('border-[#323238]');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/5');
                e.currentTarget.classList.add('border-[#323238]');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/5');
                e.currentTarget.classList.add('border-[#323238]');
                
                const files = Array.from(e.dataTransfer.files).filter((f: any) => f.type.startsWith('audio/'));
                if (files.length > 0) {
                  handleBgmUpload({ target: { files } } as any);
                }
              }}
              onClick={() => {
                bgmInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4 mb-2 text-gray-500 group-hover:text-[var(--accent)] transition-colors" />
              <p className="text-[9px] uppercase tracking-widest font-bold text-gray-500 group-hover:text-gray-300 transition-colors">{t('Drop Audio Files Here')}</p>
            </div>
          </div>
        </div>
      )
    );
  };

  const renderVisualTab = () => (
    <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-h-0">
      <div className="flex-1 overflow-x-hidden overflow-y-scroll dark-scrollbar p-4 space-y-4">
        {visualSectionOrder.map((sectionId) => {
          if (sectionId === 'pose-setting') return renderPoseSettingCard();
          if (sectionId === 'pose-library') return renderPoseLibraryCard();
          if (sectionId === 'colors') return renderColorsCard();
          return null;
        })}

        {/* Export/Import & Persistence Footer */}
        <div className="pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={exportSettings}
              className={`flex items-center justify-center gap-2 p-2 bg-[#2A2A30] hover:bg-[#323238] text-[10px] font-bold transition-colors border border-[#323238] ${appTheme === 'red' ? 'text-white' : 'text-gray-300'}`}
            >
              <Download className="w-3 h-3" /> {t('EXPORT')}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center gap-2 p-2 bg-[#2A2A30] hover:bg-[#323238] text-[10px] font-bold transition-colors border border-[#323238] ${appTheme === 'red' ? 'text-white' : 'text-gray-300'}`}
            >
              <Upload className="w-3 h-3" /> {t('IMPORT')}
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={importSettings} 
            accept=".json" 
            className="hidden" 
          />
          <div className="bg-[var(--accent)]/10 p-4 border border-[var(--accent)]/20">
            <p className="text-xs text-[var(--accent)] font-medium">{t('Auto-save Ready')}</p>
            <p className="text-[10px] text-[var(--accent)]/60 uppercase tracking-tighter">{t('Workspace persistence active')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSoundTab = () => (
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-left-2 duration-300 min-h-0">
      <div className="flex-1 overflow-x-hidden overflow-y-scroll dark-scrollbar p-4 space-y-4">
        {soundSectionOrder.map((sectionId) => {
          if (sectionId === 'effect-setting') return renderEffectSettingCard();
          if (sectionId === 'bgm-setting') return renderBgmSettingCard();
          if (sectionId === 'playlists') return renderPlaylistsCard();
          return null;
        })}
      </div>
    </div>
  );

  return (
    <div 
      className={`flex h-screen w-full overflow-hidden bg-[#121214] text-[#E1E1E6] font-sans ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ '--accent': appTheme === 'peper' ? '#D95430' : (appTheme === 'mocha' ? '#C48A58' : (appTheme === 'red' ? '#7A1F1F' : accentColor)) } as React.CSSProperties}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: isSidebarOpen ? sidebarWidth : 0,
          transition: isResizingSidebar ? 'none' : 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`bg-[#1E1E22] ${isSidebarOpen ? (sidebarPosition === 'left' ? (appTheme === 'mocha' ? 'border-r border-[#7C6856]' : 'border-r border-[#323238]') : (appTheme === 'mocha' ? 'border-l border-[#7C6856]' : 'border-l border-[#323238]')) : 'border-transparent'} flex flex-col z-20 shadow-2xl flex-shrink-0 relative overflow-hidden select-none`}
      >
        <div style={{ width: sidebarWidth }} className="flex flex-col h-full overflow-hidden flex-shrink-0">
          <div className={`p-5 border-b ${appTheme === 'mocha' ? 'bg-[#45372C] border-b border-[#33261D]' : 'border-[#323238]'}`}>
            <h1 className="text-sm font-bold tracking-tight flex items-start gap-2 leading-tight">
              <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0 text-[var(--accent)]" fill="currentColor">
                {/* Head */}
                <rect x="9" y="2" width="6" height="6" />
                {/* Eye */}
                <rect x="10" y="4" width="4" height="1.5" fill="white" />
                {/* Body */}
                <rect x="7" y="9" width="10" height="7" />
                {/* Left Arm */}
                <polygon points="6.5,9 3.5,16 5.5,16.5 8,10" />
                {/* Right Arm */}
                <polygon points="17.5,9 20.5,16 18.5,16.5 16,10" />
                {/* Left Leg */}
                <rect x="8.5" y="16.5" width="3" height="6" />
                {/* Right Leg */}
                <rect x="12.5" y="16.5" width="3" height="6" />
              </svg>
              <span className="flex flex-col">
                <span className="text-white text-base font-black leading-none tracking-wider">SOLID BLOCKPOSE</span>
                <span className="text-[var(--accent)] text-xs mt-0.5 tracking-widest">STUDIO BGM+</span>
              </span>
            </h1>
            <p className={`text-[9px] mt-1.5 uppercase tracking-widest font-bold ${appTheme === 'mocha' ? 'text-[#D5C8B8]' : 'text-gray-500'}`}>Studio Edition</p>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Tabs header with zero-shift layout */}
            <div className={`flex border-b sticky top-0 z-20 ${appTheme === 'mocha' ? 'bg-[#C8BEAE] border-[#7C6856]' : 'border-[#323238] bg-[#1e1e22]'}`}>
              <button 
                onClick={() => setActiveTab('visual')}
                className={`flex-1 h-11 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2 box-border cursor-pointer ${
                  activeTab === 'visual' 
                    ? (appTheme === 'mocha' ? 'text-[#1F1813] border-[#C48A58] bg-[#D7CEBF]' : 'text-white border-[var(--accent)] bg-[var(--accent)]/5')
                    : (appTheme === 'mocha' ? 'text-[#6E5D4E] border-transparent hover:text-[#1F1813]' : 'text-gray-500 border-transparent hover:text-gray-300')
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> {t('Visual')}
              </button>
              <button 
                onClick={() => setActiveTab('sound')}
                className={`flex-1 h-11 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2 box-border cursor-pointer ${
                  activeTab === 'sound' 
                    ? (appTheme === 'mocha' ? 'text-[#1F1813] border-[#C48A58] bg-[#D7CEBF]' : 'text-white border-[var(--accent)] bg-[var(--accent)]/5')
                    : (appTheme === 'mocha' ? 'text-[#6E5D4E] border-transparent hover:text-[#1F1813]' : 'text-gray-500 border-transparent hover:text-gray-300')
                }`}
              >
                <Music className="w-3.5 h-3.5" /> {t('Sound')}
              </button>
            </div>

            {activeTab === "visual" ? renderVisualTab() : renderSoundTab()}
          </div>
        </div>

        {/* Resizer Handle */}
        {isSidebarOpen && (
          <div
            className={`absolute top-0 bottom-0 w-2 cursor-col-resize z-50 transition-colors ${sidebarPosition === 'left' ? 'right-0' : 'left-0'} ${isResizingSidebar ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]/50'}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingSidebar(true);
            }}
          />
        )}
      </aside>

      {/* Sidebar Toggle Vertical Container */}
      <div className="w-0 relative z-20 flex flex-col justify-center">
        <div 
          className={`absolute ${sidebarPosition === 'left' ? 'left-0 -lg' : 'right-0 -lg'} top-1/2 -translate-y-1/2 w-2 hover:w-6 h-16 bg-white/10 hover:bg-[var(--accent)] flex items-center justify-center cursor-pointer transition-all group backdrop-blur-sm shadow-xl border border-white/5`}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute">
            {sidebarPosition === 'left' ? (
               isSidebarOpen ? <ChevronLeft className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white" />
            ) : (
               isSidebarOpen ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[#121214] min-w-0">
        {/* Header Bar */}
        <header className={`h-14 flex items-center justify-between px-6 z-40 flex-shrink-0 relative ${
          appTheme === 'mocha' ? 'bg-[#45372C] border-b border-[#33261D]' : 'bg-[#1a1a1e]/80 backdrop-blur-md border-b border-[#323238]'
        }`}>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                if (hudPanelTab === 'formation' && isHUDControlsVisible) {
                  setIsHUDControlsVisible(false);
                } else {
                  setHudPanelTab('formation');
                  setIsHUDControlsVisible(true);
                }
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className={`p-1 border transition-colors ${
                isHUDControlsVisible && hudPanelTab === 'formation' 
                  ? (appTheme === 'mocha' ? 'bg-[#C48A58] border-2 border-[#C48A58] text-white shadow-sm' : (appTheme === 'light' ? 'bg-gray-700 border-gray-700 text-[#ffffff]' : 'bg-gray-300 border-gray-300 text-[#121214]')) 
                  : (appTheme === 'mocha' ? 'border-2 border-[#524032] bg-[#1F1813] text-[#EDE4D3] group-hover:border-[#7C6552]' : 'border-[#323238] text-gray-400')
              }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${
                isHUDControlsVisible && hudPanelTab === 'formation' 
                  ? (appTheme === 'mocha' ? 'text-[#C48A58] font-black' : (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300')) 
                  : (appTheme === 'mocha' ? 'text-[#EDE4D3] group-hover:text-white' : 'text-gray-400')
              }`}>{t('Formation')}</span>
            </button>
            <button 
              onClick={() => {
                if (hudPanelTab === 'shadow' && isHUDControlsVisible) {
                  setIsHUDControlsVisible(false);
                } else {
                  setHudPanelTab('shadow');
                  setIsHUDControlsVisible(true);
                }
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className={`p-1 border transition-colors ${
                isHUDControlsVisible && hudPanelTab === 'shadow' 
                  ? (appTheme === 'mocha' ? 'bg-[#C48A58] border-2 border-[#C48A58] text-white shadow-sm' : (appTheme === 'light' ? 'bg-gray-700 border-gray-700 text-[#ffffff]' : 'bg-gray-300 border-gray-300 text-[#121214]')) 
                  : (appTheme === 'mocha' ? 'border-2 border-[#524032] bg-[#1F1813] text-[#EDE4D3] group-hover:border-[#7C6552]' : 'border-[#323238] text-gray-400')
              }`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${
                isHUDControlsVisible && hudPanelTab === 'shadow' 
                  ? (appTheme === 'mocha' ? 'text-[#C48A58] font-black' : (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300')) 
                  : (appTheme === 'mocha' ? 'text-[#EDE4D3] group-hover:text-white' : 'text-gray-400')
              }`}>{t('Shadow')}</span>
            </button>
            <button 
              onClick={() => {
                if (hudPanelTab === 'display' && isHUDControlsVisible) {
                  setIsHUDControlsVisible(false);
                } else {
                  setHudPanelTab('display');
                  setIsHUDControlsVisible(true);
                }
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className={`p-1 border transition-colors ${
                isHUDControlsVisible && hudPanelTab === 'display' 
                  ? (appTheme === 'mocha' ? 'bg-[#C48A58] border-2 border-[#C48A58] text-white shadow-sm' : (appTheme === 'light' ? 'bg-gray-700 border-gray-700 text-[#ffffff]' : 'bg-gray-300 border-gray-300 text-[#121214]')) 
                  : (appTheme === 'mocha' ? 'border-2 border-[#524032] bg-[#1F1813] text-[#EDE4D3] group-hover:border-[#7C6552]' : 'border-[#323238] text-gray-400')
              }`}>
                <Monitor className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${
                isHUDControlsVisible && hudPanelTab === 'display' 
                  ? (appTheme === 'mocha' ? 'text-[#C48A58] font-black' : (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300')) 
                  : (appTheme === 'mocha' ? 'text-[#EDE4D3] group-hover:text-white' : 'text-gray-400')
              }`}>{t('Display')}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              {/* Theme & Color Preset Dropdown (unified button with duo badge, label & chevron) */}
              <div className="relative" ref={themeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsThemeDropdownOpen(prev => !prev)}
                  className="h-8 px-2.5 flex items-center gap-2 border border-[#323238] bg-[#1E1E22] hover:bg-[#323238] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors shadow-sm cursor-pointer select-none"
                  title={t('Select Theme & Color Preset')}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/20" 
                    style={{ backgroundColor: currentThemeObj.dotColor }} 
                  />
                  <span className="leading-none max-w-[85px] truncate">
                    {currentThemeObj.label}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isThemeDropdownOpen && (
                  <div className={`absolute right-0 top-full mt-1 w-68 border shadow-2xl z-[100] py-1 flex flex-col text-[10px] font-mono ${
                    appTheme === 'mocha'
                      ? 'border-[#524032] bg-[#EDE7DC] text-[#483A2E]'
                      : (appTheme === 'peper'
                        ? 'border-[#D1C7B4] bg-[#EBE4D5]'
                        : (appTheme === 'light'
                          ? 'border-gray-300 bg-white shadow-xl'
                          : 'border-[#323238] bg-[#1E1E22]'))
                  }`}>
                    {/* Mode Selector Tabs */}
                    <div className={`grid grid-cols-2 p-1 border-b gap-1 ${
                      appTheme === 'mocha'
                        ? 'bg-[#DDD4C5] border-[#C8BCAB]'
                        : (appTheme === 'peper'
                          ? 'bg-[#DDD4C4] border-[#C2B6A2]'
                          : (appTheme === 'light'
                            ? 'bg-gray-100 border-gray-200'
                            : 'bg-[#121214] border-[#323238]'))
                    }`}>
                      <button
                        type="button"
                        onClick={() => switchThemeDropdownMode('ui-only')}
                        className={`py-1 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          themeDropdownMode === 'ui-only' 
                            ? (appTheme === 'mocha'
                                ? 'bg-[#1F1813] text-[#EDE4D3] border border-[#524032] shadow-sm'
                                : (appTheme === 'peper'
                                  ? 'bg-white text-[#3A2F24] border border-[#C2B6A2] shadow-sm'
                                  : (appTheme === 'light'
                                    ? 'bg-white text-gray-800 border border-gray-300 shadow-sm'
                                    : 'bg-[#2A2A30] text-white border border-[#444]')))
                            : (appTheme === 'mocha'
                                ? 'text-[#7C6C5C] hover:text-[#1F1813]'
                                : (appTheme === 'peper'
                                  ? 'text-[#73634F] hover:text-[#3A2F24]'
                                  : (appTheme === 'light'
                                    ? 'text-gray-500 hover:text-gray-900'
                                    : 'text-gray-400 hover:text-white')))
                        }`}
                      >
                        {t('UI Theme Only')}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchThemeDropdownMode('preset')}
                        className={`py-1 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          themeDropdownMode === 'preset' 
                            ? (appTheme === 'mocha'
                                ? 'bg-[#1F1813] text-[#EDE4D3] border border-[#524032] shadow-sm'
                                : (appTheme === 'peper'
                                  ? 'bg-white text-[#3A2F24] border border-[#C2B6A2] shadow-sm'
                                  : (appTheme === 'light'
                                    ? 'bg-white text-gray-800 border border-gray-300 shadow-sm'
                                    : 'bg-[#2A2A30] text-white border border-[#444]')))
                            : (appTheme === 'mocha'
                                ? 'text-[#7C6C5C] hover:text-[#1F1813]'
                                : (appTheme === 'peper'
                                  ? 'text-[#73634F] hover:text-[#3A2F24]'
                                  : (appTheme === 'light'
                                    ? 'text-gray-500 hover:text-gray-900'
                                    : 'text-gray-400 hover:text-white')))
                        }`}
                      >
                        {t('Full Preset Set')}
                      </button>
                    </div>

                    {themeDropdownMode === 'ui-only' ? (
                      <>
                        {/* UI Themes List: Scene unchanged */}
                        <div className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest border-b flex items-center justify-between ${
                          appTheme === 'mocha'
                            ? 'bg-[#DDD4C5] border-[#C8BCAB] text-[#483A2E]'
                            : (appTheme === 'peper'
                              ? 'bg-[#DDD4C4] border-[#C2B6A2] text-[#44372B]'
                              : (appTheme === 'light'
                                ? 'bg-gray-100 border-gray-200 text-gray-700'
                                : 'bg-[#17171A] border-[#323238]/60 text-gray-400'))
                        }`}>
                          <span>── {t('UI THEMES')} ──</span>
                          <span className={`text-[7px] font-mono ${
                            appTheme === 'mocha'
                              ? 'text-[#C48A58] font-bold'
                              : (appTheme === 'peper'
                                ? 'text-[#D95430] font-bold'
                                : (appTheme === 'light'
                                  ? 'text-gray-600 font-bold'
                                  : 'text-[var(--accent)]'))
                          }`}>{t('SCENE INTACT')}</span>
                        </div>

                        {APP_THEMES.map(th => {
                          const isSelected = appTheme === th.id;
                          return (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => handleSelectUIThemeOnly(th.id)}
                              className={`w-full px-3 py-2 flex items-center justify-between transition-colors text-left cursor-pointer ${
                                isSelected 
                                  ? (appTheme === 'mocha'
                                      ? 'bg-[#C48A58] text-white force-white-text font-bold'
                                      : (appTheme === 'peper'
                                        ? 'bg-[#D95430] text-white force-white-text font-bold'
                                        : (appTheme === 'light'
                                          ? 'bg-gray-200 text-gray-900 font-bold'
                                          : 'bg-[var(--accent)] text-white font-bold')))
                                  : (appTheme === 'mocha'
                                      ? 'text-[#483A2E] hover:text-[#1F1813] hover:bg-[#DDD4C5]'
                                      : (appTheme === 'peper'
                                        ? 'text-[#44372B] hover:text-[#2B221A] hover:bg-[#DDD4C4]'
                                        : (appTheme === 'light'
                                          ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                                          : 'text-gray-300 hover:text-white hover:bg-[#323238]')))
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/20" style={{ backgroundColor: th.dotColor }} />
                                <span className="font-bold tracking-wider">{th.label}</span>
                              </div>
                              {isSelected && <Check className={`w-3.5 h-3.5 flex-shrink-0 ${appTheme === 'mocha' || appTheme === 'peper' ? 'text-white force-white-text' : ''}`} />}
                            </button>
                          );
                        })}

                        <div className={`px-3 py-1.5 text-[8px] border-t ${
                          appTheme === 'mocha'
                            ? 'bg-[#DDD4C5] border-[#C8BCAB] text-[#7C6C5C]'
                            : (appTheme === 'peper'
                              ? 'bg-[#DDD4C4] border-[#C2B6A2] text-[#5F5241]'
                              : (appTheme === 'light'
                                ? 'bg-gray-100 border-gray-200 text-gray-600'
                                : 'bg-[#141416] border-[#323238] text-gray-400'))
                        }`}>
                          ※ {t('Character and background colors will remain unchanged.')}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Full Preset Sets List */}
                        <div className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest border-b flex items-center justify-between ${
                          appTheme === 'mocha'
                            ? 'bg-[#DDD4C5] border-[#C8BCAB] text-[#483A2E]'
                            : (appTheme === 'peper'
                              ? 'bg-[#DDD4C4] border-[#C2B6A2] text-[#44372B]'
                              : (appTheme === 'light'
                                ? 'bg-gray-100 border-gray-200 text-gray-700'
                                : 'bg-[#121214] border-[#323238]/60 text-gray-400'))
                        }`}>
                          <span>── {t('DEFAULT PRESETS')} ──</span>
                          <span className={`text-[7px] font-normal ${appTheme === 'mocha' || appTheme === 'peper' || appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{DEFAULT_COLOR_PRESETS.length}</span>
                        </div>

                        {DEFAULT_COLOR_PRESETS.map(preset => {
                          const isSelected = activePresetId === preset.id && !isModifiedFromPreset;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => applyColorPreset(preset)}
                              className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors text-left cursor-pointer ${
                                isSelected 
                                  ? (appTheme === 'mocha'
                                      ? 'bg-[#C48A58] text-white force-white-text font-bold'
                                      : (appTheme === 'peper'
                                        ? 'bg-[#D95430] text-white force-white-text font-bold'
                                        : (appTheme === 'light'
                                          ? 'bg-gray-200 text-gray-900 font-bold'
                                          : 'bg-[var(--accent)] text-white font-bold')))
                                  : (appTheme === 'mocha'
                                      ? 'text-[#483A2E] hover:text-[#1F1813] hover:bg-[#DDD4C5]'
                                      : (appTheme === 'peper'
                                        ? 'text-[#44372B] hover:text-[#2B221A] hover:bg-[#DDD4C4]'
                                        : (appTheme === 'light'
                                          ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                                          : 'text-gray-300 hover:text-white hover:bg-[#323238]')))
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PresetColorBadge chrColor={preset.characterColor} bgColor={preset.bgColor} size="sm" />
                                <span className="font-bold tracking-wider">{preset.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-mono ${
                                  isSelected 
                                    ? (appTheme === 'mocha' || appTheme === 'peper' ? 'text-white/90 force-white-text' : (appTheme === 'light' ? 'text-gray-700' : 'text-white/80')) 
                                    : (appTheme === 'mocha' || appTheme === 'peper' || appTheme === 'light' ? 'text-gray-500' : 'text-gray-500')
                                }`}>
                                  {preset.characterColor.toUpperCase()}
                                </span>
                                {isSelected && <Check className={`w-3.5 h-3.5 flex-shrink-0 ${appTheme === 'mocha' || appTheme === 'peper' ? 'text-white force-white-text' : ''}`} />}
                              </div>
                            </button>
                          );
                        })}

                        {/* Custom Presets Section */}
                        <div className={`px-3 py-1 mt-1 text-[8px] font-bold uppercase tracking-widest border-t border-b flex items-center justify-between ${
                          appTheme === 'mocha'
                            ? 'bg-[#DDD4C5] border-[#C8BCAB] text-[#483A2E]'
                            : (appTheme === 'peper'
                              ? 'bg-[#DDD4C4] border-[#C2B6A2] text-[#44372B]'
                              : (appTheme === 'light'
                                ? 'bg-gray-100 border-gray-200 text-gray-700'
                                : 'bg-[#121214] border-[#323238]/60 text-gray-400'))
                        }`}>
                          <span>── {t('CUSTOM SETS')} ──</span>
                          <span className="text-[7px] text-gray-500 font-normal">({customColorPresets.length})</span>
                        </div>

                        {customColorPresets.length === 0 ? (
                          <div className={`px-3 py-2 text-[9px] text-center italic ${
                            appTheme === 'mocha' || appTheme === 'peper' || appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {t('No custom sets registered')}
                          </div>
                        ) : (
                          customColorPresets.map(preset => {
                            const isSelected = activePresetId === preset.id && !isModifiedFromPreset;
                            return (
                              <div
                                key={preset.id}
                                className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer group ${
                                  isSelected 
                                    ? (appTheme === 'mocha'
                                        ? 'bg-[#C48A58] text-white force-white-text font-bold'
                                        : (appTheme === 'peper'
                                          ? 'bg-[#D95430] text-white force-white-text font-bold'
                                          : (appTheme === 'light'
                                            ? 'bg-gray-200 text-gray-900 font-bold'
                                            : 'bg-[var(--accent)] text-white font-bold')))
                                    : (appTheme === 'mocha'
                                        ? 'text-[#483A2E] hover:text-[#1F1813] hover:bg-[#DDD4C5]'
                                        : (appTheme === 'peper'
                                          ? 'text-[#44372B] hover:text-[#2B221A] hover:bg-[#DDD4C4]'
                                          : (appTheme === 'light'
                                            ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                                            : 'text-gray-300 hover:text-white hover:bg-[#323238]')))
                                }`}
                                onClick={() => applyColorPreset(preset)}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <PresetColorBadge chrColor={preset.characterColor} bgColor={preset.bgColor} size="sm" />
                                  <span className="truncate tracking-wider">{preset.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isSelected && <Check className={`w-3.5 h-3.5 ${appTheme === 'mocha' || appTheme === 'peper' ? 'text-white force-white-text' : ''}`} />}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                                    className={`p-1 transition-colors ${
                                      appTheme === 'mocha' || appTheme === 'peper' || appTheme === 'light' ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-red-400'
                                    }`}
                                    title={t('Delete Preset')}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}

                        {/* Save Current as Custom Set Action */}
                        <div className={`p-1.5 pt-2 border-t ${
                          appTheme === 'mocha'
                            ? 'bg-[#DDD4C5] border-[#C8BCAB]'
                            : (appTheme === 'peper'
                              ? 'bg-[#DDD4C4] border-[#C2B6A2]'
                              : (appTheme === 'light'
                                ? 'bg-gray-100 border-gray-200'
                                : 'bg-[#17171A] border-[#323238]'))
                        }`}>
                          <button
                            type="button"
                            onClick={() => handleRegisterCustomPreset()}
                            className={`w-full py-1.5 px-2 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              appTheme === 'mocha'
                                ? 'bg-[#1F1813] hover:bg-[#362A21] text-[#EDE4D3] border border-[#524032] shadow-sm'
                                : (appTheme === 'peper'
                                  ? 'bg-white hover:bg-[#FAF8F5] text-[#3A2F24] border border-[#C2B6A2] shadow-sm'
                                  : (appTheme === 'light'
                                    ? 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-sm'
                                    : 'bg-[#25252B] hover:bg-[#323238] hover:text-[var(--accent)] text-gray-200 border border-[#3A3A42]'))
                            }`}
                          >
                            <Plus className={`w-3 h-3 ${appTheme === 'mocha' ? 'text-[#C48A58]' : (appTheme === 'peper' ? 'text-[#D95430]' : (appTheme === 'light' ? 'text-gray-700' : 'text-[var(--accent)]'))}`} />
                            {t('Save Current as Custom Set')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Language Toggle (EN | JP) */}
              <div className={`flex border overflow-hidden h-8 ${appTheme === 'mocha' ? 'border-[#524032] bg-[#1F1813]' : 'border-[#323238] bg-[#1E1E22]'}`}>
                <button
                  type="button"
                  onClick={() => setAppLanguage('en')}
                  className={`px-2.5 h-full text-[10px] uppercase font-bold transition-colors cursor-pointer ${
                    appLanguage === 'en' 
                      ? (appTheme === 'mocha' ? 'bg-[#EDE4D3] text-[#1F1813]' : 'bg-gray-600 text-white')
                      : (appTheme === 'mocha' ? 'text-[#A59281] hover:text-[#EDE4D3] hover:bg-[#362A21]' : 'text-gray-400 hover:text-white hover:bg-[#323238]')
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setAppLanguage('ja')}
                  className={`px-2.5 h-full text-[10px] uppercase font-bold transition-colors cursor-pointer ${
                    appLanguage === 'ja' 
                      ? (appTheme === 'mocha' ? 'bg-[#EDE4D3] text-[#1F1813]' : 'bg-gray-600 text-white')
                      : (appTheme === 'mocha' ? 'text-[#A59281] hover:text-[#EDE4D3] hover:bg-[#362A21]' : 'text-gray-400 hover:text-white hover:bg-[#323238]')
                  }`}
                >
                  JP
                </button>
              </div>
            </div>
            <button 
              onClick={resetCamera}
              className={`w-[110px] justify-center px-3 py-1.5 text-[11px] border transition-colors flex items-center gap-2 cursor-pointer ${
                appTheme === 'mocha'
                  ? 'bg-[#1F1813] text-[#EDE4D3] border-[#524032] hover:bg-[#362A21]'
                  : 'bg-[#2A2A30] text-gray-300 border-[#3A3A42] hover:bg-[#323238] hover:text-white'
              }`}
            >
              <ZoomIn className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{t('Reset View')}</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 transition-colors cursor-pointer ${
                appTheme === 'mocha'
                  ? 'hover:bg-[#362A21] text-[#EDE4D3] border border-[#524032] bg-[#1F1813]'
                  : 'hover:bg-[#323238] text-gray-400 hover:text-white'
              }`}
              title={isFullscreen ? t('Exit Fullscreen') : t('Enter Fullscreen')}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`p-1.5 transition-colors cursor-pointer ${
                !isSidebarOpen 
                  ? (appTheme === 'mocha' ? 'bg-[#1F1813] border border-[#C48A58] text-[#C48A58]' : 'bg-[#2A2A30] border border-[#3A3A42] text-[var(--accent)] hover:text-white')
                  : (appTheme === 'mocha' ? 'border border-[#524032] bg-[#1F1813] text-[#EDE4D3] hover:bg-[#362A21]' : 'hover:bg-[#323238] text-gray-400 hover:text-white')
              }`}
              title={isSidebarOpen ? t('Hide Sidebar') : t('Show Sidebar')}
            >
              {sidebarPosition === 'left' ? (
                isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />
              ) : (
                isSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setSidebarPosition(prev => prev === 'left' ? 'right' : 'left')}
              className={`p-1.5 transition-colors cursor-pointer ${
                appTheme === 'mocha'
                  ? 'border border-[#524032] bg-[#1F1813] text-[#EDE4D3] hover:bg-[#362A21]'
                  : 'hover:bg-[#323238] text-gray-400 hover:text-white'
              }`}
              title={t('Toggle Sidebar Position')}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Viewport Area */}
        <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:24px_24px]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent opacity-80 pointer-events-none"></div>
          
          {isHUDControlsVisible && (
            <div 
              className="canvas-hud absolute top-4 left-4 z-20 flex items-center h-12 gap-6 px-5 transition-opacity"
              style={{ opacity: hudOpacity }}
            >
              {hudPanelTab === 'formation' && (
                <>
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>Scale</span>
                    <input 
                      type="range" min="0.5" max="2.5" step="0.1" value={personScale} 
                      onChange={(e) => setPersonScale(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{personScale.toFixed(1)}</span>
                  </div>
                    
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>Level</span>
                    <input 
                      type="range" min="1" max="8" value={formationLevel} 
                      onChange={(e) => setFormationLevel(parseInt(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{formationLevel}</span>
                  </div>
                    
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>Space</span>
                    <input 
                      type="range" min="1" max="5" step="0.5" value={formationSpacing} 
                      onChange={(e) => setFormationSpacing(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{formationSpacing.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                     <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                       appTheme === 'mocha' 
                         ? 'text-[#1F1813] font-black drop-shadow-sm' 
                         : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                     }`}>Format</span>
                     <div className="flex gap-0.5">
                       {(
                         [
                           { id: 'square', icon: LayoutGrid },
                           { id: 'circle', icon: Target },
                           { id: 'triangle', icon: Triangle },
                           { id: 'cross', icon: Plus },
                           { id: 'ring', icon: Circle },
                           { id: 'spiral', icon: Tornado }
                         ] as const
                       ).map(({ id, icon: Icon }) => (
                         <button
                           key={id}
                           onClick={() => setFormationType(id as any)}
                           className={`p-1.5 transition-all drop-shadow-md rounded cursor-pointer ${ 
                             formationType === id 
                               ? (appTheme === 'mocha' ? 'bg-[#C48A58] text-[#1F1813] font-black border border-[#A87242] shadow-md ring-1 ring-[#C48A58]' : 'bg-gray-500 text-white')
                               : (appTheme === 'mocha' 
                                   ? 'bg-[#1F1813] text-[#EDE4D3] hover:text-white hover:bg-[#362A21] border border-[#524032]' 
                                   : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-800 bg-white/50 hover:bg-white/80' : 'text-gray-300 bg-[#121214]/50 hover:bg-[#121214]/80'))
                           }`}
                           title={id.charAt(0).toUpperCase() + id.slice(1)}
                         >
                           <Icon className="w-3.5 h-3.5" />
                         </button>
                       ))}
                     </div>
                  </div>
                </>
              )}
              {hudPanelTab === 'shadow' && (
                <>
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>{t('Shadow Op')}</span>
                    <input 
                      type="range" min="0" max="1" step="0.05" value={shadowOpacity} 
                      onChange={(e) => setShadowOpacity(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{shadowOpacity.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>{t('Angle')}</span>
                    <input 
                      type="range" min="0" max="6.28" step="0.1" value={shadowAngle} 
                      onChange={(e) => setShadowAngle(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{(shadowAngle * (180/Math.PI)).toFixed(0)}°</span>
                  </div>

                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>{t('Length')}</span>
                    <input 
                      type="range" min="0.5" max="5" step="0.1" value={shadowLength} 
                      onChange={(e) => setShadowLength(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{shadowLength.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>{t('Blur')}</span>
                    <input 
                      type="range" min="0" max="25" step="0.1" value={shadowBlur} 
                      onChange={(e) => setShadowBlur(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{shadowBlur.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex items-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] ml-2">
                    <button 
                      onClick={() => {
                        setShadowOpacity(0.15);
                        setShadowAngle(0.6981317007977318);
                        setShadowLength(0.8);
                        setShadowBlur(5.0);
                      }}
                      className={`px-3 py-1 ${
                        appTheme === 'mocha'
                          ? 'bg-[#1F1813] text-[#EDE4D3] border border-[#524032] hover:bg-[#362A21] hover:text-white'
                          : (appTheme === 'light' || appTheme === 'peper' ? 'bg-white/70 text-gray-800 border-gray-300 hover:bg-white' : 'bg-[#2A2A30] text-gray-300 border-[#3A3A42] hover:bg-[#323238]')
                      } text-[10px] font-mono font-bold uppercase tracking-widest border transition-colors flex items-center gap-2 drop-shadow-md cursor-pointer`}
                      title={t('Reset Shadow Settings')}
                    >
                      <RefreshCw className="w-3 h-3" />
                      {t('Reset Shadow')}
                    </button>
                  </div>
                </>
              )}
              {hudPanelTab === 'display' && (
                <>
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${
                      appTheme === 'mocha' 
                        ? 'text-[#1F1813] font-black drop-shadow-sm' 
                        : (appTheme === 'light' || appTheme === 'peper' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black')
                    }`}>{t('HUD Opacity')}</span>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" value={hudOpacity} 
                      onChange={(e) => setHudOpacity(parseFloat(e.target.value))}
                      className={`w-20 h-1 appearance-none cursor-pointer rounded-full drop-shadow-md ${
                        appTheme === 'mocha' ? 'bg-[#7C6856] accent-[#C48A58]' : 'bg-[#4A4A52] accent-gray-300'
                      }`}
                    />
                    <span className={`text-[8px] font-mono font-bold min-w-[20px] text-center py-[1.5px] px-[2px] leading-none flex items-center justify-center drop-shadow-md ${
                      appTheme === 'mocha' ? 'bg-[#120E0B] text-[#EDE4D3] border border-[#524032]' : 'bg-[#2A2A30] text-white border border-[#3A3A42]'
                    }`}>{hudOpacity.toFixed(2)}</span>
                  </div>
                  
                </>
              )}
            </div>
          )}

          <Canvas 
            shadows={{ type: THREE.PCFSoftShadowMap }}
            gl={{ 
              antialias: true,
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = true;
            }}
          >
            <PerspectiveCamera makeDefault position={[6, 6, 9]} fov={45} />
            <Environment preset="city" />
            <color attach="background" args={[customBgColor || currentTheme.bgColor]} />
              
            <ambientLight intensity={currentTheme.id === 'light-gray' ? 2.5 : 1.5} />
            <directionalLight 
              position={[
                Math.cos(shadowAngle) * 10 * shadowLength, 
                8, 
                Math.sin(shadowAngle) * 10 * shadowLength
              ]} 
              intensity={currentTheme.id === 'light-gray' ? 2.5 : 2.0} 
              castShadow 
              shadow-mapSize={[2048, 2048]}
              shadow-camera-near={0.5}
              shadow-camera-far={50}
              shadow-camera-left={-15}
              shadow-camera-right={15}
              shadow-camera-top={15}
              shadow-camera-bottom={-15}
              shadow-bias={-0.0001}
              shadow-radius={shadowBlur}
            />
            <pointLight position={[-5, 5, -5]} intensity={currentTheme.id === 'light-gray' ? 1.5 : 1.0} color="#a0c0ff" />
            <pointLight position={[5, 2, 5]} intensity={currentTheme.id === 'light-gray' ? 1.0 : 0.5} color="#ffa0a0" />
            
            <group>
              {people.map((person, i) => (
                <BlockPerson 
                  key={person.id} 
                  position={person.position} 
                  pose={currentPose} 
                  color={characterColor}
                  scale={personScale}
                />
              ))}
            </group>

            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
              <planeGeometry args={[100, 100]} />
              <shadowMaterial transparent opacity={Math.min(shadowOpacity * 3, 1)} />
            </mesh>

            <Grid 
              infiniteGrid 
              fadeDistance={50} 
              sectionColor={currentTheme.gridColor} 
              cellColor={currentTheme.gridColor} 
              position={[0, -0.02, 0]} 
            />
            <OrbitControls 
              ref={orbitRef}
              makeDefault
              enableDamping
              dampingFactor={0.05}
              minDistance={2}
              maxDistance={30}
              maxPolarAngle={Math.PI}
            />
            <CinematicCamera 
              isAutoCamera={isAutoCamera} 
              isSlowRotate={isSlowRotate} 
              autoCameraSpeed={autoCameraSpeed} 
              autoCameraMinHeight={autoCameraMinHeight}
              autoCameraMaxHeight={autoCameraMaxHeight}
              autoCameraMinDistance={autoCameraMinDistance}
              autoCameraMaxDistance={autoCameraMaxDistance}
              autoCameraReverse={autoCameraReverse}
              rotateSpeed={rotateSpeed} 
              isEditing={isEditing} 
              orbitRef={orbitRef} 
            />
          </Canvas>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}


