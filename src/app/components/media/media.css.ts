import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const Image = style([
  DefaultReset,
  {
    objectFit: 'cover',
    width: '100%',
    height: '100%',
  },
]);

export const Video = style([
  DefaultReset,
  {
    objectFit: 'contain',
    width: '100%',
    height: '100%',
  },
]);

export const VideoRoot = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: color.Background.Container,
    color: color.SurfaceVariant.OnContainer,
  },
]);

export const VideoStage = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
]);

export const VideoOverlay = style([
  DefaultReset,
  {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    background:
      'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2) 36%, rgba(0, 0, 0, 0) 68%)',
  },
]);

export const VideoOverlayContent = style([
  DefaultReset,
  {
    width: '100%',
    padding: `${config.space.S200} ${config.space.S200} ${config.space.S200}`,
    display: 'flex',
    flexDirection: 'column',
    gap: config.space.S100,
    pointerEvents: 'auto',
  },
]);

export const VideoControlsRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  flexWrap: 'wrap',
});

export const VideoScrubber = style({
  width: '100%',
});

export const VideoTrack = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
});

export const VideoVolume = style({
  width: toRem(104),
  minWidth: toRem(88),
});

export const VideoTime = style({
  whiteSpace: 'nowrap',
});

export const VideoSpacer = style({
  flex: 1,
  minWidth: toRem(8),
});
