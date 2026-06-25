import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const ImageViewer = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const ImageViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const ImageViewerContent = style([
  DefaultReset,
  {
    position: 'relative',
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    overflow: 'hidden',
  },
]);

export const ImageViewerStage = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    background:
      'radial-gradient(circle at center, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0) 40%), #000',
  },
]);

export const ImageViewerImg = style([
  DefaultReset,
  {
    objectFit: 'contain',
    width: 'auto',
    height: 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
    backgroundColor: color.Surface.Container,
    transformOrigin: 'center center',
    userSelect: 'none',
    pointerEvents: 'none',
    willChange: 'transform',
  },
]);
