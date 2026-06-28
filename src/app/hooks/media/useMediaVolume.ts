import { useCallback, useEffect, useState } from 'react';

export type MediaVolumeData = {
  volume: number;
  mute: boolean;
};

export type MediaVolumeControl = {
  setMute: (mute: boolean) => void;
  setVolume: (volume: number) => void;
};

export const useMediaVolume = (
  getTargetElement: () => HTMLMediaElement | null
): MediaVolumeData & MediaVolumeControl => {
  const [volumeData, setVolumeData] = useState<MediaVolumeData>({
    volume: 1,
    mute: false,
  });

  const setMute = useCallback(
    (mute: boolean) => {
      const targetEl = getTargetElement();
      if (!targetEl) return;
      targetEl.muted = mute;
      if (!mute && targetEl.volume <= 0) {
        targetEl.volume = 1;
      }
    },
    [getTargetElement]
  );

  const setVolume = useCallback(
    (volume: number) => {
      const targetEl = getTargetElement();
      if (!targetEl) return;
      const nextVolume = Math.max(0, Math.min(volume, 1));
      targetEl.volume = nextVolume;
      if (nextVolume > 0 && targetEl.muted) {
        targetEl.muted = false;
      }
    },
    [getTargetElement]
  );

  useEffect(() => {
    const targetEl = getTargetElement();
    const handleChange = () => {
      if (!targetEl) return;

      setVolumeData({
        mute: targetEl.muted,
        volume: Math.max(0, Math.min(targetEl.volume, 1)),
      });
    };
    targetEl?.addEventListener('volumechange', handleChange);
    return () => {
      targetEl?.removeEventListener('volumechange', handleChange);
    };
  }, [getTargetElement]);

  return {
    ...volumeData,
    setMute,
    setVolume,
  };
};
