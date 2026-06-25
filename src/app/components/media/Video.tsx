/* eslint-disable jsx-a11y/media-has-caption, react/prop-types */
import React, {
  forwardRef,
  ReactEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { Badge, Chip, Icon, IconButton, Icons, ProgressBar, Spinner, Text } from 'folds';
import { Range } from 'react-range';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaOutputSink,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaPlaybackRate,
  useMediaSeek,
  useMediaVolume,
} from '../../hooks/media';
import { useThrottle } from '../../hooks/useThrottle';
import { secondsToMinutesAndSeconds } from '../../utils/common';
import * as css from './media.css';

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const PLAY_TIME_THROTTLE_OPTS = {
  wait: 500,
  immediate: true,
};

const formatPlaybackRate = (rate: number) => {
  const rounded = Math.round(rate * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}x` : `${rounded.toFixed(2)}x`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const Video = forwardRef<HTMLVideoElement, React.VideoHTMLAttributes<HTMLVideoElement>>(
  (
    { className, src, autoPlay, onLoadedMetadata, onError, preload, playsInline, ...videoProps },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const [preferredAudioOutputDeviceId] = useSetting(settingsAtom, 'preferredAudioOutputDeviceId');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    const getVideoRef = useCallback(() => videoRef.current, []);
    const { loading } = useMediaLoading(getVideoRef);
    const { playing, setPlaying } = useMediaPlay(getVideoRef);
    const { seek } = useMediaSeek(getVideoRef);
    const { volume, mute, setMute, setVolume } = useMediaVolume(getVideoRef);
    const { playbackRate, setPlaybackRate } = useMediaPlaybackRate(getVideoRef);
    useMediaOutputSink(getVideoRef, preferredAudioOutputDeviceId);

    const handlePlayTimeCallback: PlayTimeCallback = useCallback(
      (nextDuration, nextCurrentTime) => {
        setDuration(Number.isFinite(nextDuration) ? Math.max(nextDuration, 0) : 0);
        setCurrentTime(Number.isFinite(nextCurrentTime) ? Math.max(nextCurrentTime, 0) : 0);
      },
      []
    );
    useMediaPlayTimeCallback(
      getVideoRef,
      useThrottle(handlePlayTimeCallback, PLAY_TIME_THROTTLE_OPTS)
    );

    useEffect(() => {
      setCurrentTime(0);
      setDuration(0);
    }, [src]);

    useEffect(() => {
      if (!autoPlay || !src) return undefined;

      const target = videoRef.current;
      if (!target) return undefined;

      target.play().catch(() => undefined);
      return undefined;
    }, [autoPlay, src]);

    useEffect(() => {
      const handleFullscreenChange = () => {
        setFullscreen(document.fullscreenElement === stageRef.current);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      handleFullscreenChange();

      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }, []);

    const handleLoadedMetadata: ReactEventHandler<HTMLVideoElement> = (evt) => {
      onLoadedMetadata?.(evt);

      const target = videoRef.current;
      if (!target) return;

      setCurrentTime(target.currentTime || 0);
      setDuration(Number.isFinite(target.duration) ? Math.max(target.duration, 0) : 0);

      if (autoPlay) {
        target.play().catch(() => undefined);
      }
    };

    const handleError: ReactEventHandler<HTMLVideoElement> = (evt) => {
      onError?.(evt);
    };

    const handleTogglePlay = () => {
      setPlaying(!playing);
    };

    const handleSeek = (values: number[]) => {
      const nextTime = values[0] ?? 0;
      setCurrentTime(nextTime);
      seek(nextTime);
    };

    const handleToggleMute = () => {
      setMute(!mute);
    };

    const handleCyclePlaybackRate = () => {
      const currentRateIndex = PLAYBACK_RATES.findIndex(
        (rate) => Math.abs(rate - playbackRate) < 0.01
      );
      const nextRate = PLAYBACK_RATES[(currentRateIndex + 1) % PLAYBACK_RATES.length];
      setPlaybackRate(nextRate);
    };

    const handleVolumeChange = (values: number[]) => {
      const nextVolume = values[0] ?? 0;
      setVolume(nextVolume);
    };

    const toggleFullscreen = useCallback(async () => {
      const stage = stageRef.current;
      if (!stage) return;

      try {
        if (document.fullscreenElement === stage) {
          await document.exitFullscreen();
        } else {
          await stage.requestFullscreen();
        }
      } catch {
        // Ignore fullscreen failures and keep playback working.
      }
    }, []);

    const handleDoubleClick: React.MouseEventHandler<HTMLVideoElement> = (evt) => {
      videoProps.onDoubleClick?.(evt);
      if (evt.defaultPrevented) return;
      toggleFullscreen().catch(() => undefined);
    };

    const scrubDuration = duration > 0 ? duration : 1;
    const displayDuration = duration > 0 ? duration : 0;
    const safeCurrentTime = clamp(currentTime, 0, scrubDuration);
    const isMuted = mute || volume <= 0;

    return (
      <div className={css.VideoRoot}>
        <div ref={stageRef} className={css.VideoStage} role="presentation">
          <video
            {...videoProps}
            ref={videoRef}
            className={classNames(css.Video, className)}
            src={src}
            autoPlay={autoPlay}
            controls={false}
            preload={preload ?? 'metadata'}
            playsInline={playsInline ?? true}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleError}
            onDoubleClick={handleDoubleClick}
          />

          <div className={css.VideoOverlay}>
            <div className={css.VideoOverlayContent}>
              <div className={css.VideoControlsRow}>
                <Chip
                  onClick={handleTogglePlay}
                  variant="Secondary"
                  radii="300"
                  disabled={loading}
                  before={
                    loading ? (
                      <Spinner variant="Secondary" size="50" />
                    ) : (
                      <Icon src={playing ? Icons.Pause : Icons.Play} size="50" filled={playing} />
                    )
                  }
                >
                  <Text size="B300">{playing ? 'Pause' : 'Play'}</Text>
                </Chip>

                <Text className={css.VideoTime} size="T200">
                  {`${secondsToMinutesAndSeconds(safeCurrentTime)} / ${secondsToMinutesAndSeconds(
                    displayDuration
                  )}`}
                </Text>

                <div className={css.VideoSpacer} />

                <Chip
                  variant="SurfaceVariant"
                  radii="Pill"
                  fill="Soft"
                  onClick={handleCyclePlaybackRate}
                >
                  <Text size="B300">{formatPlaybackRate(playbackRate)}</Text>
                </Chip>

                <IconButton
                  variant="SurfaceVariant"
                  size="300"
                  radii="Pill"
                  onClick={handleToggleMute}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  <Icon src={isMuted ? Icons.VolumeMute : Icons.VolumeHigh} size="50" />
                </IconButton>

                <div className={css.VideoVolume}>
                  <Range
                    step={0.01}
                    min={0}
                    max={1}
                    values={[volume]}
                    onChange={handleVolumeChange}
                    renderTrack={(params) => (
                      <div {...params.props} className={css.VideoTrack}>
                        {params.children}
                        <ProgressBar
                          as="div"
                          variant="Secondary"
                          size="300"
                          min={0}
                          max={1}
                          value={volume}
                          radii="300"
                        />
                      </div>
                    )}
                    renderThumb={(params) => (
                      <Badge
                        size="300"
                        variant="Secondary"
                        fill="Solid"
                        radii="Pill"
                        outlined
                        {...params.props}
                        style={{
                          ...params.props.style,
                          zIndex: 1,
                        }}
                      />
                    )}
                  />
                </div>

                <IconButton
                  variant="SurfaceVariant"
                  size="300"
                  radii="Pill"
                  onClick={() => {
                    toggleFullscreen().catch(() => undefined);
                  }}
                  aria-pressed={fullscreen}
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <Icon src={fullscreen ? Icons.Monitor : Icons.ScreenShare} size="50" />
                </IconButton>
              </div>

              <div className={css.VideoScrubber}>
                <Range
                  step={0.1}
                  min={0}
                  max={scrubDuration}
                  values={[safeCurrentTime]}
                  onChange={handleSeek}
                  renderTrack={(params) => (
                    <div {...params.props} className={css.VideoTrack}>
                      {params.children}
                      <ProgressBar
                        as="div"
                        variant="Secondary"
                        size="300"
                        min={0}
                        max={scrubDuration}
                        value={safeCurrentTime}
                        radii="300"
                      />
                    </div>
                  )}
                  renderThumb={(params) => (
                    <Badge
                      size="300"
                      variant="Secondary"
                      fill="Solid"
                      radii="Pill"
                      outlined
                      {...params.props}
                      style={{
                        ...params.props.style,
                        zIndex: 1,
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
