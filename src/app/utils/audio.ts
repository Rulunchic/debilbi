const AUDIO_RETRY_EVENTS = ['pointerdown', 'keydown', 'click'] as const;

const scheduleAudioRetry = (audioElement: HTMLMediaElement) => {
  if (typeof document === 'undefined') return;
  const target = audioElement;

  const retry = () => {
    target.currentTime = 0;
    target.play().catch(() => undefined);

    AUDIO_RETRY_EVENTS.forEach((eventName) => {
      document.removeEventListener(eventName, retry, true);
    });
  };

  AUDIO_RETRY_EVENTS.forEach((eventName) => {
    document.addEventListener(eventName, retry, { capture: true, once: true });
  });
};

export const playAudioElement = (audioElement?: HTMLMediaElement | null) => {
  if (!audioElement) return;

  const target = audioElement;
  target.muted = false;
  target.volume = 1;
  target.currentTime = 0;

  const playResult = target.play();
  if (playResult) {
    playResult.catch(() => scheduleAudioRetry(target));
  }
};
