// ============================================================
// VideoPlayer — full-screen HLS player using expo-av
// Controls: play/pause, seek bar, skip ±10s, fullscreen
// No expo-screen-orientation dependency
// ============================================================

import React, {
  useRef, useState, useCallback, useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { formatTime } from '../../utils/format';

const CONTROLS_HIDE_DELAY = 3500;

interface VideoPlayerProps {
  uri:              string;
  title:            string;
  initialPosition?: number;
  onBack:           () => void;
  onProgress:       (positionSec: number) => void;
  onComplete:       () => void;
}

export function VideoPlayer({
  uri,
  title,
  initialPosition = 0,
  onBack,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const videoRef    = useRef<Video>(null);
  const hideTimer   = useRef<ReturnType<typeof setTimeout>>();
  const seekingRef  = useRef(false);

  // Get dimensions — re-read on each render so fullscreen works
  const [dims, setDims] = useState(Dimensions.get('window'));

  const [status,           setStatus]           = useState<AVPlaybackStatus | null>(null);
  const [controlsVisible,  setControlsVisible]  = useState(true);
  const [isFullscreen,     setIsFullscreen]      = useState(false);
  const [isSeeking,        setIsSeeking]         = useState(false);
  const [seekPosition,     setSeekPosition]      = useState(0);
  const [hasResumed,       setHasResumed]        = useState(false);
  const [showResumePrompt, setShowResumePrompt]  = useState(false);

  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Listen for dimension changes (device rotation)
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => sub?.remove();
  }, []);

  const W = dims.width;
  const H = dims.height;

  // In fullscreen the video takes full screen dimensions
  const playerW = isFullscreen ? Math.max(W, H) : W;
  const playerH = isFullscreen ? Math.min(W, H) : W * (9 / 16);

  // Derived playback values
  const isPlaying   = status?.isLoaded ? status.isPlaying   : false;
  const isBuffering = status?.isLoaded ? status.isBuffering  : false;
  const duration    = status?.isLoaded ? (status.durationMillis  ?? 0) / 1000 : 0;
  const position    = isSeeking
    ? seekPosition
    : status?.isLoaded ? (status.positionMillis ?? 0) / 1000 : 0;
  const progress = duration > 0 ? position / duration : 0;

  // ── Controls visibility ────────────────────────────────────

  const showControls = useCallback(() => {
    clearTimeout(hideTimer.current);
    Animated.timing(controlsOpacity, {
      toValue: 1, duration: 150, useNativeDriver: true,
    }).start();
    setControlsVisible(true);
    hideTimer.current = setTimeout(() => {
      if (!seekingRef.current) {
        Animated.timing(controlsOpacity, {
          toValue: 0, duration: 400, useNativeDriver: true,
        }).start(() => setControlsVisible(false));
      }
    }, CONTROLS_HIDE_DELAY);
  }, [controlsOpacity]);

  // ── Playback callbacks ─────────────────────────────────────

  const handleStatusUpdate = useCallback((s: AVPlaybackStatus) => {
    setStatus(s);
    if (s.isLoaded) {
      const posSec = (s.positionMillis ?? 0) / 1000;
      onProgress(posSec);
      if (s.didJustFinish) onComplete();
      if (!hasResumed && initialPosition > 10 && s.isPlaying) {
        setShowResumePrompt(true);
        setHasResumed(true);
        setTimeout(() => setShowResumePrompt(false), 4000);
      }
    }
  }, [hasResumed, initialPosition, onProgress, onComplete]);

  const handleLoad = useCallback(async (s: AVPlaybackStatus) => {
    if (s.isLoaded && initialPosition > 10) {
      await videoRef.current?.setPositionAsync(initialPosition * 1000);
    }
  }, [initialPosition]);

  // ── Playback controls ──────────────────────────────────────

  const togglePlay = useCallback(async () => {
    if (!status?.isLoaded) return;
    showControls();
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  }, [status, isPlaying, showControls]);

  const skip = useCallback(async (seconds: number) => {
    if (!status?.isLoaded) return;
    const newPos = Math.max(
      0,
      Math.min(
        (status.positionMillis ?? 0) + seconds * 1000,
        status.durationMillis ?? 0,
      ),
    );
    await videoRef.current?.setPositionAsync(newPos);
    showControls();
  }, [status, showControls]);

  // ── Seek bar ───────────────────────────────────────────────

  const SEEK_BAR_W = playerW - Spacing.md * 2 - 120;

  const seekPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      seekingRef.current = true;
      setIsSeeking(true);
      clearTimeout(hideTimer.current);
      const x = e.nativeEvent.locationX;
      setSeekPosition(Math.max(0, Math.min(x / SEEK_BAR_W, 1)) * duration);
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      setSeekPosition(Math.max(0, Math.min(x / SEEK_BAR_W, 1)) * duration);
    },
    onPanResponderRelease: async (e) => {
      const x = e.nativeEvent.locationX;
      const newSec = Math.max(0, Math.min(x / SEEK_BAR_W, 1)) * duration;
      await videoRef.current?.setPositionAsync(newSec * 1000);
      seekingRef.current = false;
      setIsSeeking(false);
      showControls();
    },
  });

  // ── Fullscreen (pure RN — no native orientation lock) ─────

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(f => !f);
    showControls();
  }, [showControls]);

  // Cleanup on unmount
  useEffect(() => {
    showControls();
    return () => clearTimeout(hideTimer.current);
  }, []);

  return (
    <View style={[
      styles.container,
      { width: playerW, height: playerH },
      isFullscreen && styles.fullscreenContainer,
    ]}>
      <StatusBar hidden={isFullscreen} />

      {/* Video */}
      <TouchableOpacity
        activeOpacity={1}
        style={StyleSheet.absoluteFill}
        onPress={showControls}
      >
        <Video
          ref={videoRef}
          source={{ uri }}
          style={{ width: playerW, height: playerH }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls={false}
          onPlaybackStatusUpdate={handleStatusUpdate}
          onLoad={handleLoad}
          progressUpdateIntervalMillis={1000}
        />
      </TouchableOpacity>

      {/* Buffering */}
      {isBuffering && !isSeeking && (
        <View style={styles.bufferOverlay}>
          <ActivityIndicator size="large" color={Colors.text} />
        </View>
      )}

      {/* Resume toast */}
      {showResumePrompt && (
        <View style={styles.resumeToast}>
          <Ionicons name="time-outline" size={14} color={Colors.text} />
          <Text style={styles.resumeText}>
            Resumed from {formatTime(initialPosition)}
          </Text>
        </View>
      )}

      {/* Controls overlay */}
      <Animated.View
        style={[styles.controls, { opacity: controlsOpacity }]}
        pointerEvents={controlsVisible ? 'auto' : 'none'}
      >
        {/* Top bar */}
        <View style={[
          styles.topBar,
          { paddingTop: isFullscreen ? Spacing.md : Platform.OS === 'ios' ? 44 : Spacing.sm },
        ]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
            <Ionicons name="chevron-down" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Centre: skip ← | play/pause | skip → */}
        <View style={styles.centreRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={() => skip(-10)}>
            <Ionicons name="play-back" size={28} color={Colors.text} />
            <Text style={styles.skipLabel}>10</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
            {isBuffering ? (
              <ActivityIndicator size="large" color={Colors.text} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={44}
                color={Colors.text}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => skip(10)}>
            <Ionicons name="play-forward" size={28} color={Colors.text} />
            <Text style={styles.skipLabel}>10</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom: time | seek bar | duration | fullscreen */}
        <View style={[
          styles.bottomBar,
          { paddingBottom: isFullscreen ? Spacing.lg : Platform.OS === 'ios' ? 32 : Spacing.md },
        ]}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>

          <View
            style={[styles.seekTrack, { width: SEEK_BAR_W }]}
            {...seekPanResponder.panHandlers}
          >
            <View style={styles.seekBg} />
            <View style={[styles.seekFill, { width: `${Math.min(100, progress * 100)}%` }]} />
            <View style={[styles.seekThumb, { left: `${Math.min(100, progress * 100)}%` }]} />
          </View>

          <Text style={styles.timeText}>{formatTime(duration)}</Text>

          <TouchableOpacity style={styles.iconBtn} onPress={toggleFullscreen}>
            <Ionicons
              name={isFullscreen ? 'contract' : 'expand'}
              size={20}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow:        'hidden',
  },
  fullscreenContainer: {
    position: 'absolute',
    top:      0,
    left:     0,
    zIndex:   999,
  },
  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
  },
  resumeToast: {
    position:          'absolute',
    top:               Spacing.xl,
    alignSelf:         'center',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.xs,
    backgroundColor:   'rgba(0,0,0,0.72)',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs + 2,
    borderRadius:      20,
  },
  resumeText: { color: Colors.text, fontSize: FontSize.xs },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent:  'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom:     Spacing.sm,
  },
  iconBtn: {
    width:           44,
    height:          44,
    alignItems:      'center',
    justifyContent:  'center',
  },
  titleText: {
    flex:        1,
    color:       Colors.text,
    fontSize:    FontSize.md,
    fontWeight:  FontWeight.semibold,
    textAlign:   'center',
  },
  centreRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.xl,
  },
  skipBtn: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  skipLabel: {
    color:      Colors.text,
    fontSize:   8,
    fontWeight: FontWeight.bold,
    marginTop:  2,
  },
  playBtn: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  bottomBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.sm,
    gap:               Spacing.xs,
  },
  timeText: {
    color:     Colors.text,
    fontSize:  FontSize.xs,
    minWidth:  40,
    textAlign: 'center',
  },
  seekTrack: {
    flex:           1,
    height:         28,
    justifyContent: 'center',
  },
  seekBg: {
    position:        'absolute',
    left:            0,
    right:           0,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius:    2,
  },
  seekFill: {
    position:        'absolute',
    left:            0,
    height:          3,
    backgroundColor: Colors.primary,
    borderRadius:    2,
  },
  seekThumb: {
    position:        'absolute',
    width:           14,
    height:          14,
    borderRadius:    7,
    backgroundColor: Colors.primary,
    top:             7,
    marginLeft:      -7,
  },
});
