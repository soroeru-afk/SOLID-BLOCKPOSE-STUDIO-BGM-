import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Center, PerspectiveCamera, ContactShadows, Environment } from '@react-three/drei';
import { BlockPerson } from './components/BlockPerson';
import { POSES as INITIAL_POSES, THEMES } from './constants';
import { ThemeId, PosePreset, PoseAngles } from './types';
import { 
  User, Palette, Settings2, ZoomIn, RefreshCw, Layers, 
  Play, Pause, Plus, Minus, Save, Trash2, Edit3, SlidersHorizontal,
  Download, Upload, Volume2, VolumeX, Music, Music2,
  Camera, Video, Square, GripVertical, ChevronsUp, ChevronsDown,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  LayoutGrid, Circle, Triangle, Target, Tornado, List, FolderPlus,
  SkipBack, SkipForward, Zap, Maximize, Minimize, Check, Monitor
} from 'lucide-react';
import { SoundManager, SoundEffectType } from './lib/sound';
import { AudioDB, StoredTrack } from './lib/audioDb';

const STORAGE_KEY = 'voxelpose_pro_settings';

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('PCFSoftShadowMap has been deprecated')) return;
  originalWarn(...args);
};

const CinematicCamera = ({ isAutoCamera, isSlowRotate, autoCameraSpeed, rotateSpeed, isEditing, orbitRef }: { isAutoCamera: boolean, isSlowRotate: boolean, autoCameraSpeed: number, rotateSpeed: number, isEditing: boolean, orbitRef: any }) => {
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
        orbitRef.current.autoRotateSpeed = autoCameraSpeed * 2.5;
        
        // Smooth Target Breathing
        const targetX = Math.sin(time * 0.5) * 0.8;
        const targetZ = Math.cos(time * 0.3) * 0.8;
        orbitRef.current.target.x = THREE.MathUtils.lerp(orbitRef.current.target.x, targetX, 0.03);
        orbitRef.current.target.z = THREE.MathUtils.lerp(orbitRef.current.target.z, targetZ, 0.03);
        
        orbitRef.current.update();
      }

      // Vertical oscillation & subtle zoom - Smooth Transition
      const camera = state.camera;
      const targetY = 8 + Math.sin(time) * 4;
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
      
      // Subtle focal depth variation
      if (camera instanceof THREE.PerspectiveCamera) {
        const targetFov = 45 + Math.cos(time * 0.4) * 5;
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
  // State Initialization from LocalStorage
  const [poses, setPoses] = useState<PosePreset[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_poses`);
    return saved ? JSON.parse(saved) : INITIAL_POSES;
  });
  const [poseId, setPoseId] = useState(() => localStorage.getItem(`${STORAGE_KEY}_poseId`) || INITIAL_POSES[0].id);
  const [themeId, setThemeId] = useState<ThemeId>(() => (localStorage.getItem(`${STORAGE_KEY}_themeId`) as ThemeId) || 'light-gray');
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
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isAdvancedOptionsOpen`) !== 'false');
  const [isEffectSettingOpen, setIsEffectSettingOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isEffectSettingOpen`) !== 'false');
  const [isBgmSettingOpen, setIsBgmSettingOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isBgmSettingOpen`) !== 'false');

  // UI Theme settings
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_accentColor`) || '#80858C');
  const [characterColor, setCharacterColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_characterColor`) || '#0F172A');
  const [savedCustomCharacterColor, setSavedCustomCharacterColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_savedCustomCharacterColor`) || '#ffffff');
  const [savedCustomBgColor, setSavedCustomBgColor] = useState(() => localStorage.getItem(`${STORAGE_KEY}_savedCustomBgColor`) || '#000000');
  const [isColorSettingsOpen, setIsColorSettingsOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isColorSettingsOpen`) !== 'false');
  const [activeTab, setActiveTab] = useState<'visual' | 'sound'>('visual');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isSidebarOpen`) !== 'false');
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => (localStorage.getItem(`${STORAGE_KEY}_sidebarPosition`) as 'left' | 'right') || 'left');
  const [appTheme, setAppTheme] = useState<'colors' | 'black' | 'light' | 'red'>(() => (localStorage.getItem(`${STORAGE_KEY}_appTheme`) as any) || 'black');
  const [isHUDControlsVisible, setIsHUDControlsVisible] = useState(() => localStorage.getItem(`${STORAGE_KEY}_isHUDControlsVisible`) !== 'false');
  const [hudPanelTab, setHudPanelTab] = useState<'formation' | 'shadow' | 'display'>('formation');
  const [hudOpacity, setHudOpacity] = useState(() => parseFloat(localStorage.getItem(`${STORAGE_KEY}_hudOpacity`) || '0.9'));
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
    localStorage.setItem(`${STORAGE_KEY}_isAdvancedOptionsOpen`, isAdvancedOptionsOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isEffectSettingOpen`, isEffectSettingOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isBgmSettingOpen`, isBgmSettingOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_accentColor`, accentColor);
    localStorage.setItem(`${STORAGE_KEY}_characterColor`, characterColor);
    localStorage.setItem(`${STORAGE_KEY}_savedCustomCharacterColor`, savedCustomCharacterColor);
    localStorage.setItem(`${STORAGE_KEY}_savedCustomBgColor`, savedCustomBgColor);
    localStorage.setItem(`${STORAGE_KEY}_isColorSettingsOpen`, isColorSettingsOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_isSidebarOpen`, isSidebarOpen.toString());
    localStorage.setItem(`${STORAGE_KEY}_sidebarPosition`, sidebarPosition);
    localStorage.setItem(`${STORAGE_KEY}_appTheme`, appTheme);
    localStorage.setItem(`${STORAGE_KEY}_isHUDControlsVisible`, isHUDControlsVisible.toString());
    localStorage.setItem(`${STORAGE_KEY}_hudOpacity`, hudOpacity.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowOpacity`, shadowOpacity.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowAngle`, shadowAngle.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowBlur`, shadowBlur.toString());
    localStorage.setItem(`${STORAGE_KEY}_shadowLength`, shadowLength.toString());
  }, [poses, poseId, themeId, formationLevel, formationType, formationSpacing, personScale, isAutoCycle, isRandomCycle, isSlowRotate, rotateSpeed, cycleSpeed, customBgColor, soundType, sfxVolume, bgmVolume, isSfxMuted, isAutoCamera, isAutoFormation, isRandomFormation, autoCameraSpeed, isAdvancedOptionsOpen, isEffectSettingOpen, isBgmSettingOpen, accentColor, characterColor, savedCustomCharacterColor, savedCustomBgColor, isColorSettingsOpen, isSidebarOpen, sidebarPosition, appTheme, isHUDControlsVisible, hudOpacity, shadowOpacity, shadowAngle, shadowBlur, shadowLength]);

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
    try {
      // Generate Base64 for all BGM tracks
      const serializedTracks = await Promise.all(allTracks.map(async (t) => {
        return new Promise<{id: string, name: string, data: string}>((resolve) => {
          if (!t.file) {
            resolve({ id: t.id, name: t.name, data: '' });
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ id: t.id, name: t.name, data: reader.result as string });
          reader.onerror = () => resolve({ id: t.id, name: t.name, data: '' });
          reader.readAsDataURL(t.file);
        });
      }));

      const data = {
        poses, poseId, themeId, formationLevel, formationType, formationSpacing, personScale, isAutoCycle, isRandomCycle, isSlowRotate, rotateSpeed, cycleSpeed, customBgColor,
        soundType, sfxVolume, bgmVolume, isSfxMuted, isAutoCamera, isAutoFormation, isRandomFormation, autoCameraSpeed, accentColor,
        characterColor, savedCustomCharacterColor, savedCustomBgColor, isColorSettingsOpen, isSidebarOpen, sidebarPosition, isHUDControlsVisible, hudOpacity, shadowOpacity, shadowAngle, shadowBlur, shadowLength,
        playlists, activePlaylistId, isPlaylistExpanded,
        tracks: serializedTracks
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `voxelpose_settings_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export settings: ' + (err instanceof Error ? err.message : String(err)));
    }
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
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.characterColor) setCharacterColor(data.characterColor);
        if (data.savedCustomCharacterColor) setSavedCustomCharacterColor(data.savedCustomCharacterColor);
        if (data.savedCustomBgColor) setSavedCustomBgColor(data.savedCustomBgColor);
        if (data.isColorSettingsOpen !== undefined) setIsColorSettingsOpen(data.isColorSettingsOpen);
        if (data.isSidebarOpen !== undefined) setIsSidebarOpen(data.isSidebarOpen);
        if (data.sidebarPosition) setSidebarPosition(data.sidebarPosition);
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
    text: appTheme === 'light' ? 'text-[#009FBA]' : 'text-[#05DFFC]',
    bg: appTheme === 'light' ? 'bg-[#009FBA]' : 'bg-[#05DFFC]',
    bgMuted: appTheme === 'light' ? 'bg-[#009FBA]/10' : 'bg-[#05DFFC]/10',
    border: appTheme === 'light' ? 'border-[#009FBA]' : 'border-[#05DFFC]',
    accent: appTheme === 'light' ? 'accent-[#009FBA]' : 'accent-[#05DFFC]',
  };

  return (
    <div 
      className={`flex h-screen w-full overflow-hidden bg-[#121214] text-[#E1E1E6] font-sans ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ '--accent': appTheme === 'red' ? '#7A1F1F' : accentColor } as React.CSSProperties}
    >
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0 }}
            animate={{ width: 300 }}
            exit={{ width: 0 }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
            className="bg-[#1E1E22] border-r border-[#323238] flex flex-col z-20 shadow-2xl flex-shrink-0 overflow-hidden"
          >
            <div className="w-[300px] flex flex-col h-full">
              <div className="p-5 border-b border-[#323238]">
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
                    <span className={`text-base font-black leading-none tracking-wider ${appTheme === 'red' ? 'text-white' : ''}`}>SOLID BLOCKPOSE</span>
                    <span className="text-[var(--accent)] text-xs mt-0.5 tracking-widest">STUDIO BGM+</span>
                  </span>
                </h1>
                <p className="text-[9px] text-gray-500 mt-1.5 uppercase tracking-widest font-bold">Studio Edition</p>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Tabs header */}
          <div className="flex border-b border-[#323238] sticky top-0 bg-[#1e1e22] z-20">
            <button 
              onClick={() => setActiveTab('visual')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'visual' ? 'text-white border-[var(--accent)] bg-[var(--accent)]/5' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Visual
            </button>
            <button 
              onClick={() => setActiveTab('sound')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2 ${
                activeTab === 'sound' ? 'text-white border-[var(--accent)] bg-[var(--accent)]/5' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <Music className="w-3.5 h-3.5" /> Sound
            </button>
          </div>

          {activeTab === 'visual' ? (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-h-0">
              {/* Controls Hook */}
              <div className="flex-shrink-0 p-4 border-b border-[#323238] bg-[var(--accent)]/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isAutoCycle ? <Play className={`w-4 h-4 ${highlightClasses.text} opacity-80`} /> : <Pause className="w-4 h-4 text-gray-500" />}
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Auto Cycle</span>
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
                    className={`w-10 h-5  transition-colors relative border ${isAutoCycle ? `bg-transparent ${highlightClasses.border}` : 'border-gray-500 bg-[#1a1a1e]'}`}
                  >
                    <div className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoCycle ? `${highlightClasses.bg} right-[1px]` : 'bg-gray-500 left-[1px]'}`} />
                  </button>
                </div>
                
                <div className="pt-3">
                    <div className={`flex items-center justify-between mb-4 pb-4 border-b ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'}`}>
                      <div className="flex gap-4">
                        <div className="flex flex-col gap-1.5">
                           <span className={`text-[8px] font-bold uppercase tracking-widest leading-none ${appTheme === 'red' ? 'text-white' : 'text-gray-500'}`}>SOUND</span>
                           <button 
                             onClick={toggleSound}
                             className={`flex items-center justify-center gap-1.5 w-[84px] py-1  border transition-colors ${
                               isSoundOn 
                                 ? (isAutoCycle ? `bg-transparent ${highlightClasses.border} ${highlightClasses.text}` : (appTheme === 'light' ? 'bg-transparent border-gray-400 text-gray-800' : 'bg-transparent border-gray-300 text-gray-200'))
                                 : 'border-gray-500 bg-[#1a1a1e] text-gray-500'
                             }`}
                           >
                             {isSoundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                             <span className="text-[9px] uppercase font-bold">{isSoundOn ? 'ON' : 'OFF'}</span>
                           </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <span className={`text-[8px] font-bold uppercase tracking-widest leading-none ${appTheme === 'red' ? 'text-white' : 'text-gray-500'}`}>MODE</span>
                           <div className="flex items-center h-[26px] w-[96px] bg-[#1a1a1e] border border-[#323238]  p-0.5">
                             <button
                               onClick={() => changeSoundMode('bgm')}
                               className={`flex-1 flex items-center justify-center h-full  transition-colors text-[9px] font-bold tracking-widest ${soundMode === 'bgm' ? 'bg-[#323238] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                             >
                               BGM
                             </button>
                             <button
                               onClick={() => changeSoundMode('sfx')}
                               className={`flex-1 flex items-center justify-center h-full  transition-colors text-[9px] font-bold tracking-widest ${soundMode === 'sfx' ? 'bg-[#323238] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                             >
                               SFX
                             </button>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Cycle Interval</label>
                      <span className={`text-[9px] font-mono font-bold ${isAutoCycle ? `${highlightClasses.text} ${highlightClasses.bgMuted}` : 'text-gray-500 bg-[#1a1a1e]'} px-1.5 py-0.5  transition-colors`}>{(cycleSpeed / 1000).toFixed(2)}s</span>
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
                      className={`w-full h-1 bg-gray-700  appearance-none cursor-pointer ${isAutoCycle ? highlightClasses.accent : 'accent-gray-500'} transition-colors`}
                    />

                    <div className={`flex items-center justify-between pt-4 mt-2 border-t ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'}`}>
                      <div className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${isRandomCycle ? highlightClasses.text : 'text-gray-500'}`} />
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Random Pose</span>
                      </div>
                      <button 
                        onClick={() => setIsRandomCycle(!isRandomCycle)}
                        className={`w-10 h-5  transition-colors relative border ${isRandomCycle ? `bg-transparent ${highlightClasses.border}` : 'border-gray-500 bg-[#1a1a1e]'}`}
                      >
                        <div className={`absolute top-[1px] w-4 h-4  transition-all ${isRandomCycle ? `${highlightClasses.bg} right-[1px]` : 'bg-gray-500 left-[1px]'}`} />
                      </button>
                    </div>

                    <div className={`pt-4 mt-2 border-t ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera className={`w-4 h-4 ${isSlowRotate ? highlightClasses.text : 'text-gray-500'}`} />
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Auto Turn</span>
                        </div>
                        <button 
                          onClick={() => setIsSlowRotate(!isSlowRotate)}
                          className={`w-10 h-5  transition-colors relative border ${isSlowRotate ? `bg-transparent ${highlightClasses.border}` : 'border-gray-500 bg-[#1a1a1e]'}`}
                        >
                          <div className={`absolute top-[1px] w-4 h-4  transition-all ${isSlowRotate ? `${highlightClasses.bg} right-[1px]` : 'bg-gray-500 left-[1px]'}`} />
                        </button>
                      </div>
                      
                      {isSlowRotate && (
                        <div className="pt-3 pb-1">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Turn Speed</label>
                            <span className={`text-[9px] font-mono font-bold ${highlightClasses.text} px-1.5 py-0.5 ${highlightClasses.bgMuted} `}>{rotateSpeed.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range" min="0.1" max="10" step="0.1" value={rotateSpeed} 
                            onChange={(e) => setRotateSpeed(parseFloat(e.target.value))}
                            className={`w-full h-1 bg-gray-700  appearance-none cursor-pointer ${highlightClasses.accent}`}
                          />
                        </div>
                      )}
                    </div>

                    <div className={`pt-4 mt-2 border-t ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'}`}>
                      <button 
                        onClick={() => setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen)}
                        className="flex items-center justify-between w-full mb-3 group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1 h-3  transition-colors ${isAdvancedOptionsOpen ? highlightClasses.bg : 'bg-gray-600'}`}></div>
                          <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isAdvancedOptionsOpen ? (appTheme === 'light' ? 'text-gray-800' : 'text-[#E1E1E6]') : (appTheme === 'light' ? 'text-gray-500 group-hover:text-gray-600' : (appTheme === 'red' ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'))}`}>Advanced Cycle Options</span>
                        </div>
                        <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${appTheme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1a1a1e] border-gray-500'} ${isAdvancedOptionsOpen ? highlightClasses.border : (appTheme === 'light' ? 'group-hover:border-gray-400' : 'group-hover:border-gray-500')}`}>
                          {isAdvancedOptionsOpen ? <Minus className={`w-3 h-3 ${highlightClasses.text}`} /> : <Plus className="w-3 h-3 text-gray-500" />}
                        </div>
                      </button>
                      
                      {isAdvancedOptionsOpen && (
                        <div className={`-mx-2 px-2 py-3 border space-y-4 ${appTheme === 'light' ? 'bg-gray-100/50 border-gray-200' : (appTheme === 'black' ? 'bg-[#1a1a1e]/40 border-[#4A4A52]' : 'bg-[#1a1a1e]/60 border-[#323238]')}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className={`w-4 h-4 ${isAutoFormation ? 'text-amber-400' : 'text-gray-500'}`} />
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Auto Format Change</span>
                            </div>
                          <button 
                            onClick={() => setIsAutoFormation(!isAutoFormation)}
                            className={`w-10 h-5  transition-colors relative border ${isAutoFormation ? 'bg-transparent border-amber-500' : (appTheme === 'light' ? 'border-gray-300 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]')}`}
                          >
                            <div className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoFormation ? 'bg-amber-500 right-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]')}`} />
                          </button>
                        </div>
                        
                        {isAutoFormation && (
                          <div className={`flex items-center justify-between pt-1 border-t ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')} mt-2`}>
                            <div className="flex items-center gap-2">
                              <Zap className={`w-4 h-4 ${isRandomFormation ? 'text-amber-400' : 'text-gray-500'}`} />
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Random Format Change</span>
                            </div>
                            <button 
                              onClick={() => setIsRandomFormation(!isRandomFormation)}
                              className={`w-10 h-5  transition-colors relative border ${isRandomFormation ? 'bg-transparent border-amber-500' : (appTheme === 'light' ? 'border-gray-300 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]')}`}
                            >
                              <div className={`absolute top-[1px] w-4 h-4  transition-all ${isRandomFormation ? 'bg-amber-500 right-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]')}`} />
                            </button>
                          </div>
                        )}

                        <div className={`pt-2 border-t ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')} space-y-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Video className={`w-4 h-4 ${isAutoCamera ? 'text-red-400' : 'text-gray-500'}`} />
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Cinematic View</span>
                            </div>
                            <button 
                              onClick={() => setIsAutoCamera(!isAutoCamera)}
                              className={`w-10 h-5  transition-colors relative border ${isAutoCamera ? 'bg-transparent border-red-500' : (appTheme === 'light' ? 'border-gray-300 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]')}`}
                            >
                              <div className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoCamera ? 'bg-red-500 right-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]')}`} />
                            </button>
                          </div>

                          {isAutoCamera && (
                            <div className="pt-2 pb-2 space-y-4">
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[9px] font-bold text-gray-500 uppercase">Camera Intensity</label>
                                  <span className="text-[9px] font-mono font-bold text-red-400 px-1.5 py-0.5 bg-red-500/10 ">{autoCameraSpeed.toFixed(1)}x</span>
                                </div>
                                <input 
                                  type="range" min="0.1" max="10" step="0.1" value={autoCameraSpeed} 
                                  onChange={(e) => setAutoCameraSpeed(parseFloat(e.target.value))}
                                  className={`w-full h-1 appearance-none cursor-pointer accent-red-500 ${appTheme === 'light' ? 'bg-gray-300' : 'bg-gray-700'}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-x-hidden overflow-y-auto dark-scrollbar pb-6">
              {!isEditing ? (
                <div className="p-4 border-b border-[#323238]">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Pose Library</label>
                    <button 
                      onClick={() => startEditing()}
                      className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" /> NEW
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                    {poses.map((pose, idx) => {
                      const isActive = poseId === pose.id && !isAutoCycle;
                      const isCustom = pose.id.startsWith('custom-');
                      return (
                        <div
                          key={pose.id}
                          onClick={() => handlePoseChange(pose.id)}
                          className={`text-left p-2  border transition-all flex flex-col justify-between h-[45px] relative overflow-hidden group cursor-pointer ${
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
                                  className="p-1 hover:bg-white/20  cursor-pointer"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                                <button 
                                  onClick={(e) => deletePose(pose.id, e)} 
                                  className="p-1 hover:bg-red-500/50  cursor-pointer"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] font-mono mt-1 ${isActive ? 'text-white/40' : 'text-gray-600'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {isActive && (
                            <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 -3xl -mr-2 -mt-2" />
                          )}
                          {!isActive && poseId === pose.id && isAutoCycle && (
                            <div className="absolute inset-0 border border-[var(--accent)]/50  pointer-events-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 border-b border-[#323238] bg-[var(--accent)]/10">
                  <div className="flex justify-between items-center mb-4">
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

                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase block mb-1 font-bold">Pose Name</label>
                      <input 
                        type="text"
                        value={editPoseName}
                        onChange={(e) => setEditPoseName(e.target.value)}
                        placeholder="Pose name..."
                        className="w-full bg-[#121214] border border-[#323238]  p-2 text-xs focus:border-[var(--accent)] outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2  bg-black/20 border border-[#323238]">
                      <div className="flex items-center gap-2">
                        <Layers className={`w-3 h-3 ${isSymmetric ? 'text-[var(--accent)]' : 'text-gray-500'}`} />
                        <span className="text-[10px] uppercase font-bold text-gray-400">Mirror Symmetry</span>
                      </div>
                      <button 
                        onClick={() => setIsSymmetric(!isSymmetric)}
                        className={`w-8 h-4  transition-colors relative ${isSymmetric ? 'bg-[var(--accent)]' : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white  transition-all ${isSymmetric ? 'right-0.5' : 'left-0.5'}`} />
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
                      className="w-full py-2 bg-[#2A2A30] hover:bg-[#323238]  border border-[#323238] text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      All Reset
                    </button>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
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
                              <span className={`text-[9px] font-mono font-bold px-1  ${degVal === 0 ? 'text-gray-500 bg-gray-500/10' : 'text-[var(--accent)] bg-[var(--accent)]/10'}`}>
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
                            className={`w-full h-1 bg-[#2A2A30]  appearance-none cursor-pointer ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Theme & Layout Settings */}
              <div className="border-b border-[#323238]">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setIsColorSettingsOpen(!isColorSettingsOpen)}
                >
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2 cursor-pointer">
                    <Palette className="w-3.5 h-3.5" /> Colors
                  </label>
                  {isColorSettingsOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>

                <AnimatePresence>
                  {isColorSettingsOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-[#121214] border-t border-[#323238]"
                    >
                      <div className="p-4 space-y-4">
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Character Color</label>
                            <button 
                              onClick={() => setCharacterColor('#0F172A')}
                              className="text-[8px] text-gray-500 hover:text-white underline uppercase font-bold transition-colors"
                            >
                              RESET
                            </button>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {['#0F172A', '#475569', '#3F5064', '#355E42', '#7A5026', '#753434', '#5C0909'].map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setCharacterColor(color)}
                                  className={`w-6 h-6  border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center ${
                                    characterColor === color ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title="Character Color"
                                >
                                  {characterColor === color && <div className={`w-1.5 h-1.5  bg-white shadow-sm mix-blend-difference`} />}
                                </button>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-3 pt-2 border-t border-[#323238]/50 mt-1">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Custom</span>
                              <div className={`relative w-6 h-6  border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center overflow-hidden ${
                                !['#0F172A', '#475569', '#3F5064', '#355E42', '#7A5026', '#753434', '#4B4069'].includes(characterColor) ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                              }`}>
                                <input 
                                  type="color" 
                                  value={savedCustomCharacterColor}
                                  onChange={(e) => {
                                    setSavedCustomCharacterColor(e.target.value);
                                    setCharacterColor(e.target.value);
                                  }}
                                  onClick={() => {
                                    setCharacterColor(savedCustomCharacterColor);
                                  }}
                                  className="absolute inset-0 w-10 h-10 -ml-2 -mt-2 cursor-pointer bg-transparent border-none appearance-none group-hover:scale-110"
                                  title="Custom Character Color"
                                />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-difference">
                                  <Plus className="w-3 h-3 text-white opacity-75" />
                                </div>
                                {!['#475569', '#3F5064', '#355E42', '#7A5026', '#753434', '#5C0909', '#0F172A'].includes(characterColor) && <div className="w-1.5 h-1.5  bg-white shadow-sm pointer-events-none absolute mix-blend-difference" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#323238]">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Visual Themes</label>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {THEMES.map((theme) => (
                                <button
                                  key={theme.id}
                                  onClick={() => {
                                    setThemeId(theme.id);
                                    setCustomBgColor(null);
                                  }}
                                  className={`w-6 h-6  border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center ${
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
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Custom</span>
                              <div className={`relative w-6 h-6 border border-[#323238] transition-transform hover:scale-110 flex items-center justify-center overflow-hidden ${
                                customBgColor ? 'border-white ring-2 ring-[var(--accent)]/30 z-10' : ''
                              }`}>
                                <input 
                                  type="color" 
                                  value={savedCustomBgColor}
                                  onChange={(e) => {
                                    setSavedCustomBgColor(e.target.value);
                                    setCustomBgColor(e.target.value);
                                  }}
                                  onClick={() => setCustomBgColor(savedCustomBgColor)}
                                  className="absolute inset-0 w-10 h-10 -ml-2 -mt-2 cursor-pointer bg-transparent border-none appearance-none group-hover:scale-110"
                                  title="Custom Background Color"
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-auto p-6 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={exportSettings}
                    className={`flex items-center justify-center gap-2 p-2 bg-[#2A2A30] hover:bg-[#323238] text-[10px] font-bold transition-colors border border-[#323238] ${appTheme === 'red' ? 'text-white' : 'text-gray-300'}`}
                  >
                    <Download className="w-3 h-3" /> EXPORT
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center justify-center gap-2 p-2 bg-[#2A2A30] hover:bg-[#323238] text-[10px] font-bold transition-colors border border-[#323238] ${appTheme === 'red' ? 'text-white' : 'text-gray-300'}`}
                  >
                    <Upload className="w-3 h-3" /> IMPORT
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={importSettings} 
                  accept=".json" 
                  className="hidden" 
                />
                <div className="bg-[var(--accent)]/10 p-4  border border-[var(--accent)]/20">
                  <p className="text-xs text-[var(--accent)] font-medium">Auto-save Ready</p>
                  <p className="text-[10px] text-[var(--accent)]/60 uppercase tracking-tighter">Workspace persistence active</p>
                </div>
              </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-left-2 duration-300 overflow-hidden min-h-0">
              <div className="p-4 space-y-4 border-b border-[#323238] bg-[var(--accent)]/5 flex-shrink-0">
                <div className="space-y-4">
                  <div className={`p-3  flex flex-col gap-3 relative ${appTheme === 'light' ? 'bg-white border border-gray-200' : (appTheme === 'black' ? 'bg-[#1a1a1e]/40 border border-[#4A4A52]' : 'bg-[#1a1a1e]/40 border border-[#323238]')}`}>
                    <button 
                      onClick={() => setIsEffectSettingOpen(!isEffectSettingOpen)}
                      className={`flex items-center justify-between w-full ${isEffectSettingOpen ? 'border-b pb-2 mb-1' : ''} ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')} group`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-3  transition-colors ${isEffectSettingOpen ? highlightClasses.bg : 'bg-gray-600'}`}></div>
                        <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isEffectSettingOpen ? (appTheme === 'light' ? 'text-gray-800' : 'text-[#E1E1E6]') : 'text-gray-500 group-hover:text-gray-400'}`}>EFFECT SETTING</span>
                      </div>
                      <div className={`w-5 h-5  border flex items-center justify-center transition-colors ${appTheme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1a1a1e] border-[#323238]'} ${isEffectSettingOpen ? highlightClasses.border : 'group-hover:border-gray-400'}`}>
                        {isEffectSettingOpen ? <Minus className={`w-3 h-3 ${highlightClasses.text}`} /> : <Plus className="w-3 h-3 text-gray-500" />}
                      </div>
                    </button>
                    
                    {isEffectSettingOpen && (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] text-gray-500 uppercase font-bold">Effect Style</label>
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
                              className={`h-6  border transition-all text-[8px] font-bold uppercase ${
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
                              <label className="text-[9px] text-gray-500 uppercase font-bold">SFX Volume</label>
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01" value={sfxVolume} 
                            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                            className={`w-full h-1  appearance-none cursor-pointer ${appTheme === 'light' ? 'bg-gray-300 accent-gray-500' : `${appTheme === 'black' ? 'bg-[#4A4A52]' : 'bg-[#2A2A30]'} ${highlightClasses.accent}`}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`p-3  flex flex-col gap-3 relative ${appTheme === 'light' ? 'bg-white border border-gray-200' : (appTheme === 'black' ? 'bg-[#1a1a1e]/40 border border-[#4A4A52]' : 'bg-[#1a1a1e]/40 border border-[#323238]')}`}>
                    <button 
                      onClick={() => setIsBgmSettingOpen(!isBgmSettingOpen)}
                      className={`flex items-center justify-between w-full ${isBgmSettingOpen ? 'border-b pb-2 mb-1' : ''} ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')} group`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-3  transition-colors ${isBgmSettingOpen ? highlightClasses.bg : 'bg-gray-600'}`}></div>
                        <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isBgmSettingOpen ? (appTheme === 'light' ? 'text-gray-800' : 'text-[#E1E1E6]') : 'text-gray-500 group-hover:text-gray-400'}`}>BGM SETTING</span>
                      </div>
                      <div className={`w-5 h-5  border flex items-center justify-center transition-colors ${appTheme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1a1a1e] border-[#323238]'} ${isBgmSettingOpen ? highlightClasses.border : 'group-hover:border-gray-400'}`}>
                        {isBgmSettingOpen ? <Minus className={`w-3 h-3 ${highlightClasses.text}`} /> : <Plus className="w-3 h-3 text-gray-500" />}
                      </div>
                    </button>
                    
                    {isBgmSettingOpen && (
                      <div className="flex flex-col gap-3">
                       {/* Controls */}
                       <div className="flex flex-col gap-2 mb-0">
                         <div className="flex-1 overflow-hidden px-1 text-center">
                           <p className={`text-[11px] font-bold truncate tracking-wider ${appTheme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                             {currentBgmId !== null ? (bgmPlaylist.find(t => t.id === currentBgmId)?.name || 'NO TRACK READY') : 'NO TRACK READY'}
                           </p>
                         </div>
                         
                         <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={playPreviousTrack}
                              className={`w-10 h-8  border flex items-center justify-center transition-all shadow-sm ${appTheme === 'light' ? 'bg-gray-200 border-gray-200 hover:bg-gray-300 text-gray-600' : 'border-gray-500 bg-[#1a1a1e] hover:bg-[#323238] text-white'}`}
                              disabled={bgmPlaylist.length === 0}
                            >
                               <SkipBack className="w-4 h-4 mr-0.5" />
                            </button>
                            <button 
                              onClick={toggleBgmFromPlayer}
                              className={`w-12 h-8  border transition-all shadow-sm flex items-center justify-center ${
                                isBgmPlaying 
                                  ? (appTheme === 'light' ? `bg-gray-500 border-gray-500 text-[#ffffff]` : `bg-[#1a1a1e] ${highlightClasses.border} ${highlightClasses.text}`) 
                                  : (appTheme === 'light' ? 'bg-gray-200 border-gray-200 hover:bg-gray-300 text-gray-600' : 'border-gray-500 bg-[#1a1a1e] text-white hover:bg-[#323238]')
                              }`}
                              disabled={bgmPlaylist.length === 0}
                            >
                              {isBgmPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                            <button 
                              onClick={stopBgm}
                              className={`w-10 h-8  border flex items-center justify-center transition-all shadow-sm ${appTheme === 'light' ? 'bg-gray-200 border-gray-200 hover:bg-gray-300 text-gray-600' : 'border-gray-500 bg-[#1a1a1e] hover:bg-[#323238] text-white'}`}
                              disabled={bgmPlaylist.length === 0 || currentBgmId === null}
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button 
                              onClick={playNextTrack}
                              className={`w-10 h-8  border flex items-center justify-center transition-all shadow-sm ${appTheme === 'light' ? 'bg-gray-200 border-gray-200 hover:bg-gray-300 text-gray-600' : 'border-gray-500 bg-[#1a1a1e] hover:bg-[#323238] text-white'}`}
                              disabled={bgmPlaylist.length === 0}
                            >
                               <SkipForward className="w-4 h-4 ml-0.5" />
                            </button>

                            <button
                               onClick={() => setBgmRepeatMode(prev => prev === 0 ? 1 : prev === 1 ? 2 : 0)}
                               className={`w-10 h-8  border transition-all shadow-sm flex items-center justify-center relative ${
                                 bgmRepeatMode !== 0 
                                  ? (appTheme === 'light' ? `bg-gray-500 border-gray-500 text-[#ffffff]` : `bg-[#1a1a1e] ${highlightClasses.border} ${highlightClasses.text}`) 
                                  : (appTheme === 'light' ? 'bg-gray-200 border-gray-200 hover:bg-gray-300 text-gray-600' : 'border-gray-500 bg-[#1a1a1e] hover:bg-[#323238] text-gray-400 hover:text-white')
                               }`}
                               title={bgmRepeatMode === 1 ? "Playlist Repeat" : bgmRepeatMode === 2 ? "Track Repeat" : "Repeat Off"}
                            >
                               <RefreshCw className="w-4 h-4" />
                               {bgmRepeatMode === 2 && (
                                 <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-bold flex items-center justify-center  ${highlightClasses.bg} text-[#121214] w-3.5 h-3.5 pt-[1px]`}>1</span>
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
                             <span className="text-[10px] text-gray-400 font-mono tracking-wider">{bgmTimeStr.split(' / ')[0]}</span>
                             <span className="text-[10px] text-gray-500 font-mono tracking-wider">{bgmTimeStr.split(' / ')[1]}</span>
                          </div>
                          <div className={`w-full h-1  overflow-hidden relative pointer-events-none transition-all ${appTheme === 'light' ? 'bg-gray-300' : 'bg-[#2A2A30]'}`}>
                             <div 
                                className={`h-full ${appTheme === 'light' ? 'bg-gray-500' : highlightClasses.bg} transition-all ease-linear`}
                                style={{ width: `${Math.max(0, Math.min(100, bgmProgress * 100))}%`, transitionDuration: isBgmPlaying ? '500ms' : '0ms' }}
                             />
                          </div>
                       </div>

                       <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                             <span className="text-[8px] `text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`">BGM Volume</span>
                             <span className="text-[8px] text-gray-400 font-mono">{Math.round(bgmVolume * 100)}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01" value={bgmVolume} 
                            onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                            className={`w-full h-1  appearance-none cursor-pointer ${appTheme === 'light' ? 'bg-gray-300 accent-gray-500' : `${appTheme === 'black' ? 'bg-[#4A4A52]' : 'bg-[#2A2A30]'} ${highlightClasses.accent}`}`}
                          />
                       </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col p-4 pt-4 min-h-0 overflow-hidden">
                <div className="flex-shrink-0">
                  <label className="text-[9px] text-white uppercase font-bold flex items-center gap-1.5 mb-2">
                      <Music2 className="w-3 h-3" /> PLAYLISTS
                    </label>
                    <div className="flex gap-2 mb-3">
                      <button 
                        onClick={createPlaylist}
                        className={`flex-1 bg-[#1a1a1e] hover:bg-[#323238] text-[var(--accent)] text-[10px] font-bold uppercase py-1.5 px-3  border ${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'} transition-colors flex items-center justify-center gap-1.5`}
                      >
                        <Plus className="w-3 h-3" /> New Set
                      </button>
                      <button 
                        onClick={() => setIsPlaylistExpanded(!isPlaylistExpanded)}
                        className={`w-8 flex items-center justify-center  border transition-colors bg-[#1a1a1e] ${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'} text-gray-500 hover:text-gray-300`}
                        title="Toggle Playlist View"
                      >
                        {isPlaylistExpanded ? <ChevronDown className="w-4 h-4" /> : <List className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => setShowClearConfirm(true)}
                        className={`w-8 flex items-center justify-center  border transition-colors bg-[#1a1a1e] hover:bg-red-500/10 text-gray-500 hover:text-red-400 ${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'}`}
                        title="Delete all tracks"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">
                        Total DB Tracks:
                      </label>
                      <span className="text-[10px] text-gray-400 font-bold">{allTracks.length}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto dark-scrollbar -mx-4 px-4 pb-4 pt-3 border-t border-[#323238] min-h-0">
                    {isPlaylistExpanded ? (
                      <div className="space-y-1 mb-2">
                        {playlists.map(p => (
                          <div 
                            key={p.id} 
                            className={`flex items-center justify-between p-2  border transition-colors cursor-pointer group ${
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
                                  className="bg-black/50 text-white text-[10px] uppercase font-bold w-full px-1 py-0.5 outline-none border border-[var(--accent)] "
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
                                 title="Move Up"
                               >
                                 <ChevronUp className="w-2.5 h-2.5" />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); movePlaylist(p.id, 1); }} 
                                 className="text-gray-500 hover:text-white p-0.5"
                                 title="Move Down"
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
                                 title="Rename"
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
                                 className={`p-0.5  transition-all ${confirmDeleteId === p.id ? 'text-red-500 bg-red-500/20' : 'text-gray-500 hover:text-red-400'}`}
                                 title={confirmDeleteId === p.id ? "Click to confirm" : "Delete"}
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
                          className="w-full bg-[#121214] hover:border-gray-500 transition-colors text-[var(--accent)] text-[10px] font-bold uppercase p-2 border border-[#323238]  outline-none cursor-pointer appearance-none"
                        >
                          {playlists.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.trackIds.length})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--accent)] pointer-events-none" />
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
                          className="text-[8px] text-[var(--accent)] hover:text-white font-bold uppercase underline cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Music className="w-2.5 h-2.5" /> {isSamplesLoading ? 'Loading...' : 'Add Samples'}
                        </button>
                        <label className="text-[8px] text-[var(--accent)] hover:text-white font-bold uppercase underline cursor-pointer flex items-center gap-1">
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
                            className="bg-[#121214] w-28 text-[9px] font-bold uppercase text-[var(--accent)] border border-[#323238]  px-1.5 py-0.5 outline-none cursor-pointer hover:border-gray-500 transition-colors appearance-none"
                          >
                            <option value="" disabled>Move to...</option>
                            {playlists.filter(p => p.id !== activePlaylistId).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={removeSelectedTracks}
                          className="p-1 hover:text-red-400 text-gray-500 transition-colors border border-[#323238]  bg-[#121214]"
                          title="Delete Selected"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="space-y-1">
                        {bgmPlaylist.length > 0 ? bgmPlaylist.map((track, idx) => (
                          <div 
                            key={`${track.id}-${idx}`} 
                            onClick={() => playTrackById(track.id)}
                            className="group flex items-center justify-between p-2  border bg-[#121214] border-[#323238] hover:border-gray-500 transition-all cursor-pointer select-none"
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
                                title="Move to Top"
                              >
                                <ChevronsUp className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => moveTrackUp(idx, e)}
                                className="p-0.5 hover:text-[var(--accent)] transition-colors"
                                title="Move Up"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => moveTrackDown(idx, e)}
                                className="p-0.5 hover:text-[var(--accent)] transition-colors"
                                title="Move Down"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => moveToBottom(idx, e)}
                                className="p-0.5 hover:text-[var(--accent)] transition-colors"
                                title="Move to Bottom"
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
                      className="mt-3 border-2 border-dashed border-[#323238]  transition-colors relative flex flex-col items-center justify-center p-4 text-center group hover:border-[var(--accent)] cursor-pointer"
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
                      <p className="text-[9px] uppercase tracking-widest font-bold text-gray-500 group-hover:text-gray-300 transition-colors">Drop Audio Files Here</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

            </div>
          </motion.aside>
        )}
      </AnimatePresence>

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
        <header className="h-14 border-b border-[#323238] flex items-center justify-between px-6 bg-[#1a1a1e]/80 backdrop-blur-md z-10 flex-shrink-0">
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
              className="flex items-center gap-2"
            >
              <div className={`p-1 border  ${isHUDControlsVisible && hudPanelTab === 'formation' ? (appTheme === 'light' ? 'bg-gray-700 border-gray-700 text-[#ffffff]' : 'bg-gray-300 border-gray-300 text-[#121214]') : 'border-[#323238] text-gray-400'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest ${isHUDControlsVisible && hudPanelTab === 'formation' ? (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300') : 'text-gray-400'}`}>Formation</span>
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
              className="flex items-center gap-2"
            >
              <div className={`p-1 border  ${isHUDControlsVisible && hudPanelTab === 'shadow' ? (appTheme === 'light' ? 'bg-gray-700 border-gray-700 text-[#ffffff]' : 'bg-gray-300 border-gray-300 text-[#121214]') : 'border-[#323238] text-gray-400'}`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest ${isHUDControlsVisible && hudPanelTab === 'shadow' ? (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300') : 'text-gray-400'}`}>Shadow</span>
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
              className="flex items-center gap-2"
            >
              <div className={`p-1 border  ${isHUDControlsVisible && hudPanelTab === 'display' ? (appTheme === 'light' ? 'bg-gray-700 border-gray-700 text-[#ffffff]' : 'bg-gray-300 border-gray-300 text-[#121214]') : 'border-[#323238] text-gray-400'}`}>
                <Monitor className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest ${isHUDControlsVisible && hudPanelTab === 'display' ? (appTheme === 'light' ? 'text-gray-700' : 'text-gray-300') : 'text-gray-400'}`}>Display</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Theme:</span>
              <div className="flex  border border-[#323238] overflow-hidden bg-[#1E1E22]">
                {(['colors', 'black', 'red', 'light'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => setAppTheme(th)}
                    className={`px-3 py-1.5 text-[10px] uppercase font-bold transition-colors ${
                      appTheme === th ? 'bg-[var(--accent)] text-white' : 'text-gray-400 hover:text-white hover:bg-[#323238]'
                    }`}
                  >
                    {th === 'colors' ? 'DARK' : th}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={resetCamera}
              className="px-3 py-1.5 bg-[#2A2A30] text-[11px]  border border-[#3A3A42] hover:bg-[#323238] transition-colors flex items-center gap-2"
            >
              <ZoomIn className="w-3 h-3" />
              Reset View
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5  hover:bg-[#323238] text-gray-400 hover:text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setSidebarPosition(prev => prev === 'left' ? 'right' : 'left')}
              className="p-1.5  hover:bg-[#323238] text-gray-400 hover:text-white transition-colors"
              title="Toggle Sidebar Position"
            >
              {sidebarPosition === 'right' ? <PanelLeftOpen className="w-5 h-5 scale-x-[-1]" /> : <PanelLeftOpen className="w-5 h-5" />}
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
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Scale</span>
                    <input 
                      type="range" min="0.5" max="2.5" step="0.1" value={personScale} 
                      onChange={(e) => setPersonScale(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{personScale.toFixed(1)}</span>
                  </div>
                    
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Level</span>
                    <input 
                      type="range" min="1" max="8" value={formationLevel} 
                      onChange={(e) => setFormationLevel(parseInt(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{formationLevel}</span>
                  </div>
                    
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Space</span>
                    <input 
                      type="range" min="1" max="5" step="0.5" value={formationSpacing} 
                      onChange={(e) => setFormationSpacing(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{formationSpacing.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                     <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Format</span>
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
                           className={`p-1.5 transition-all drop-shadow-md rounded ${ 
                             formationType === id 
                               ? (appTheme === 'light' ? 'bg-gray-500 text-white' : 'bg-gray-500 text-white')
                               : (appTheme === 'light' ? 'text-gray-800 bg-white/50 hover:bg-white/80' : 'text-gray-300 bg-[#121214]/50 hover:bg-[#121214]/80')
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
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Shadow Op</span>
                    <input 
                      type="range" min="0" max="1" step="0.05" value={shadowOpacity} 
                      onChange={(e) => setShadowOpacity(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{shadowOpacity.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Angle</span>
                    <input 
                      type="range" min="0" max="6.28" step="0.1" value={shadowAngle} 
                      onChange={(e) => setShadowAngle(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{(shadowAngle * (180/Math.PI)).toFixed(0)}°</span>
                  </div>

                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Length</span>
                    <input 
                      type="range" min="0.5" max="5" step="0.1" value={shadowLength} 
                      onChange={(e) => setShadowLength(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{shadowLength.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>Blur</span>
                    <input 
                      type="range" min="0" max="25" step="0.1" value={shadowBlur} 
                      onChange={(e) => setShadowBlur(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{shadowBlur.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex items-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] ml-2">
                    <button 
                      onClick={() => {
                        setShadowOpacity(0.15);
                        setShadowAngle(0.6981317007977318);
                        setShadowLength(0.8);
                        setShadowBlur(5.0);
                      }}
                      className="px-3 py-1 bg-[#2A2A30] text-[10px] font-mono font-bold uppercase tracking-widest border border-[#3A3A42] hover:bg-[#323238] transition-colors flex items-center gap-2 drop-shadow-md text-gray-300 hover:text-white"
                      title="Reset Shadow Settings"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset Shadow
                    </button>
                  </div>
                </>
              )}
              {hudPanelTab === 'display' && (
                <>
                  <div className="flex items-center gap-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-widest ${appTheme === 'light' ? 'text-gray-900 text-outline-white' : 'text-gray-100 text-outline-black'}`}>HUD Opacity</span>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" value={hudOpacity} 
                      onChange={(e) => setHudOpacity(parseFloat(e.target.value))}
                      className={`w-20 h-1 bg-[#4A4A52] ${appTheme === 'red' ? 'accent-gray-400' : 'accent-[var(--accent)]'} appearance-none cursor-pointer rounded-full drop-shadow-md`}
                    />
                    <span className="text-[8px] font-mono font-bold min-w-[20px] text-center bg-[#2A2A30] text-white py-[1.5px] px-[2px] border border-[#3A3A42] leading-none flex items-center justify-center drop-shadow-md">{hudOpacity.toFixed(2)}</span>
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
              maxPolarAngle={Math.PI / 2 + 0.1}
            />
            <CinematicCamera 
              isAutoCamera={isAutoCamera} 
              isSlowRotate={isSlowRotate} 
              autoCameraSpeed={autoCameraSpeed} 
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




