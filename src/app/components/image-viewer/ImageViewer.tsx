/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import * as css from './ImageViewer.css';
import { downloadMedia } from '../../utils/matrix';

type Point = {
  x: number;
  y: number;
};

type ViewState = {
  zoom: number;
  pan: Point;
};

const INITIAL_VIEW: ViewState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const DOUBLE_CLICK_ZOOM = 2.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatZoom = (zoom: number) => `${Math.round(zoom * 100)}%`;

const getStageAnchor = (stage: HTMLDivElement | null, clientX: number, clientY: number): Point => {
  if (!stage) return { x: 0, y: 0 };
  const rect = stage.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
};

const zoomAroundAnchor = (view: ViewState, nextZoom: number, anchor: Point): ViewState => {
  if (nextZoom === 1) return INITIAL_VIEW;
  const scale = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    pan: {
      x: anchor.x - scale * (anchor.x - view.pan.x),
      y: anchor.y - scale * (anchor.y - view.pan.y),
    },
  };
};

export type ImageViewerProps = {
  alt: string;
  src: string;
  requestClose: () => void;
};

export const ImageViewer = as<'div', ImageViewerProps>(
  ({ className, alt, src, requestClose, ...props }, ref) => {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{
      pointerId: number;
      start: Point;
      origin: Point;
    } | null>(null);
    const [view, setView] = useState<ViewState>(INITIAL_VIEW);
    const [dragging, setDragging] = useState(false);

    const handleDownload = async () => {
      const fileContent = await downloadMedia(src);
      FileSaver.saveAs(fileContent, alt);
    };

    const setZoom = useCallback((updater: (current: ViewState) => ViewState) => {
      setView((current) => updater(current));
    }, []);

    const handleZoomIn = () => {
      setZoom((current) => {
        const nextZoom = clamp(current.zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
        if (nextZoom === 1) return INITIAL_VIEW;
        return {
          zoom: nextZoom,
          pan: current.pan,
        };
      });
    };

    const handleZoomOut = () => {
      setZoom((current) => {
        const nextZoom = clamp(current.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
        if (nextZoom === 1) return INITIAL_VIEW;
        return {
          zoom: nextZoom,
          pan: current.pan,
        };
      });
    };

    const handleZoomChipClick = () => {
      setZoom((current) => {
        if (current.zoom === 1) {
          return zoomAroundAnchor(current, DOUBLE_CLICK_ZOOM, { x: 0, y: 0 });
        }
        return INITIAL_VIEW;
      });
    };

    const handleWheel = (evt: React.WheelEvent<HTMLDivElement>) => {
      evt.preventDefault();
      const { clientX, clientY, deltaY } = evt;

      setZoom((current) => {
        const anchor = getStageAnchor(stageRef.current, clientX, clientY);
        const nextZoom = clamp(current.zoom * 1.0015 ** -deltaY, MIN_ZOOM, MAX_ZOOM);
        if (nextZoom === 1) return INITIAL_VIEW;
        return zoomAroundAnchor(current, nextZoom, anchor);
      });
    };

    const handlePointerDown = (evt: React.PointerEvent<HTMLDivElement>) => {
      if (view.zoom <= 1) return;
      if (evt.button !== 0) return;

      const stage = stageRef.current;
      if (!stage) return;

      stage.setPointerCapture(evt.pointerId);
      dragRef.current = {
        pointerId: evt.pointerId,
        start: { x: evt.clientX, y: evt.clientY },
        origin: view.pan,
      };
      setDragging(true);
    };

    const handlePointerMove = (evt: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== evt.pointerId) return;

      evt.preventDefault();
      const deltaX = evt.clientX - drag.start.x;
      const deltaY = evt.clientY - drag.start.y;

      setZoom((current) => ({
        ...current,
        pan: {
          x: drag.origin.x + deltaX,
          y: drag.origin.y + deltaY,
        },
      }));
    };

    const finishDragging = useCallback((evt: React.PointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      if (stage?.hasPointerCapture(evt.pointerId)) {
        stage.releasePointerCapture(evt.pointerId);
      }
      dragRef.current = null;
      setDragging(false);
    }, []);

    const handlePointerUp = (evt: React.PointerEvent<HTMLDivElement>) => {
      finishDragging(evt);
    };

    const handlePointerCancel = (evt: React.PointerEvent<HTMLDivElement>) => {
      finishDragging(evt);
    };

    const handleDoubleClick = (evt: React.MouseEvent<HTMLDivElement>) => {
      evt.preventDefault();
      const { clientX, clientY } = evt;
      setZoom((current) => {
        if (current.zoom === 1) {
          const anchor = getStageAnchor(stageRef.current, clientX, clientY);
          return zoomAroundAnchor(current, DOUBLE_CLICK_ZOOM, anchor);
        }
        return INITIAL_VIEW;
      });
    };

    let cursor: 'grabbing' | 'grab' | 'zoom-in' = 'zoom-in';
    if (view.zoom > 1) {
      cursor = dragging ? 'grabbing' : 'grab';
    }

    useEffect(
      () => () => {
        dragRef.current = null;
      },
      []
    );

    return (
      <Box
        className={classNames(css.ImageViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.ImageViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {alt}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <IconButton
              variant={view.zoom <= 1 ? 'SurfaceVariant' : 'Success'}
              outlined={view.zoom > 1}
              size="300"
              radii="Pill"
              onClick={handleZoomOut}
              disabled={view.zoom <= 1}
              aria-label="Zoom Out"
            >
              <Icon size="50" src={Icons.Minus} />
            </IconButton>
            <Chip
              variant="SurfaceVariant"
              radii="Pill"
              onClick={handleZoomChipClick}
              aria-label="Toggle zoom"
            >
              <Text size="B300">{formatZoom(view.zoom)}</Text>
            </Chip>
            <IconButton
              variant={view.zoom >= MAX_ZOOM ? 'SurfaceVariant' : 'Success'}
              outlined={view.zoom < MAX_ZOOM}
              size="300"
              radii="Pill"
              onClick={handleZoomIn}
              disabled={view.zoom >= MAX_ZOOM}
              aria-label="Zoom In"
            >
              <Icon size="50" src={Icons.Plus} />
            </IconButton>
            <Chip
              variant="Primary"
              onClick={handleDownload}
              radii="300"
              before={<Icon size="50" src={Icons.Download} />}
            >
              <Text size="B300">Download</Text>
            </Chip>
          </Box>
        </Header>
        <Box
          grow="Yes"
          className={css.ImageViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <div
            ref={stageRef}
            className={css.ImageViewerStage}
            style={{ cursor }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={finishDragging}
            onDoubleClick={handleDoubleClick}
            role="presentation"
          >
            <img
              className={css.ImageViewerImg}
              style={{
                transform: `translate3d(${view.pan.x}px, ${view.pan.y}px, 0) scale(${view.zoom})`,
                transition: dragging ? 'none' : 'transform 120ms ease-out',
              }}
              src={src}
              alt={alt}
              draggable={false}
            />
          </div>
        </Box>
      </Box>
    );
  }
);
