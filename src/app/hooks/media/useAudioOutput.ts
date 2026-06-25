import { useCallback, useEffect, useState } from 'react';

export type AudioOutputDevice = Pick<MediaDeviceInfo, 'deviceId' | 'groupId' | 'label'>;

type SinkableMediaElement = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

const DEFAULT_SINK_ID = 'default';

const canRouteMediaOutput = () =>
  typeof HTMLMediaElement !== 'undefined' &&
  typeof HTMLMediaElement.prototype.setSinkId === 'function';

const normalizeSinkId = (deviceId?: string) =>
  deviceId && deviceId.trim().length > 0 ? deviceId : DEFAULT_SINK_ID;

const applySinkId = async (targetEl: HTMLMediaElement, deviceId?: string) => {
  if (!canRouteMediaOutput()) return;

  const { setSinkId } = targetEl as SinkableMediaElement;
  if (!setSinkId) return;

  await setSinkId.call(targetEl, normalizeSinkId(deviceId));
};

const routeAudioElements = async (elements: ArrayLike<HTMLAudioElement>, deviceId?: string) => {
  await Promise.all(
    Array.from(elements).map(async (audioEl) => {
      try {
        await applySinkId(audioEl, deviceId);
      } catch {
        try {
          await applySinkId(audioEl, DEFAULT_SINK_ID);
        } catch {
          // If even the default sink cannot be applied, keep playback on the browser default.
        }
      }
    })
  );
};

export const useAudioOutputDevices = () => {
  const [devices, setDevices] = useState<AudioOutputDevice[]>([]);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      return;
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        allDevices
          .filter(
            (device) =>
              device.kind === 'audiooutput' &&
              device.deviceId !== 'default' &&
              device.deviceId !== ''
          )
          .map(({ deviceId, groupId, label }) => ({ deviceId, groupId, label }))
      );
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);

    const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!mediaDevices?.addEventListener) return undefined;

    mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, [refresh]);

  return {
    devices,
    refresh,
    supported: canRouteMediaOutput(),
  };
};

export const useMediaOutputSink = (
  getTargetElement: () => HTMLMediaElement | null,
  deviceId?: string
) => {
  const [error, setError] = useState<string>();
  const supported = canRouteMediaOutput();

  useEffect(() => {
    const targetEl = getTargetElement();
    if (!targetEl || !supported) {
      setError(undefined);
      return undefined;
    }

    let cancelled = false;

    const route = async () => {
      try {
        await applySinkId(targetEl, deviceId);
        if (!cancelled) setError(undefined);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to route audio output.');
        }

        if (normalizeSinkId(deviceId) !== DEFAULT_SINK_ID) {
          try {
            await applySinkId(targetEl, DEFAULT_SINK_ID);
          } catch {
            // Keep the media element alive even if the preferred sink disappeared.
          }
        }
      }
    };

    route().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [deviceId, getTargetElement, supported]);

  return {
    error,
    supported,
  };
};

export const useDocumentAudioOutputSink = (doc: Document | undefined, deviceId?: string) => {
  const [error, setError] = useState<string>();
  const supported = canRouteMediaOutput();

  useEffect(() => {
    if (!doc || !supported) {
      setError(undefined);
      return undefined;
    }

    let cancelled = false;

    const routeAudioElementsInRoot = async (root: ParentNode) => {
      await routeAudioElements(Array.from(root.querySelectorAll('audio')), deviceId);
    };

    const routeAudioElementNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'AUDIO') {
          routeAudioElements([element as HTMLAudioElement], deviceId).catch(() => undefined);
          return;
        }

        routeAudioElements(Array.from(element.querySelectorAll('audio')), deviceId).catch(
          () => undefined
        );
      }
    };

    const root = doc.body ?? doc.documentElement;
    if (!root) return undefined;

    routeAudioElementsInRoot(root).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Unable to route audio output.');
      }
    });

    const observer = new MutationObserver((mutations) => {
      if (cancelled) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(routeAudioElementNode);
      });
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [deviceId, doc, supported]);

  return {
    error,
    supported,
  };
};
