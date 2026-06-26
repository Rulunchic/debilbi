import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
} from 'https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.esm.mjs';

const rawAudioOptions = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

const screenQualityPresets = {
  smooth720: {
    label: 'Smooth 720p60',
    width: 1280,
    height: 720,
    fps: 60,
    bitrate: 4_500_000,
    contentHint: 'motion',
    degradationPreference: 'maintain-framerate',
  },
  smooth1080: {
    label: 'Smooth 1080p60',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: 8_500_000,
    contentHint: 'motion',
    degradationPreference: 'maintain-framerate',
  },
  balanced1080: {
    label: 'Balanced 1080p30',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 6_000_000,
    contentHint: 'detail',
    degradationPreference: 'balanced',
  },
  sharp1440: {
    label: 'Sharp 1440p30',
    width: 2560,
    height: 1440,
    fps: 30,
    bitrate: 10_000_000,
    contentHint: 'detail',
    degradationPreference: 'balanced',
  },
  stable1440: {
    label: 'Stable 1440p60',
    width: 2560,
    height: 1440,
    fps: 60,
    bitrate: 24_000_000,
    contentHint: 'motion',
    degradationPreference: 'maintain-framerate',
    codec: 'vp9',
    simulcast: false,
  },
  sharp4k: {
    label: 'Sharp 4K30',
    width: 3840,
    height: 2160,
    fps: 30,
    bitrate: 14_000_000,
    contentHint: 'detail',
    degradationPreference: 'maintain-resolution',
  },
};

const legacyScreenQualityMap = {
  '720p30': 'smooth720',
  '1080p30': 'balanced1080',
  '1080p60': 'smooth1080',
  '1440p60': 'stable1440',
  '4k30': 'sharp4k',
};

const maxUploadBytes = 100 * 1024 * 1024;
const audioAttachmentExtensions = new Set([
  'mp3',
  'wav',
  'ogg',
  'oga',
  'm4a',
  'aac',
  'flac',
  'opus',
]);
const videoAttachmentExtensions = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv']);

const state = {
  room: null,
  identity: '',
  name: '',
  user: null,
  session: localStorage.getItem('debilbi:session') || '',
  authConfig: null,
  currentRoom: 'lobby',
  chatRoom: 'lobby',
  isJoining: false,
  presenceTimer: 0,
  botLoginTimer: 0,
  botLoginCommand: '',
  chatRoomExplicit: false,
  presenceByRoom: {},
  focusedScreenId: '',
  screenFit: 'contain',
  screenQuality: localStorage.getItem('debilbi:screenQuality') || '1080p30',
  screenDisabledLocal: localStorage.getItem('debilbi:screenDisabledLocal') === '1',
  theaterOpen: false,
  activeSpeakerIds: new Set(),
  messageIds: new Set(),
  chatMessagesById: new Map(),
  avatarByIdentity: Object.create(null),
  pendingFiles: [],
  audioPrefs: loadAudioPrefs(),
  seenUsers: new Map(),
  channels: [
    { id: 'lobby', name: 'lobby', topic: 'Main voice chat' },
    { id: 'ranked', name: 'ranked', topic: 'Party voice' },
    { id: 'demo', name: 'demo', topic: 'Screen share tests' },
  ],
};

const PRESENCE_POLL_INTERVAL_MS = 1200;

const els = {
  authGate: document.querySelector('#authGate'),
  telegramLoginWidget: document.querySelector('#telegramLoginWidget'),
  botLoginButton: document.querySelector('#botLoginButton'),
  botLoginBox: document.querySelector('#botLoginBox'),
  botLoginCode: document.querySelector('#botLoginCode'),
  devLoginButton: document.querySelector('#devLoginButton'),
  authStatus: document.querySelector('#authStatus'),
  joinForm: document.querySelector('#joinForm'),
  displayName: document.querySelector('#displayName'),
  profilePhoto: document.querySelector('#profilePhoto'),
  profileFallback: document.querySelector('#profileFallback'),
  profileName: document.querySelector('#profileName'),
  profileHandle: document.querySelector('#profileHandle'),
  logoutButton: document.querySelector('#logoutButton'),
  activeRoom: document.querySelector('#activeRoom'),
  connectionState: document.querySelector('#connectionState'),
  participantCount: document.querySelector('#participantCount'),
  captureMode: document.querySelector('#captureMode'),
  screenStage: document.querySelector('#screenStage'),
  screenFocus: document.querySelector('#screenFocus'),
  screenStrip: document.querySelector('#screenStrip'),
  voiceStrip: document.querySelector('#voiceStrip'),
  peopleList: document.querySelector('#peopleList'),
  audioSink: document.querySelector('#audioSink'),
  micButton: document.querySelector('#micButton'),
  screenQuality: document.querySelector('#screenQuality'),
  screenToggleButton: document.querySelector('#screenToggleButton'),
  screenButton: document.querySelector('#screenButton'),
  fitButton: document.querySelector('#fitButton'),
  theaterButton: document.querySelector('#theaterButton'),
  leaveButton: document.querySelector('#leaveButton'),
  chatRoomLabel: document.querySelector('#chatRoomLabel'),
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#chatInput'),
  chatSend: document.querySelector('#chatSend'),
  chatLog: document.querySelector('#chatLog'),
  fileButton: document.querySelector('#fileButton'),
  fileInput: document.querySelector('#fileInput'),
  attachmentTray: document.querySelector('#attachmentTray'),
  roomShortcuts: document.querySelectorAll('.room-shortcut'),
  roomItems: document.querySelectorAll('[data-room-item]'),
  roomChatButtons: document.querySelectorAll('[data-room-chat]'),
  roomRenameButtons: document.querySelectorAll('[data-room-rename]'),
  roomUserLists: document.querySelectorAll('[data-room-users]'),
  railRoomJumps: document.querySelectorAll('[data-room-jump]'),
  theater: document.querySelector('#theater'),
  theaterTitle: document.querySelector('#theaterTitle'),
  theaterMedia: document.querySelector('#theaterMedia'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  closeTheaterButton: document.querySelector('#closeTheaterButton'),
  lightbox: document.querySelector('#lightbox'),
  lightboxInner: document.querySelector('#lightboxInner'),
  lightboxImg: document.querySelector('#lightboxImg'),
  lightboxVideoShell: document.querySelector('#lightboxVideoShell'),
  lightboxVideo: document.querySelector('#lightboxVideo'),
  lightboxVideoOverlay: document.querySelector('#lightboxVideoOverlay'),
  lightboxVideoPlay: document.querySelector('#lightboxVideoPlay'),
  lightboxVideoSeek: document.querySelector('#lightboxVideoSeek'),
  lightboxVideoTime: document.querySelector('#lightboxVideoTime'),
  lightboxVideoMute: document.querySelector('#lightboxVideoMute'),
  lightboxHint: document.querySelector('#lightboxHint'),
  lightboxClose: document.querySelector('#lightboxClose'),
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

state.screenQuality = normalizeScreenQuality(state.screenQuality);
localStorage.setItem('debilbi:screenQuality', state.screenQuality);

renderEmptyState();
void bootAuth();

els.roomShortcuts.forEach((button) => {
  button.addEventListener('click', () => selectAndJoinRoom(button.dataset.room));
});

els.roomRenameButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    void renameChannel(button.dataset.roomRename);
  });
});

els.roomChatButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    void openTextChat(button.dataset.roomChat);
  });
});

els.railRoomJumps.forEach((button) => {
  button.addEventListener('click', () => selectAndJoinRoom(button.dataset.roomJump));
});

els.joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await selectAndJoinRoom(state.currentRoom);
});

els.logoutButton.addEventListener('click', () => {
  logout();
});

els.botLoginButton?.addEventListener('click', () => {
  void startBotLogin();
});

els.devLoginButton?.addEventListener('click', () => {
  void devLogin();
});

els.chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.chatForm.requestSubmit();
  }
});

els.chatInput.addEventListener('input', () => {
  els.chatInput.style.height = 'auto';
  els.chatInput.style.height = Math.min(els.chatInput.scrollHeight, 120) + 'px';
});

els.fileButton.addEventListener('click', () => {
  els.fileInput.click();
});

els.fileInput.addEventListener('change', () => {
  const files = Array.from(els.fileInput.files || []);
  addPendingFiles(files);
  els.fileInput.value = '';
});

document.addEventListener('paste', (event) => {
  if (!state.user) return;
  const files = getClipboardFiles(event.clipboardData);
  if (!files.length) return;
  event.preventDefault();
  addPendingFiles(files);
  els.chatInput.focus();
});

els.leaveButton.addEventListener('click', () => {
  if (state.room) {
    state.room.disconnect();
  }
});

els.micButton.addEventListener('click', async () => {
  if (!isConnected()) return;
  const enabled = hasLocalMic();
  try {
    await state.room.localParticipant.setMicrophoneEnabled(!enabled, rawAudioOptions);
    renderRoom();
  } catch (error) {
    console.error(error);
    addSystemNotice(`microphone toggle failed: ${error.message}`);
  }
});

els.screenButton.addEventListener('click', async () => {
  if (!isConnected()) return;
  try {
    await setScreenShare(!hasLocalScreen());
  } catch (error) {
    console.error(error);
    addSystemNotice(`screen share failed: ${error.message}`);
  }
});

els.screenToggleButton?.addEventListener('click', () => {
  setLocalDemoDisabled(!state.screenDisabledLocal);
});

els.screenQuality.value = normalizeScreenQuality(state.screenQuality);
state.screenQuality = els.screenQuality.value;

els.screenQuality.addEventListener('change', async () => {
  const nextQuality = normalizeScreenQuality(els.screenQuality.value);
  state.screenQuality = nextQuality;
  localStorage.setItem('debilbi:screenQuality', nextQuality);
  updateControls();
  if (isConnected() && hasLocalScreen()) {
    addSystemNotice(
      `screen quality changed to ${screenQualityPresets[nextQuality].label}; restarting share`
    );
    try {
      await restartScreenShare();
    } catch (error) {
      console.error(error);
      addSystemNotice(`screen quality restart failed: ${error.message}`);
    }
  }
});

els.fitButton.addEventListener('click', () => {
  state.screenFit = state.screenFit === 'contain' ? 'cover' : 'contain';
  renderRoom();
});

els.theaterButton.addEventListener('click', () => {
  openTheater();
});

els.closeTheaterButton.addEventListener('click', () => {
  void closeTheater();
});

els.fullscreenButton.addEventListener('click', async () => {
  if (!document.fullscreenElement) {
    await els.theater.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
});

els.theaterMedia.addEventListener('dblclick', () => {
  void closeTheater();
});

document.addEventListener('fullscreenchange', syncTheaterControls);

// Lightbox
els.lightbox?.addEventListener('click', (e) => {
  if (e.target === els.lightbox || e.target === els.lightboxInner) closeLightbox();
});
els.lightboxClose?.addEventListener('click', closeLightbox);
els.lightboxImg?.addEventListener('pointerdown', beginLightboxDrag);
els.lightboxImg?.addEventListener('pointermove', moveLightboxDrag);
els.lightboxImg?.addEventListener('pointerup', endLightboxDrag);
els.lightboxImg?.addEventListener('pointercancel', endLightboxDrag);
els.lightboxImg?.addEventListener('lostpointercapture', endLightboxDrag);
els.lightboxImg?.addEventListener('dblclick', toggleLightboxZoom);
els.lightboxVideo?.addEventListener('click', toggleLightboxVideoPlayback);
els.lightboxVideoOverlay?.addEventListener('click', toggleLightboxVideoPlayback);
els.lightboxVideoPlay?.addEventListener('click', toggleLightboxVideoPlayback);
els.lightboxVideoMute?.addEventListener('click', toggleLightboxVideoMute);
els.lightboxVideoSeek?.addEventListener('input', handleLightboxVideoSeekInput);
els.lightboxVideoSeek?.addEventListener('pointerdown', () => {
  _lbVideoSeeking = true;
});
els.lightboxVideoSeek?.addEventListener('pointerup', () => {
  _lbVideoSeeking = false;
  syncLightboxVideoControls();
});
els.lightboxVideoSeek?.addEventListener('pointercancel', () => {
  _lbVideoSeeking = false;
  syncLightboxVideoControls();
});
els.lightboxVideo?.addEventListener('loadedmetadata', syncLightboxVideoControls);
els.lightboxVideo?.addEventListener('durationchange', syncLightboxVideoControls);
els.lightboxVideo?.addEventListener('timeupdate', syncLightboxVideoControls);
els.lightboxVideo?.addEventListener('play', syncLightboxVideoControls);
els.lightboxVideo?.addEventListener('pause', syncLightboxVideoControls);
els.lightboxVideo?.addEventListener('ended', syncLightboxVideoControls);
els.lightboxVideo?.addEventListener('volumechange', syncLightboxVideoControls);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && els.lightbox && !els.lightbox.hidden) {
    closeLightbox();
    return;
  }
  if (!isVideoLightboxOpen()) return;
  const target = e.target;
  if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
  if (e.key === ' ' || e.key === 'k') {
    e.preventDefault();
    toggleLightboxVideoPlayback();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    seekLightboxVideo(-5);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    seekLightboxVideo(5);
  } else if (e.key === 'm') {
    e.preventDefault();
    toggleLightboxVideoMute();
  }
});
els.lightbox?.addEventListener(
  'wheel',
  (e) => {
    if (els.lightbox.hidden) return;
    if (els.lightboxVideo && !els.lightboxVideo.hidden) return; // don't zoom video
    e.preventDefault();
    const nextZoom = _lbZoom * (e.deltaY < 0 ? 1.12 : 0.9);
    zoomLightbox(nextZoom, e.clientX, e.clientY);
  },
  { passive: false }
);

els.chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.user) return;
  const body = els.chatInput.value.trim();
  const files = state.pendingFiles.slice();
  if (!body && !files.length) return;
  setComposerBusy(true);
  try {
    const attachments = files.length ? await uploadFiles(files) : [];
    const message = await saveMessage(body, attachments);
    els.chatInput.value = '';
    els.chatInput.style.height = '';
    state.pendingFiles = [];
    renderAttachmentTray();
    addMessage(message, true);
    if (isConnected()) {
      const payload = encoder.encode(JSON.stringify({ type: 'chat', message }));
      await state.room.localParticipant.publishData(payload, {
        reliable: true,
        topic: 'chat',
      });
    }
  } catch (error) {
    console.error(error);
    addSystemNotice(`message failed: ${error.message}`);
  } finally {
    setComposerBusy(false);
    requestAnimationFrame(() => {
      els.chatInput.focus({ preventScroll: true });
    });
  }
});

async function bootAuth() {
  try {
    const configResponse = await fetch('/api/config');
    state.authConfig = configResponse.ok ? await configResponse.json() : {};
  } catch (error) {
    console.warn(error);
    state.authConfig = {};
  }

  window.onTelegramAuth = (user) => {
    void completeTelegramWidgetAuth(user);
  };
  renderTelegramWidget();
  let authError = localStorage.getItem('debilbi:authError');
  if (authError) localStorage.removeItem('debilbi:authError');
  const authMessage = authError
    ? `Telegram login failed: ${authError}`
    : 'Войди через Telegram, чтобы продолжить.';

  if (state.session) {
    try {
      const response = await fetch('/api/me', { headers: authHeaders() });
      if (!response.ok) throw new Error('session expired');
      const data = await response.json();
      setAuthenticated(data.user, state.session);
      return;
    } catch (error) {
      console.warn(error);
      localStorage.removeItem('debilbi:session');
      state.session = '';
    }
  }
  showAuthGate(authMessage);
}

function renderTelegramWidget() {
  const botUsername = state.authConfig?.telegramBotUsername;
  const widgetEnabled = state.authConfig?.telegramWidgetEnabled === true;
  if (els.devLoginButton) {
    els.devLoginButton.hidden = state.authConfig?.devLoginEnabled !== true;
  }
  if (!els.telegramLoginWidget) return;
  els.telegramLoginWidget.replaceChildren();
  els.telegramLoginWidget.hidden = !widgetEnabled;
  if (!botUsername || !widgetEnabled) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botUsername);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-radius', '8');
  script.setAttribute('data-request-access', 'write');
  script.setAttribute(
    'data-auth-url',
    new URL(state.authConfig?.telegramAuthUrl || '/auth/telegram', location.origin).href
  );
  script.onerror = () => {
    if (els.botLoginBox) els.botLoginBox.hidden = false;
    setAuthStatus('Telegram widget не загрузился — войди через бота ниже.');
  };
  els.telegramLoginWidget.appendChild(script);
}

async function completeTelegramWidgetAuth(user) {
  setAuthStatus('Проверяю Telegram...');
  try {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'telegram auth failed');
    }
    const data = await response.json();
    setAuthenticated(data.user, data.session);
  } catch (error) {
    console.error(error);
    setAuthStatus(`Telegram login failed: ${error.message}`);
  }
}

async function devLogin() {
  if (!els.devLoginButton) return;
  els.devLoginButton.disabled = true;
  setAuthStatus('Локальный вход...');
  try {
    const response = await fetch('/api/auth/dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Local Dev' }),
    });
    if (!response.ok) throw new Error('dev login unavailable');
    const data = await response.json();
    setAuthenticated(data.user, data.session);
  } catch (error) {
    console.error(error);
    setAuthStatus(`Dev login failed: ${error.message}`);
    els.devLoginButton.disabled = false;
  }
}

async function startBotLogin() {
  if (!els.botLoginButton) return;
  clearInterval(state.botLoginTimer);
  els.botLoginButton.disabled = true;
  setAuthStatus('Создаю код для бота...');
  try {
    const response = await fetch('/api/auth/bot/start', { method: 'POST' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'bot login unavailable');
    }
    const data = await response.json();
    if (els.botLoginBox) {
      els.botLoginBox.hidden = false;
      state.botLoginCommand = data.command || `/start ${data.code}`;
      els.botLoginCode.textContent = state.botLoginCommand;
    }
    const opened = window.open(data.startUrl, '_blank', 'noopener,noreferrer');
    if (!opened && data.fallbackUrl) {
      window.open(data.fallbackUrl, '_blank', 'noopener,noreferrer');
    }
    setAuthStatus(
      'Команда для входа готова ниже. Если Telegram не открылся, скопируй её и отправь боту.'
    );
    state.botLoginTimer = window.setInterval(() => {
      void checkBotLogin(data.code);
    }, 2000);
    void checkBotLogin(data.code);
  } catch (error) {
    console.error(error);
    setAuthStatus(`Bot login failed: ${error.message}`);
    els.botLoginButton.disabled = false;
  }
}

async function checkBotLogin(code) {
  try {
    const response = await fetch(`/api/auth/bot/check?code=${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error('bot check failed');
    const data = await response.json();
    if (data.status === 'ok') {
      clearInterval(state.botLoginTimer);
      els.botLoginButton.disabled = false;
      setAuthenticated(data.user, data.session);
    } else if (data.status === 'expired') {
      clearInterval(state.botLoginTimer);
      els.botLoginButton.disabled = false;
      setAuthStatus('Код истёк, нажми вход через бота ещё раз.');
    }
  } catch (error) {
    console.warn(error);
  }
}

function setAuthenticated(user, session) {
  state.user = user;
  state.session = session;
  state.name = user.name;
  state.identity = user.identity;
  state.botLoginCommand = '';
  state.chatRoomExplicit = false;
  localStorage.setItem('debilbi:session', session);
  renderProfile();
  updateControls();
  document.body.classList.remove('auth-locked');
  void initializeApp();
}

async function initializeApp() {
  await loadChannels();
  await loadHistory(state.chatRoom || state.currentRoom);
  await refreshPresence();
  updateControls();
  startPresencePolling();
}

function showAuthGate(message) {
  document.body.classList.add('auth-locked');
  setAuthStatus(message);
}

function setAuthStatus(message) {
  els.authStatus.textContent = message;
}

function renderProfile() {
  const user = state.user;
  if (!user) return;
  els.displayName.value = user.name;
  els.profileName.textContent = user.name;
  els.profileHandle.textContent = user.username ? `@${user.username}` : `id ${user.id}`;
  els.profileFallback.textContent = initials(user.name);
  const profilePhotoUrl = user.photo_url || telegramAvatarUrl(user.username);
  recordAvatar(user.identity, profilePhotoUrl, user.username);
  els.profilePhoto.referrerPolicy = 'no-referrer';
  els.profilePhoto.onerror = () => {
    els.profilePhoto.removeAttribute('src');
  };
  if (profilePhotoUrl) {
    els.profilePhoto.src = profilePhotoUrl;
  } else {
    els.profilePhoto.removeAttribute('src');
  }
  refreshChatAvatars(user.identity);
}

function logout() {
  if (state.room) {
    state.room.disconnect();
  }
  void clearPresence();
  clearInterval(state.presenceTimer);
  clearInterval(state.botLoginTimer);
  state.botLoginCommand = '';
  if (els.botLoginBox) els.botLoginBox.hidden = true;
  if (els.botLoginButton) els.botLoginButton.disabled = false;
  state.chatRoomExplicit = false;
  state.user = null;
  state.session = '';
  state.identity = '';
  state.name = '';
  state.presenceByRoom = {};
  state.currentRoom = 'lobby';
  state.chatRoom = 'lobby';
  state.chatMessagesById.clear();
  state.avatarByIdentity = Object.create(null);
  state.seenUsers.clear();
  localStorage.removeItem('debilbi:session');
  resetRoom();
  syncChatRoomButtons('lobby');
  renderRoomListPresence([]);
  showAuthGate('Ты вышел. Войди через Telegram снова.');
}

async function joinRoom(roomName = state.currentRoom) {
  if (!state.user) {
    showAuthGate('Сначала войди через Telegram.');
    return;
  }
  if (state.room) {
    state.room.disconnect();
    state.room = null;
  }

  setBusy(true);
  clearMessages();

  try {
    const tokenResponse = await fetch('/api/token', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ room: roomName || 'lobby' }),
    });
    if (!tokenResponse.ok) {
      throw new Error('token request failed');
    }

    const auth = await tokenResponse.json();
    state.name = auth.name;
    state.identity = auth.identity;
    state.currentRoom = auth.room;
    if (!state.chatRoomExplicit) {
      state.chatRoom = auth.room;
    }
    state.focusedScreenId = '';
    state.activeSpeakerIds = new Set();

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
      },
    });

    state.room = room;
    bindRoomEvents(room);
    updateConnection('connecting');
    await room.connect(auth.url, auth.token);
    selectRoom(auth.room, { loadHistory: false });
    await loadHistory(state.chatRoom || auth.room);
    addSystemNotice(`joined #${auth.room}`);
    renderRoom();
  } catch (error) {
    console.error(error);
    addSystemNotice(`join failed: ${error.message}`);
    resetRoom();
  } finally {
    setBusy(false);
    updateControls();
  }
}

function bindRoomEvents(room) {
  room
    .on(RoomEvent.ConnectionStateChanged, updateConnection)
    .on(RoomEvent.Connected, () => {
      if (room !== state.room) return;
      updateConnection('online');
      renderRoom();
    })
    .on(RoomEvent.Disconnected, () => {
      if (room !== state.room) return;
      addSystemNotice('left room');
      void clearPresence();
      resetRoom();
    })
    .on(RoomEvent.ParticipantConnected, (participant) => {
      if (room !== state.room) return;
      addSystemNotice(`${displayName(participant)} joined`);
      recordSeenUser(participant);
      renderRoom();
    })
    .on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (room !== state.room) return;
      addSystemNotice(`${displayName(participant)} left`);
      renderRoom();
    })
    .on(RoomEvent.TrackSubscribed, () => {
      if (room === state.room) renderRoom();
    })
    .on(RoomEvent.TrackUnsubscribed, () => {
      if (room === state.room) renderRoom();
    })
    .on(RoomEvent.LocalTrackPublished, () => {
      if (room === state.room) renderRoom();
    })
    .on(RoomEvent.LocalTrackUnpublished, () => {
      if (room === state.room) renderRoom();
    })
    .on(RoomEvent.TrackMuted, () => {
      if (room === state.room) renderRoom();
    })
    .on(RoomEvent.TrackUnmuted, () => {
      if (room === state.room) renderRoom();
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      if (room !== state.room) return;
      state.activeSpeakerIds = new Set(speakers.map((participant) => participant.identity));
      renderPresence();
    })
    .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      if (room !== state.room) return;
      if (topic !== 'chat') return;
      try {
        const data = JSON.parse(decoder.decode(payload));
        if (data.type === 'chat' && isChatMessage(data.message)) {
          // Only show if message belongs to the currently viewed chat room
          const msgRoom = data.message.room;
          if (msgRoom && msgRoom !== state.chatRoom) return;
          addMessage(data.message, data.message.identity === state.identity);
        }
      } catch (error) {
        console.warn(error);
      }
    });
}

function renderRoom() {
  clearMedia();
  const participants = getParticipants();
  syncRemoteScreenSubscriptions(participants);
  renderPresence(participants);
  attachAudio(participants);
  renderScreens(collectVisibleScreenShares(participants));
  updateControls();
  void pushPresence();
}

function renderPresence(participants = getParticipants()) {
  updateParticipantCount(participants.length);
  renderPeople(participants);
  renderVoiceStrip(participants);
  renderRoomListPresence(participants);
  updateControls();
}

function renderPeople(participants) {
  els.peopleList.replaceChildren();

  // Merge live participants into seenUsers
  for (const p of participants) recordSeenUser(p);

  if (state.seenUsers.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'people-empty';
    empty.textContent = 'Nobody here yet.';
    els.peopleList.appendChild(empty);
    return;
  }

  const liveByIdentity = new Map(participants.map((p) => [p.identity, p]));
  const onlineInPresence = new Set(
    Object.values(state.presenceByRoom).flatMap((users) => users.map((u) => u.identity))
  );

  const entries = Array.from(state.seenUsers.values()).sort((a, b) => {
    const aScore = liveByIdentity.has(a.identity) ? 2 : onlineInPresence.has(a.identity) ? 1 : 0;
    const bScore = liveByIdentity.has(b.identity) ? 2 : onlineInPresence.has(b.identity) ? 1 : 0;
    if (aScore !== bScore) return bScore - aScore;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  for (const user of entries) {
    const participant = liveByIdentity.get(user.identity);
    const isLive = !!participant;
    const isOnline = isLive || onlineInPresence.has(user.identity);
    const isSelf = user.identity === state.identity;

    const row = document.createElement('article');
    row.className = 'person-row';
    row.dataset.identity = user.identity;
    if (isSelf) row.classList.add('is-local');
    if (!isOnline) row.classList.add('is-offline');
    if (isLive && !hasMic(participant)) row.classList.add('is-muted');
    if (isLive && state.activeSpeakerIds.has(user.identity)) row.classList.add('is-speaking');

    const avatarUrl =
      (isLive ? participantAvatarUrl(participant) : null) ||
      user.photo_url ||
      avatarUrlForIdentity(user.identity, user.username);

    const audioPref = getAudioPref(user.identity);

    row.innerHTML = `
      <span class="mini-avatar"></span>
      <span class="person-main">
        <strong></strong>
        <small></small>
      </span>
      <span class="person-badge"></span>
      <span class="person-audio-controls">
        <button class="person-mute" type="button"></button>
        <input class="person-volume" type="range" min="0" max="100" step="1" />
      </span>
    `;

    renderAvatar(row.querySelector('.mini-avatar'), avatarUrl, user.name);
    row.querySelector('strong').textContent = user.name || user.identity;
    row.querySelector('small').textContent = isSelf ? 'you' : isOnline ? 'online' : 'was here';

    const personBadge = row.querySelector('.person-badge');
    if (isLive) {
      const personStatus = hasMic(participant) ? 'mic' : 'muted';
      personBadge.innerHTML = iconSvg(personStatus);
      personBadge.title = personStatus;
    } else {
      personBadge.innerHTML = '';
    }

    const controls = row.querySelector('.person-audio-controls');
    const muteButton = row.querySelector('.person-mute');
    const volumeInput = row.querySelector('.person-volume');

    if (isSelf || !isLive) {
      controls.remove();
    } else {
      renderAudioControlState(muteButton, volumeInput, audioPref);
      muteButton.addEventListener('click', () => {
        const nextPref = setAudioPref(user.identity, { muted: !getAudioPref(user.identity).muted });
        renderAudioControlState(muteButton, volumeInput, nextPref);
        applyAudioPrefs(user.identity);
      });
      volumeInput.addEventListener('input', () => {
        const nextPref = setAudioPref(user.identity, { volume: Number(volumeInput.value) / 100 });
        renderAudioControlState(muteButton, volumeInput, nextPref);
        applyAudioPrefs(user.identity);
      });
    }
    els.peopleList.appendChild(row);
  }
}

function renderVoiceStrip(participants) {
  els.voiceStrip.replaceChildren();
  els.voiceStrip.classList.add('is-empty');
}

let _lbZoom = 1;
let _lbPan = { x: 0, y: 0 };
let _lbDrag = null;
let _lbVideoSeeking = false;
const _LB_ZOOM_MIN = 1,
  _LB_ZOOM_MAX = 8;

function applyLightboxTransform() {
  if (!els.lightboxInner) return;
  els.lightboxInner.style.transform = `translate3d(${_lbPan.x}px, ${_lbPan.y}px, 0) scale(${_lbZoom})`;
  if (els.lightboxVideo && !els.lightboxVideo.hidden) {
    els.lightboxInner.style.cursor = 'default';
    if (els.lightboxImg) els.lightboxImg.style.cursor = 'default';
    return;
  }

  const cursor = _lbZoom > 1 ? (_lbDrag ? 'grabbing' : 'grab') : 'zoom-in';
  els.lightboxInner.style.cursor = cursor;
  if (els.lightboxImg) els.lightboxImg.style.cursor = cursor;
}

function resetLightboxTransform() {
  _lbZoom = 1;
  _lbPan = { x: 0, y: 0 };
  _lbDrag = null;
  applyLightboxTransform();
}

function zoomLightbox(nextZoom, clientX, clientY) {
  if (!els.lightboxInner) return;
  const clampedZoom = Math.max(_LB_ZOOM_MIN, Math.min(_LB_ZOOM_MAX, nextZoom));
  if (clampedZoom === 1) {
    resetLightboxTransform();
    return;
  }

  const rect = els.lightboxInner.getBoundingClientRect();
  const anchor = {
    x: clientX - (rect.left + rect.width / 2),
    y: clientY - (rect.top + rect.height / 2),
  };
  const scale = clampedZoom / _lbZoom;
  _lbPan = {
    x: anchor.x - scale * (anchor.x - _lbPan.x),
    y: anchor.y - scale * (anchor.y - _lbPan.y),
  };
  _lbZoom = clampedZoom;
  applyLightboxTransform();
}

function beginLightboxDrag(event) {
  if (els.lightboxVideo && !els.lightboxVideo.hidden) return;
  if (_lbZoom <= 1 || event.button !== 0 || !els.lightboxImg) return;
  event.preventDefault();
  _lbDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: _lbPan.x,
    originY: _lbPan.y,
  };
  els.lightboxImg.setPointerCapture(event.pointerId);
  applyLightboxTransform();
}

function moveLightboxDrag(event) {
  if (!_lbDrag || _lbDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const dx = event.clientX - _lbDrag.startX;
  const dy = event.clientY - _lbDrag.startY;
  _lbPan = {
    x: _lbDrag.originX + dx,
    y: _lbDrag.originY + dy,
  };
  applyLightboxTransform();
}

function endLightboxDrag(event) {
  if (!_lbDrag || _lbDrag.pointerId !== event.pointerId) return;
  try {
    els.lightboxImg?.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore capture cleanup issues.
  }
  _lbDrag = null;
  applyLightboxTransform();
}

function toggleLightboxZoom(event) {
  if (els.lightboxVideo && !els.lightboxVideo.hidden) return;
  event.preventDefault();
  if (_lbZoom <= 1) {
    zoomLightbox(2.5, event.clientX, event.clientY);
  } else {
    resetLightboxTransform();
  }
}

function isVideoLightboxOpen() {
  return Boolean(
    els.lightboxVideoShell &&
      !els.lightboxVideoShell.hidden &&
      els.lightboxVideo &&
      !els.lightboxVideo.hidden
  );
}

function setLightboxHint(text) {
  if (els.lightboxHint) {
    els.lightboxHint.textContent = text;
  }
}

function setLightboxMode(mode) {
  const isVideo = mode === 'video';
  if (els.lightboxInner) els.lightboxInner.hidden = isVideo;
  if (els.lightboxVideoShell) els.lightboxVideoShell.hidden = !isVideo;
  if (els.lightboxHint) {
    els.lightboxHint.hidden = isVideo;
    if (!isVideo) {
      setLightboxHint('Scroll to zoom · Drag to pan · Double-click to reset · Esc to close');
    }
  }
}

function formatLightboxTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const base = `${minutes}:${String(secs).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : base;
}

function syncLightboxVideoControls() {
  const video = els.lightboxVideo;
  if (!video || video.hidden) return;
  const playing = !video.paused && !video.ended;
  const muted = video.muted || video.volume === 0;
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

  if (els.lightboxVideoShell) {
    els.lightboxVideoShell.classList.toggle('is-playing', playing);
    els.lightboxVideoShell.classList.toggle('is-paused', !playing);
  }

  if (els.lightboxVideoPlay) {
    els.lightboxVideoPlay.innerHTML = iconSvg(playing ? 'pause' : 'play');
    els.lightboxVideoPlay.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
  }

  if (els.lightboxVideoOverlay) {
    els.lightboxVideoOverlay.innerHTML = iconSvg(playing ? 'pause' : 'play');
    els.lightboxVideoOverlay.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
  }

  if (els.lightboxVideoMute) {
    els.lightboxVideoMute.innerHTML = iconSvg(muted ? 'mute' : 'volume');
    els.lightboxVideoMute.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
  }

  if (els.lightboxVideoSeek) {
    els.lightboxVideoSeek.disabled = !duration;
    if (duration && !_lbVideoSeeking) {
      els.lightboxVideoSeek.value = String(Math.round((video.currentTime / duration) * 1000));
    }
  }

  if (els.lightboxVideoTime) {
    els.lightboxVideoTime.textContent = duration
      ? `${formatLightboxTime(video.currentTime)} / ${formatLightboxTime(duration)}`
      : `${formatLightboxTime(video.currentTime)} / 0:00`;
  }
}

function handleLightboxVideoSeekInput() {
  const video = els.lightboxVideo;
  if (!video || video.hidden) return;
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  if (!duration) return;
  const ratio = Number(els.lightboxVideoSeek?.value || 0) / 1000;
  video.currentTime = duration * ratio;
  syncLightboxVideoControls();
}

function toggleLightboxVideoPlayback() {
  const video = els.lightboxVideo;
  if (!video || video.hidden) return;
  if (video.paused || video.ended) {
    void video.play().catch(() => {});
  } else {
    video.pause();
  }
  syncLightboxVideoControls();
}

function toggleLightboxVideoMute() {
  const video = els.lightboxVideo;
  if (!video || video.hidden) return;
  video.muted = !video.muted;
  if (!video.muted && video.volume === 0) {
    video.volume = 1;
  }
  syncLightboxVideoControls();
}

function seekLightboxVideo(offsetSeconds) {
  const video = els.lightboxVideo;
  if (!video || video.hidden) return;
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  if (!duration) return;
  video.currentTime = Math.max(0, Math.min(duration, video.currentTime + offsetSeconds));
  syncLightboxVideoControls();
}

function openLightbox(url, alt, isVideo = false) {
  if (!els.lightbox) return;
  resetLightboxTransform();
  if (isVideo) {
    setLightboxMode('video');
    if (els.lightboxImg) {
      els.lightboxImg.hidden = true;
      els.lightboxImg.removeAttribute('src');
    }
    if (els.lightboxVideo) {
      els.lightboxVideo.hidden = false;
      els.lightboxVideo.pause();
      els.lightboxVideo.removeAttribute('src');
      els.lightboxVideo.load?.();
      els.lightboxVideo.src = url;
      els.lightboxVideo.currentTime = 0;
      els.lightboxVideo.muted = false;
      els.lightboxVideo.playsInline = true;
      els.lightboxVideo.controls = false;
      void els.lightboxVideo.play().catch(() => {});
      syncLightboxVideoControls();
    }
  } else {
    setLightboxMode('image');
    if (els.lightboxVideo) {
      _lbVideoSeeking = false;
      els.lightboxVideo.hidden = true;
      els.lightboxVideo.pause?.();
      els.lightboxVideo.removeAttribute('src');
      els.lightboxVideo.load?.();
    }
    if (els.lightboxImg) {
      els.lightboxImg.src = url;
      els.lightboxImg.alt = alt || '';
      els.lightboxImg.hidden = false;
    }
  }
  applyLightboxTransform();
  els.lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!els.lightbox) return;
  els.lightbox.hidden = true;
  setLightboxHint('Scroll to zoom · Drag to pan · Click outside to close');
  if (els.lightboxHint) els.lightboxHint.hidden = false;
  if (els.lightboxImg) {
    els.lightboxImg.hidden = true;
    els.lightboxImg.removeAttribute('src');
  }
  if (els.lightboxVideo) {
    _lbVideoSeeking = false;
    els.lightboxVideo.pause?.();
    els.lightboxVideo.removeAttribute('src');
    els.lightboxVideo.load?.();
    els.lightboxVideo.hidden = true;
  }
  if (els.lightboxVideoShell) {
    els.lightboxVideoShell.hidden = true;
    els.lightboxVideoShell.classList.remove('is-playing', 'is-paused');
  }
  document.body.style.overflow = '';
  resetLightboxTransform();
}

function shouldGroupMessage(chatMessage) {
  const last = els.chatLog.lastElementChild;
  if (!last || !last.dataset?.messageIdentity) return false;
  if (last.classList.contains('system-notice') || last.classList.contains('messages-empty'))
    return false;
  if (last.dataset.messageIdentity !== chatMessage.identity) return false;
  const lastId = last.dataset.messageId;
  const lastMsg = state.chatMessagesById.get(lastId);
  if (!lastMsg) return false;
  return (chatMessage.at || Date.now()) - (lastMsg.at || 0) < 60_000;
}

function loadAudioPrefs() {
  try {
    const data = JSON.parse(localStorage.getItem('debilbi:audioPrefs') || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveAudioPrefs() {
  localStorage.setItem('debilbi:audioPrefs', JSON.stringify(state.audioPrefs));
}

function getAudioPref(identity) {
  const pref = state.audioPrefs[identity] || {};
  const volume = Number.isFinite(Number(pref.volume)) ? Number(pref.volume) : 1;
  return {
    muted: Boolean(pref.muted),
    volume: Math.max(0, Math.min(1, volume)),
  };
}

function setAudioPref(identity, patch) {
  const next = {
    ...getAudioPref(identity),
    ...patch,
  };
  next.volume = Math.max(0, Math.min(1, Number(next.volume)));
  next.muted = Boolean(next.muted);
  state.audioPrefs[identity] = next;
  saveAudioPrefs();
  return next;
}

function renderAudioControlState(muteButton, volumeInput, pref) {
  muteButton.textContent = pref.muted ? 'Muted' : 'Mute';
  muteButton.classList.toggle('active', pref.muted);
  muteButton.disabled = false;
  muteButton.title = pref.muted ? 'Unmute locally' : 'Mute locally';
  volumeInput.value = String(Math.round(pref.volume * 100));
  volumeInput.disabled = false;
  volumeInput.title = `Local volume ${Math.round(pref.volume * 100)}%`;
}

function applyAudioPrefs(identity = '') {
  const selector = identity
    ? `audio[data-participant-identity="${cssEscape(identity)}"]`
    : 'audio[data-participant-identity]';
  els.audioSink.querySelectorAll(selector).forEach((audio) => {
    const pref = getAudioPref(audio.dataset.participantIdentity);
    audio.volume = pref.volume;
    audio.muted = pref.muted;
  });
}

function renderRoomListPresence(participants = []) {
  syncKnownAvatars(participants);
  els.roomItems.forEach((item) => {
    const roomId = item.dataset.roomItem;
    const users = item.querySelector('[data-room-users]');
    const pill = item.querySelector('.room-pill');
    users.replaceChildren();
    const roomUsers = presenceUsersForRoom(roomId, participants);
    item.classList.toggle('has-users', roomUsers.length > 0);
    if (pill) {
      pill.textContent = roomUsers.length ? String(roomUsers.length) : '';
    }
    for (const participant of roomUsers) {
      const user = document.createElement('div');
      user.className = 'room-user';
      if (!participant.mic) user.classList.add('is-muted');
      if (participant.screen) user.classList.add('is-screening');
      if (roomId === state.currentRoom && state.activeSpeakerIds.has(participant.identity))
        user.classList.add('is-speaking');
      const stateLabel = participant.screen ? 'screen' : participant.mic ? 'mic' : 'muted';
      user.innerHTML = `
        <span class="room-user-avatar"></span>
        <span class="room-user-name"></span>
        <span class="room-user-state"></span>
      `;
      renderAvatar(
        user.querySelector('.room-user-avatar'),
        participantAvatarUrl(participant) || participant.photo_url,
        participant.name
      );
      user.querySelector('.room-user-name').textContent = participant.name;
      const roomState = user.querySelector('.room-user-state');
      roomState.innerHTML = iconSvg(stateLabel);
      roomState.title = participant.self ? `you, ${stateLabel}` : stateLabel;
      users.appendChild(user);
    }
  });
}

function presenceUsersForRoom(roomId, localParticipants = []) {
  const remoteUsers = state.presenceByRoom[roomId] || [];
  const usersByIdentity = new Map();
  for (const user of remoteUsers) {
    if (user?.identity) {
      usersByIdentity.set(user.identity, { ...user });
    }
  }
  if (roomId === state.currentRoom) {
    for (const participant of localParticipants) {
      if (!participant?.identity) continue;
      const avatar = participantAvatarProfile(participant);
      usersByIdentity.set(participant.identity, {
        identity: participant.identity,
        name: displayName(participant),
        username: avatar.username,
        photo_url: participant.isLocal ? state.user?.photo_url || avatar.photoUrl : avatar.photoUrl,
        mic: hasMic(participant),
        screen: collectScreenShares([participant]).length > 0,
        self: Boolean(participant.isLocal),
      });
    }
  }
  return Array.from(usersByIdentity.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
}

function selectedScreenPreset() {
  state.screenQuality = normalizeScreenQuality(state.screenQuality);
  return screenQualityPresets[state.screenQuality];
}

function normalizeScreenQuality(value) {
  const migrated = legacyScreenQualityMap[value] || value;
  return screenQualityPresets[migrated] ? migrated : 'smooth1080';
}

function buildScreenCaptureOptions() {
  const preset = selectedScreenPreset();
  return {
    audio: true,
    contentHint: preset.contentHint,
    resolution: {
      width: preset.width,
      height: preset.height,
      frameRate: preset.fps,
    },
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
    systemAudio: 'include',
  };
}

function buildScreenPublishOptions() {
  const preset = selectedScreenPreset();
  const options = {
    degradationPreference: preset.degradationPreference,
    screenShareEncoding: {
      maxBitrate: preset.bitrate,
      maxFramerate: preset.fps,
      priority: 'high',
    },
    simulcast: preset.simulcast ?? true,
  };
  if (preset.codec) {
    options.videoCodec = preset.codec;
    options.backupCodec = true;
  }
  return options;
}

async function setScreenShare(enabled) {
  try {
    if (!enabled) {
      await state.room.localParticipant.setScreenShareEnabled(false);
      renderRoom();
      return;
    }
    await state.room.localParticipant.setScreenShareEnabled(
      true,
      buildScreenCaptureOptions(),
      buildScreenPublishOptions()
    );
  } catch (error) {
    if (enabled && !isCaptureCancel(error)) {
      await state.room.localParticipant.setScreenShareEnabled(false).catch(() => {});
      await state.room.localParticipant.setScreenShareEnabled(
        true,
        buildScreenCaptureOptions(),
        buildScreenPublishOptions()
      );
    } else {
      throw error;
    }
  }
  renderRoom();
}

async function restartScreenShare() {
  if (!isConnected() || !hasLocalScreen()) return;
  await state.room.localParticipant.setScreenShareEnabled(false).catch(() => {});
  await setScreenShare(true);
}

function isCaptureCancel(error) {
  return ['AbortError', 'NotAllowedError', 'NotFoundError'].includes(error?.name);
}

function renderScreens(screens) {
  els.screenFocus.replaceChildren();
  els.screenStrip.replaceChildren();

  if (!screens.length) {
    state.focusedScreenId = '';
    els.screenStage.classList.add('is-hidden');
    renderTheater();
    return;
  }

  if (!screens.some((screen) => screen.id === state.focusedScreenId)) {
    state.focusedScreenId = screens[0].id;
  }

  const focused = screens.find((screen) => screen.id === state.focusedScreenId) || screens[0];
  els.screenStage.classList.remove('is-hidden');
  els.screenFocus.classList.toggle('fit-cover', state.screenFit === 'cover');

  const focusTile = document.createElement('article');
  focusTile.className = 'focused-screen';
  const focusVideo = focused.track.attach();
  focusVideo.__livekitTrack = focused.track;
  focusVideo.autoplay = true;
  focusVideo.playsInline = true;
  focusVideo.muted = focused.participant.isLocal;
  focusTile.append(focusVideo, screenLabel(focused));
  focusTile.addEventListener('dblclick', openTheater);
  els.screenFocus.appendChild(focusTile);

  for (const screen of screens) {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'screen-thumb';
    if (screen.id === state.focusedScreenId) thumb.classList.add('active');
    const video = screen.track.attach();
    video.__livekitTrack = screen.track;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    const name = document.createElement('span');
    name.textContent = displayName(screen.participant);
    thumb.append(video, name);
    thumb.addEventListener('click', () => {
      state.focusedScreenId = screen.id;
      renderRoom();
    });
    els.screenStrip.appendChild(thumb);
  }

  renderTheater();
}

function renderTheater() {
  els.theaterMedia.replaceChildren();
  if (!state.theaterOpen) {
    els.theater.classList.remove('open');
    els.theater.setAttribute('aria-hidden', 'true');
    syncTheaterControls();
    return;
  }

  const focused = collectVisibleScreenShares(getParticipants()).find(
    (screen) => screen.id === state.focusedScreenId
  );
  if (!focused) {
    void closeTheater();
    return;
  }

  els.theater.classList.add('open');
  els.theater.setAttribute('aria-hidden', 'false');
  els.theaterTitle.textContent = `${displayName(focused.participant)} screen`;
  const video = focused.track.attach();
  video.__livekitTrack = focused.track;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = focused.participant.isLocal;
  els.theaterMedia.classList.toggle('fit-cover', state.screenFit === 'cover');
  els.theaterMedia.appendChild(video);
  syncTheaterControls();
}

function attachAudio(participants) {
  const desiredByIdentity = new Map();
  for (const participant of participants) {
    const publications = Array.from(participant.trackPublications.values()).filter(
      (publication) =>
        publication?.track && publication.track.kind === Track.Kind.Audio && !publication.isMuted
    );
    if (!publications.length) continue;
    const publication =
      publications.find((item) => item.source === Track.Source.Microphone) ||
      publications.find((item) => item.source !== Track.Source.ScreenShare) ||
      publications[0];
    if (!publication) continue;

    const audioPref = getAudioPref(participant.identity);
    desiredByIdentity.set(participant.identity, { participant, publication, audioPref });
  }

  const existingByIdentity = new Map();
  els.audioSink.querySelectorAll('audio[data-participant-identity]').forEach((audio) => {
    const identity = audio.dataset.participantIdentity || '';
    if (!identity) {
      detachAudioElement(audio);
      return;
    }
    const bucket = existingByIdentity.get(identity) || [];
    bucket.push(audio);
    existingByIdentity.set(identity, bucket);
  });

  for (const [identity, nodes] of existingByIdentity.entries()) {
    const desired = desiredByIdentity.get(identity);
    if (!desired) {
      for (const node of nodes) {
        detachAudioElement(node);
      }
      continue;
    }

    const [keep, ...extras] = nodes;
    const trackChanged = !keep || keep.__livekitTrack !== desired.publication.track;
    let element = keep;
    if (trackChanged) {
      const next = desired.publication.track.attach();
      next.__livekitTrack = desired.publication.track;
      applyAudioElementState(next, desired.participant, desired.audioPref, desired.publication);
      if (keep) {
        keep.replaceWith(next);
        detachAudioElement(keep);
      } else {
        els.audioSink.appendChild(next);
      }
      element = next;
    } else {
      applyAudioElementState(element, desired.participant, desired.audioPref, desired.publication);
    }

    for (const node of extras) {
      detachAudioElement(node);
    }
    desiredByIdentity.delete(identity);
  }

  for (const [identity, desired] of desiredByIdentity.entries()) {
    const element = desired.publication.track.attach();
    element.__livekitTrack = desired.publication.track;
    applyAudioElementState(element, desired.participant, desired.audioPref, desired.publication);
    els.audioSink.appendChild(element);
  }
}

function applyAudioElementState(element, participant, audioPref, publication) {
  element.dataset.participantIdentity = participant.identity;
  element.dataset.trackSid = publication.trackSid || publication.track?.sid || '';
  element.autoplay = true;
  element.playsInline = true;
  element.controls = false;
  element.volume = audioPref.volume;
  element.muted = Boolean(participant.isLocal) || audioPref.muted;
}

function detachAudioElement(element) {
  if (!element) return;
  if (element.__livekitTrack?.detach) {
    try {
      element.__livekitTrack.detach(element);
    } catch (error) {
      console.warn(error);
    }
  }
  element.srcObject = null;
  element.remove();
}

function collectScreenShares(participants) {
  const screens = [];
  for (const participant of participants) {
    for (const publication of participant.trackPublications.values()) {
      if (!publication.track || publication.track.kind !== Track.Kind.Video || publication.isMuted)
        continue;
      if (publication.source !== Track.Source.ScreenShare) continue;
      screens.push({
        id: publication.trackSid || `${participant.identity}-screen`,
        participant,
        publication,
        track: publication.track,
      });
    }
  }
  return screens;
}

function screenLabel(screen) {
  const label = document.createElement('div');
  label.className = 'screen-label';
  const name = document.createElement('strong');
  name.textContent = `${displayName(screen.participant)} screen`;
  const hint = document.createElement('span');
  hint.textContent = 'double click to expand';
  label.append(name, hint);
  return label;
}

function clearMedia() {
  [
    ...els.screenFocus.querySelectorAll('video, audio'),
    ...els.screenStrip.querySelectorAll('video, audio'),
    ...els.theaterMedia.querySelectorAll('video, audio'),
    ...els.audioSink.querySelectorAll('audio'),
  ].forEach((element) => {
    if (element.__livekitTrack?.detach) {
      try {
        element.__livekitTrack.detach(element);
      } catch (error) {
        console.warn(error);
      }
    }
    element.srcObject = null;
    element.remove();
  });
  els.screenFocus.replaceChildren();
  els.screenStrip.replaceChildren();
  els.audioSink.replaceChildren();
}

function renderEmptyState() {
  renderPeople([]);
  renderVoiceStrip([]);
  renderRoomListPresence([]);
  updateControls();
}

function startPresencePolling() {
  clearInterval(state.presenceTimer);
  state.presenceTimer = window.setInterval(() => {
    void refreshPresence();
    if (isConnected()) {
      void pushPresence();
    }
  }, PRESENCE_POLL_INTERVAL_MS);
}

function recordSeenUser(participant) {
  if (!participant?.identity) return;
  const profile = participantAvatarProfile(participant);
  state.seenUsers.set(participant.identity, {
    identity: participant.identity,
    name: displayName(participant),
    username: profile.username,
    photo_url: profile.photoUrl || state.seenUsers.get(participant.identity)?.photo_url || '',
  });
}

function recordSeenUserFromPresence(user) {
  if (!user?.identity) return;
  const existing = state.seenUsers.get(user.identity) || {};
  state.seenUsers.set(user.identity, {
    identity: user.identity,
    name: user.name || existing.name || '',
    username: user.username || existing.username || '',
    photo_url: user.photo_url || existing.photo_url || '',
  });
}

async function refreshPresence() {
  if (!state.session) return;
  try {
    const response = await fetch('/api/presence', { headers: authHeaders() });
    if (!response.ok) throw new Error('presence request failed');
    const data = await response.json();
    state.presenceByRoom = data.rooms || {};
    // Track everyone seen in presence
    for (const users of Object.values(state.presenceByRoom)) {
      for (const user of users) recordSeenUserFromPresence(user);
    }
    const participants = getParticipants();
    for (const p of participants) recordSeenUser(p);
    syncKnownAvatars(participants);
    renderPresence(participants);
    attachAudio(participants);
    refreshChatAvatars();
  } catch (error) {
    console.warn(error);
  }
}

async function pushPresence() {
  if (!state.session || !isConnected()) return;
  try {
    const response = await fetch('/api/presence', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        room: state.currentRoom,
        mic: hasLocalMic(),
        screen: hasLocalScreen(),
      }),
    });
    if (!response.ok) throw new Error('presence update failed');
    const data = await response.json();
    state.presenceByRoom = data.rooms || {};
    const participants = getParticipants();
    syncKnownAvatars(participants);
    renderPresence(participants);
    attachAudio(participants);
  } catch (error) {
    console.warn(error);
  }
}

async function clearPresence() {
  if (!state.session) return;
  try {
    const response = await fetch('/api/presence', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ room: '' }),
    });
    if (response.ok) {
      const data = await response.json();
      state.presenceByRoom = data.rooms || {};
      const participants = getParticipants();
      syncKnownAvatars(participants);
      renderPresence(participants);
      attachAudio(participants);
    }
  } catch (error) {
    console.warn(error);
  }
}

async function loadChannels() {
  try {
    const response = await fetch('/api/channels', { headers: authHeaders() });
    if (!response.ok) throw new Error('channels request failed');
    const data = await response.json();
    if (Array.isArray(data.channels)) {
      state.channels = data.channels;
      applyChannelLabels();
      selectRoom(state.currentRoom, { loadHistory: false });
    }
  } catch (error) {
    console.warn(error);
    applyChannelLabels();
  }
}

function applyChannelLabels() {
  for (const channel of state.channels) {
    const item = document.querySelector(`[data-room-item="${cssEscape(channel.id)}"]`);
    if (!item) continue;
    const name = item.querySelector('.room-name');
    const topic = item.querySelector('.room-topic');
    if (name) name.textContent = channel.name || channel.id;
    if (topic) topic.textContent = '';
  }
}

async function renameChannel(roomName) {
  const channel = state.channels.find((item) => item.id === roomName);
  const currentName = channel?.name || roomName;
  const nextName = window.prompt('Rename channel', currentName);
  if (nextName === null) return;
  const clean = nextName.trim();
  if (!clean || clean === currentName) return;
  try {
    const response = await fetch('/api/channels/rename', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ room: roomName, name: clean }),
    });
    if (!response.ok) throw new Error('rename failed');
    const data = await response.json();
    state.channels = Array.isArray(data.channels) ? data.channels : state.channels;
    applyChannelLabels();
    selectRoom(state.currentRoom, { loadHistory: false });
    addSystemNotice(`channel renamed to #${channelLabel(roomName)}`);
  } catch (error) {
    console.error(error);
    addSystemNotice(`rename failed: ${error.message}`);
  }
}

function channelLabel(roomName) {
  return state.channels.find((channel) => channel.id === roomName)?.name || roomName;
}

async function loadHistory(roomName) {
  const room = roomName || state.chatRoom || state.currentRoom || 'lobby';
  try {
    const response = await fetch(`/api/messages?room=${encodeURIComponent(room)}&limit=150`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('history request failed');
    const data = await response.json();
    syncKnownAvatars(data.messages || []);
    clearMessages();
    state.chatRoom = data.room || room;
    syncChatRoomButtons(state.chatRoom);
    for (const message of data.messages || []) {
      if (isChatMessage(message)) {
        addMessage(message, message.identity === state.identity);
      }
    }
    if (!(data.messages || []).length) {
      addEmptyNotice('No messages yet.');
    }
  } catch (error) {
    console.error(error);
    clearMessages();
    addEmptyNotice('History is unavailable.');
  } finally {
    updateControls();
  }
}

async function saveMessage(body, attachments = []) {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      room: state.chatRoom || state.currentRoom || 'lobby',
      author: state.name || els.displayName.value || 'Guest',
      identity: state.identity,
      body,
      attachments,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'history save failed');
  }
  const data = await response.json();
  return data.message;
}

function addPendingFiles(files) {
  const nextFiles = files.filter((file) => file.size <= maxUploadBytes);
  const freeSlots = Math.max(0, 5 - state.pendingFiles.length);
  state.pendingFiles = state.pendingFiles.concat(nextFiles.slice(0, freeSlots));
  if (nextFiles.length !== files.length) {
    addSystemNotice('some files are larger than 100 MB');
  }
  if (files.length > freeSlots) {
    addSystemNotice('up to 5 files per message');
  }
  renderAttachmentTray();
}

function getClipboardFiles(clipboardData) {
  if (!clipboardData) return [];
  const itemFiles = Array.from(clipboardData.items || [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(Boolean);
  const files = itemFiles.length ? itemFiles : Array.from(clipboardData.files || []);
  return files.map((file, index) => normalizeClipboardFile(file, index));
}

function normalizeClipboardFile(file, index) {
  const type = file.type || 'image/png';
  const hasName = file.name && file.name !== 'image.png';
  if (hasName) return file;
  const extension = clipboardFileExtension(type);
  return new File([file], `screenshot-${Date.now()}-${index + 1}.${extension}`, {
    type,
    lastModified: Date.now(),
  });
}

function clipboardFileExtension(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'png';
}

function renderAttachmentTray() {
  els.attachmentTray.replaceChildren();
  els.attachmentTray.hidden = state.pendingFiles.length === 0;
  state.pendingFiles.forEach((file, index) => {
    const chip = document.createElement('span');
    chip.className = 'attachment-chip';
    const name = document.createElement('span');
    name.textContent = `${file.name} · ${formatBytes(file.size)}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'x';
    remove.title = 'Remove file';
    remove.addEventListener('click', () => {
      state.pendingFiles.splice(index, 1);
      renderAttachmentTray();
    });
    chip.append(name, remove);
    els.attachmentTray.appendChild(chip);
  });
}

async function uploadFiles(files) {
  const attachments = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `upload failed: ${file.name}`);
    }
    const data = await response.json();
    if (data.attachment) {
      attachments.push(data.attachment);
    }
  }
  return attachments;
}

function setComposerBusy(isBusy) {
  const canChat = Boolean(state.user);
  els.chatSend.disabled = isBusy || !canChat;
  els.fileButton.disabled = isBusy || !canChat;
  els.chatInput.disabled = isBusy || !canChat;
  els.chatSend.textContent = isBusy ? '...' : 'Send';
}

// ── Mention sound ──────────────────────────────────────────────────
let _mentionAudio = null;
function playMentionSound() {
  try {
    if (!_mentionAudio) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
      return;
    }
    _mentionAudio.currentTime = 0;
    _mentionAudio.play().catch(() => {});
  } catch {}
}

function isMentioned(body) {
  if (!body || !state.user) return false;
  const username = state.user.username;
  const name = state.user.name;
  if (username && body.toLowerCase().includes(`@${username.toLowerCase()}`)) return true;
  if (name && body.toLowerCase().includes(`@${name.toLowerCase().replace(/\s+/g, '')}`))
    return true;
  return false;
}

// ── @mention autocomplete ──────────────────────────────────────────
let mentionPopup = null;
let mentionStart = -1;

function getMentionQuery() {
  const val = els.chatInput.value;
  const pos = els.chatInput.selectionStart;
  const before = val.slice(0, pos);
  const match = before.match(/@([\w]*)$/);
  if (!match) return null;
  return { query: match[1].toLowerCase(), start: pos - match[0].length, end: pos };
}

function getMentionCandidates(query) {
  const seen = Array.from(state.seenUsers.values());
  return seen
    .filter((u) => {
      const n = (u.username || u.name || '').toLowerCase();
      return n.startsWith(query) && u.identity !== state.identity;
    })
    .slice(0, 6);
}

function closeMentionPopup() {
  mentionPopup?.remove();
  mentionPopup = null;
  mentionStart = -1;
}

function showMentionPopup(candidates, mention) {
  closeMentionPopup();
  if (!candidates.length) return;
  mentionStart = mention.start;
  const popup = document.createElement('div');
  popup.className = 'mention-popup';
  for (const user of candidates) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'mention-item';
    const display = user.username ? `@${user.username}` : user.name;
    const sub = user.username ? user.name : '';
    item.innerHTML = `<span class="mention-name">${display}</span>${
      sub ? `<span class="mention-sub">${sub}</span>` : ''
    }`;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      insertMention(user, mention);
      closeMentionPopup();
    });
    popup.appendChild(item);
  }
  // Position above composer
  const composerRect = els.chatForm.getBoundingClientRect();
  popup.style.left = composerRect.left + 16 + 'px';
  popup.style.bottom = window.innerHeight - composerRect.top + 4 + 'px';
  document.body.appendChild(popup);
  mentionPopup = popup;
}

function insertMention(user, mention) {
  const tag = user.username ? `@${user.username}` : `@${user.name}`;
  const val = els.chatInput.value;
  const before = val.slice(0, mention.start);
  const after = val.slice(mention.end);
  els.chatInput.value = before + tag + ' ' + after;
  const newPos = mention.start + tag.length + 1;
  els.chatInput.setSelectionRange(newPos, newPos);
  els.chatInput.focus();
  els.chatInput.dispatchEvent(new Event('input'));
}

function setupMentionAutocomplete() {
  els.chatInput.addEventListener('input', () => {
    const mention = getMentionQuery();
    if (!mention) {
      closeMentionPopup();
      return;
    }
    const candidates = getMentionCandidates(mention.query);
    if (candidates.length) showMentionPopup(candidates, mention);
    else closeMentionPopup();
  });

  els.chatInput.addEventListener('keydown', (e) => {
    if (!mentionPopup) return;
    const items = mentionPopup.querySelectorAll('.mention-item');
    const active = mentionPopup.querySelector('.mention-item.active');
    const idx = active ? Array.from(items).indexOf(active) : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items.forEach((el) => el.classList.remove('active'));
      (items[idx + 1] || items[0])?.classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items.forEach((el) => el.classList.remove('active'));
      (items[idx - 1] || items[items.length - 1])?.classList.add('active');
    } else if (e.key === 'Tab' || (e.key === 'Enter' && active)) {
      e.preventDefault();
      active?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    } else if (e.key === 'Escape') {
      closeMentionPopup();
    }
  });

  els.chatInput.addEventListener('blur', () => {
    setTimeout(closeMentionPopup, 150);
  });
}

setupMentionAutocomplete();

function addMessage(chatMessage, own) {
  if (!isChatMessage(chatMessage)) return;
  if (chatMessage.id && state.messageIds.has(chatMessage.id)) return;
  if (chatMessage.id) state.messageIds.add(chatMessage.id);
  recordAvatar(chatMessage.identity, chatMessage.photo_url, chatMessage.username);

  const grouped = shouldGroupMessage(chatMessage);
  const row = document.createElement('article');
  row.className = 'message';
  row.dataset.messageIdentity = chatMessage.identity || '';
  row.dataset.messageId =
    chatMessage.id || `${chatMessage.identity || 'message'}-${chatMessage.at || Date.now()}`;
  if (own) row.classList.add('own');
  if (grouped) row.classList.add('grouped');

  const avatar = document.createElement('span');
  avatar.className = 'message-avatar';
  renderAvatar(avatar, messageAvatarUrl(chatMessage), chatMessage.author || 'Guest');

  const contentWrap = document.createElement('div');
  contentWrap.className = 'message-content';

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const name = document.createElement('strong');
  name.textContent = chatMessage.author || 'Guest';
  const time = document.createElement('span');
  time.textContent = new Date(chatMessage.at || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  meta.append(name, time);
  contentWrap.appendChild(meta);

  if (chatMessage.body) {
    const content = document.createElement('p');
    const isFresh = Date.now() - (chatMessage.at || 0) < 30_000;
    if (!own && isMentioned(chatMessage.body)) {
      row.classList.add('is-mention');
      if (isFresh) playMentionSound();
    }
    content.textContent = chatMessage.body;
    contentWrap.appendChild(content);
  }
  const attachments = renderCompactAttachments(chatMessage.attachments || []);
  if (attachments) {
    contentWrap.appendChild(attachments);
  }
  row.append(avatar, contentWrap);
  els.chatLog.querySelector('.messages-empty')?.remove();
  els.chatLog.appendChild(row);
  state.chatMessagesById.set(row.dataset.messageId, chatMessage);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function renderMessageAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'message-attachments';
  for (const attachment of attachments) {
    if (!attachment?.url) continue;
    const kind = getAttachmentKind(attachment);
    if (kind === 'image') {
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'image-attachment';

      const image = document.createElement('img');
      image.className = 'attachment-preview';
      image.src = attachment.url;
      image.alt = attachment.name || 'image attachment';
      image.loading = 'lazy';

      link.appendChild(image);
      link.addEventListener('click', () => openLightbox(attachment.url, attachment.name || ''));
      wrap.appendChild(link);
      continue;
    }

    if (kind === 'video') {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'video-attachment';
      card.title = attachment.name || 'video';
      card.setAttribute('aria-label', `Open video ${attachment.name || 'attachment'}`);
      const player = document.createElement('video');
      player.className = 'video-attachment-preview attachment-video';
      player.playsInline = true;
      player.preload = 'metadata';
      player.muted = true;
      player.controls = false;
      player.tabIndex = -1;
      player.setAttribute('aria-hidden', 'true');
      player.src = attachment.url;
      card.append(player);
      card.addEventListener('click', () => {
        openLightbox(attachment.url, attachment.name || '', true);
      });
      wrap.appendChild(card);
      continue;
    }

    if (kind === 'video') {
      const card = document.createElement('article');
      card.className = 'message-attachment media-attachment video-attachment';
      const icon = document.createElement('span');
      icon.className = 'attachment-icon';
      icon.textContent = 'VID';
      const main = document.createElement('span');
      main.className = 'attachment-main';
      const namEl = document.createElement('span');
      namEl.className = 'attachment-name';
      namEl.textContent = attachment.name || 'video';
      const meta = document.createElement('span');
      meta.className = 'attachment-meta';
      meta.textContent = `${attachment.type || 'video'} · ${formatBytes(attachment.size || 0)}`;
      main.append(namEl, meta);
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'attachment-open';
      open.textContent = 'Open';
      open.style.background = 'none';
      open.style.border = '0';
      open.style.padding = '0';
      open.style.font = 'inherit';
      open.addEventListener('click', (event) => {
        event.stopPropagation();
        openLightbox(attachment.url, attachment.name || '', true);
      });
      const player = document.createElement('video');
      player.className = 'attachment-player attachment-video';
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      player.src = attachment.url;
      card.append(icon, main, open, player);
      wrap.appendChild(card);
      continue;
    }

    if (kind === 'audio') {
      const card = document.createElement('article');
      card.className = 'message-attachment media-attachment audio-attachment';
      const icon = document.createElement('span');
      icon.className = 'attachment-icon';
      icon.textContent = 'AUD';
      const main = document.createElement('span');
      main.className = 'attachment-main';
      const namEl = document.createElement('span');
      namEl.className = 'attachment-name';
      namEl.textContent = attachment.name || 'audio';
      const meta = document.createElement('span');
      meta.className = 'attachment-meta';
      meta.textContent = `${attachment.type || 'audio'} · ${formatBytes(attachment.size || 0)}`;
      main.append(namEl, meta);
      const player = document.createElement('audio');
      player.className = 'attachment-player attachment-audio';
      player.controls = true;
      player.preload = 'metadata';
      player.src = attachment.url;
      card.append(icon, main, player);
      wrap.appendChild(card);
      continue;
    }

    const link = document.createElement('a');
    link.className = 'message-attachment';
    link.href = attachment.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = attachment.name || '';

    const icon = document.createElement('span');
    icon.className = 'attachment-icon';
    icon.textContent = 'FILE';

    const main = document.createElement('span');
    main.className = 'attachment-main';
    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = attachment.name || 'file';
    const meta = document.createElement('span');
    meta.className = 'attachment-meta';
    meta.textContent = `${attachment.type || 'file'} · ${formatBytes(attachment.size || 0)}`;
    main.append(name, meta);

    const open = document.createElement('span');
    open.className = 'attachment-meta attachment-open-label';
    open.textContent = 'Open';
    link.append(icon, main, open);

    wrap.appendChild(link);
  }
  return wrap.childElementCount ? wrap : null;
}

function getAttachmentKind(attachment) {
  const type = String(attachment.type || '').toLowerCase();
  const extension = getAttachmentExtension(attachment);
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/') || audioAttachmentExtensions.has(extension)) return 'audio';
  if (type.startsWith('video/') || videoAttachmentExtensions.has(extension)) return 'video';
  return 'file';
}

function renderCompactAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'message-attachments';
  for (const attachment of attachments) {
    if (!attachment?.url) continue;
    const kind = getAttachmentKind(attachment);

    if (kind === 'image') {
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'image-attachment';

      const image = document.createElement('img');
      image.className = 'attachment-preview';
      image.src = attachment.url;
      image.alt = attachment.name || 'image attachment';
      image.loading = 'lazy';

      link.appendChild(image);
      link.addEventListener('click', () => openLightbox(attachment.url, attachment.name || ''));
      wrap.appendChild(link);
      continue;
    }

    if (kind === 'video') {
      const card = document.createElement('article');
      card.className = 'video-attachment';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.title = attachment.name || 'video';
      card.setAttribute('aria-label', `Open video ${attachment.name || 'attachment'}`);

      const player = document.createElement('video');
      player.className = 'video-attachment-preview attachment-video';
      player.playsInline = true;
      player.preload = 'metadata';
      player.muted = true;
      player.controls = false;
      player.tabIndex = -1;
      player.setAttribute('aria-hidden', 'true');
      player.src = attachment.url;

      const openVideo = () => openLightbox(attachment.url, attachment.name || '', true);
      card.append(player);
      card.addEventListener('click', openVideo);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openVideo();
        }
      });
      wrap.appendChild(card);
      continue;
    }

    if (kind === 'audio') {
      const card = document.createElement('article');
      card.className = 'message-attachment media-attachment audio-attachment';
      const icon = document.createElement('span');
      icon.className = 'attachment-icon';
      icon.textContent = 'AUD';
      const main = document.createElement('span');
      main.className = 'attachment-main';
      const namEl = document.createElement('span');
      namEl.className = 'attachment-name';
      namEl.textContent = attachment.name || 'audio';
      const meta = document.createElement('span');
      meta.className = 'attachment-meta';
      meta.textContent = `${attachment.type || 'audio'} · ${formatBytes(attachment.size || 0)}`;
      main.append(namEl, meta);
      const player = document.createElement('audio');
      player.className = 'attachment-player attachment-audio';
      player.controls = true;
      player.preload = 'metadata';
      player.src = attachment.url;
      card.append(icon, main, player);
      wrap.appendChild(card);
      continue;
    }

    const link = document.createElement('a');
    link.className = 'message-attachment';
    link.href = attachment.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = attachment.name || '';

    const icon = document.createElement('span');
    icon.className = 'attachment-icon';
    icon.textContent = 'FILE';

    const main = document.createElement('span');
    main.className = 'attachment-main';
    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = attachment.name || 'file';
    const meta = document.createElement('span');
    meta.className = 'attachment-meta';
    meta.textContent = `${attachment.type || 'file'} · ${formatBytes(attachment.size || 0)}`;
    main.append(name, meta);

    const open = document.createElement('span');
    open.className = 'attachment-meta attachment-open-label';
    open.textContent = 'Open';
    link.append(icon, main, open);
    wrap.appendChild(link);
  }
  return wrap.childElementCount ? wrap : null;
}

function getAttachmentExtension(attachment) {
  const source = String(attachment.name || attachment.url || '');
  const clean = source.split(/[?#]/)[0];
  const fileName = clean.slice(clean.lastIndexOf('/') + 1);
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

function addSystemNotice(body) {
  const notice = document.createElement('div');
  notice.className = 'system-notice';
  notice.textContent = body;
  els.chatLog.querySelector('.messages-empty')?.remove();
  els.chatLog.appendChild(notice);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function addEmptyNotice(body) {
  const notice = document.createElement('div');
  notice.className = 'messages-empty';
  notice.textContent = body;
  els.chatLog.appendChild(notice);
}

function clearMessages() {
  els.chatLog.replaceChildren();
  state.messageIds.clear();
  state.chatMessagesById.clear();
}

async function selectAndJoinRoom(roomName) {
  if (!roomName) return;
  state.chatRoomExplicit = false;
  const alreadyInside = isConnected() && state.currentRoom === roomName;
  selectRoom(roomName, { loadHistory: !alreadyInside && !isConnected() });
  if (alreadyInside) {
    state.chatRoom = roomName;
    syncChatRoomButtons(roomName);
    await loadHistory(roomName);
    els.chatInput.focus();
    return;
  }
  await joinRoom(roomName);
}

async function openTextChat(roomName) {
  if (!roomName) return;
  state.chatRoomExplicit = true;
  state.chatRoom = roomName;
  syncChatRoomButtons(roomName);
  await loadHistory(roomName);
  requestAnimationFrame(() => {
    els.chatInput.focus({ preventScroll: true });
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
  });
}

function selectRoom(roomName, options = {}) {
  if (!roomName) return;
  const { loadHistory: shouldLoadHistory = true } = options;
  state.currentRoom = roomName;
  els.activeRoom.textContent = channelLabel(roomName);
  els.roomShortcuts.forEach((button) => {
    button.classList.toggle('active', button.dataset.room === roomName);
  });
  els.roomItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.roomItem === roomName);
  });
  renderRoomListPresence(getParticipants());
  if (shouldLoadHistory && !isConnected()) {
    void loadHistory(roomName);
  }
}

function syncChatRoomButtons(roomName = state.chatRoom) {
  els.roomChatButtons.forEach((button) => {
    const active = button.dataset.roomChat === roomName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  // chatRoomLabel removed from HTML
}

function openTheater() {
  if (!state.focusedScreenId) return;
  state.theaterOpen = true;
  renderTheater();
}

async function closeTheater() {
  if (document.fullscreenElement === els.theater) {
    try {
      await document.exitFullscreen?.();
    } catch (error) {
      console.warn(error);
    }
  }
  state.theaterOpen = false;
  renderTheater();
}

function resetRoom() {
  state.room = null;
  state.identity = '';
  state.focusedScreenId = '';
  state.activeSpeakerIds = new Set();
  updateConnection('offline');
  clearMedia();
  els.screenStage.classList.add('is-hidden');
  void closeTheater();
  renderEmptyState();
  renderRoomListPresence([]);
}

function updateControls() {
  const connected = isConnected();
  const hasScreen = collectVisibleScreenShares(getParticipants()).length > 0;
  const localMic = hasLocalMic();
  const localScreen = hasLocalScreen();
  const canChat = Boolean(state.user);

  els.micButton.disabled = !connected;
  els.screenButton.disabled = !connected;
  els.screenQuality.disabled = !connected;
  els.fitButton.disabled = !hasScreen;
  els.theaterButton.disabled = !hasScreen;
  els.leaveButton.disabled = !connected;
  els.chatInput.disabled = !canChat || state.isJoining;
  els.chatSend.disabled = !canChat || state.isJoining;
  els.fileButton.disabled = !canChat || state.isJoining;
  if (els.screenToggleButton) {
    els.screenToggleButton.disabled = !canChat;
    els.screenToggleButton.classList.toggle('active', state.screenDisabledLocal);
    const demoTitle = state.screenDisabledLocal ? 'Show demos locally' : 'Hide demos locally';
    els.screenToggleButton.title = demoTitle;
    els.screenToggleButton.setAttribute('aria-label', demoTitle);
    els.screenToggleButton.setAttribute('aria-pressed', String(state.screenDisabledLocal));
  }
  els.micButton.classList.toggle('active', localMic);
  els.screenButton.classList.toggle('active', localScreen);
  els.micButton.title = localMic ? 'Mic on' : 'Mic off';
  els.micButton.setAttribute('aria-label', els.micButton.title);
  els.screenButton.title = localScreen
    ? `Stop sharing (${selectedScreenPreset().label})`
    : `Share screen (${selectedScreenPreset().label})`;
  els.screenButton.setAttribute('aria-label', els.screenButton.title);
  els.screenQuality.value = state.screenQuality;
  els.fitButton.dataset.fit = state.screenFit;
  els.fitButton.title = state.screenFit === 'contain' ? 'Contain screen' : 'Fill screen';
  els.fitButton.setAttribute('aria-label', els.fitButton.title);
  syncTheaterControls();
  els.leaveButton.title = 'Leave room';
  els.leaveButton.setAttribute('aria-label', 'Leave room');
  els.captureMode.textContent = 'raw mic';
}

function setBusy(isBusy) {
  state.isJoining = isBusy;
  els.roomShortcuts.forEach((button) => {
    button.disabled = isBusy;
  });
  els.roomChatButtons.forEach((button) => {
    button.disabled = isBusy;
  });
  els.roomRenameButtons.forEach((button) => {
    button.disabled = isBusy;
  });
  els.chatInput.disabled = isBusy || !state.user;
  els.chatSend.disabled = isBusy || !state.user;
  els.fileButton.disabled = isBusy || !state.user;
}

function updateConnection(value) {
  els.connectionState.textContent = value;
}

function updateParticipantCount(_count) {
  // removed — counter hidden per user request
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(state.session ? { Authorization: `Bearer ${state.session}` } : {}),
  };
}

function isChatMessage(message) {
  return Boolean(
    message && (message.body || (Array.isArray(message.attachments) && message.attachments.length))
  );
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/"/g, '\\"');
}

function getParticipants() {
  if (!state.room || state.room.state === ConnectionState.Disconnected) return [];
  return [state.room.localParticipant, ...Array.from(state.room.remoteParticipants.values())];
}

function isConnected() {
  return Boolean(state.room && state.room.state === ConnectionState.Connected);
}

function hasLocalMic() {
  return Boolean(state.room && hasMic(state.room.localParticipant));
}

function hasLocalScreen() {
  if (!state.room) return false;
  return collectScreenShares([state.room.localParticipant]).length > 0;
}

function hasMic(participant) {
  if (!participant) return false;
  for (const publication of participant.trackPublications.values()) {
    if (
      publication.source === Track.Source.Microphone &&
      publication.track &&
      !publication.isMuted
    ) {
      return true;
    }
  }
  return false;
}

function displayName(participant) {
  if (!participant) return 'guest';
  return participant.name || participant.identity || 'guest';
}

function initials(value) {
  const clean = (value || '?').trim();
  return clean.slice(0, 2).toUpperCase();
}

function normalizeAvatarUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function telegramAvatarUrl(username) {
  const clean = (username || '').trim().replace(/^@+/, '');
  if (!clean) return '';
  return `https://t.me/i/userpic/320/${encodeURIComponent(clean)}.jpg`;
}

function safeJsonParse(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function participantAvatarProfile(record = {}) {
  const metadata = safeJsonParse(record.metadata);
  const attributes =
    record.attributes && typeof record.attributes === 'object' ? record.attributes : null;
  const username = normalizeAvatarUrl(
    record.username ||
      attributes?.username ||
      attributes?.telegram_username ||
      metadata?.username ||
      metadata?.telegram_username ||
      ''
  );
  const photoUrl = normalizeAvatarUrl(
    record.photo_url ||
      attributes?.photo_url ||
      attributes?.photoUrl ||
      metadata?.photo_url ||
      metadata?.photoUrl ||
      ''
  );
  return { username, photoUrl };
}

function recordAvatar(identity, photoUrl = '', username = '') {
  const key = normalizeAvatarUrl(identity);
  if (!key) return '';
  const explicit = normalizeAvatarUrl(photoUrl);
  if (explicit) {
    if (state.avatarByIdentity[key] !== explicit) {
      state.avatarByIdentity[key] = explicit;
    }
    return explicit;
  }
  const fallback = telegramAvatarUrl(username);
  if (fallback && !state.avatarByIdentity[key]) {
    state.avatarByIdentity[key] = fallback;
  }
  return state.avatarByIdentity[key] || fallback;
}

function avatarUrlForIdentity(identity, username = '') {
  const key = normalizeAvatarUrl(identity);
  if (!key) return telegramAvatarUrl(username);
  const cached = state.avatarByIdentity[key];
  if (cached) return cached;
  const user = findPresenceUserByIdentity(key);
  return user?.photo_url || telegramAvatarUrl(user?.username || username);
}

function renderAvatar(container, photoUrl, label) {
  if (!container) return;
  container.replaceChildren();
  const photo = document.createElement('img');
  photo.className = 'avatar-photo';
  photo.alt = label || 'avatar';
  photo.loading = 'eager';
  photo.decoding = 'async';
  photo.referrerPolicy = 'no-referrer';
  photo.onerror = () => {
    photo.removeAttribute('src');
    photo.hidden = true;
    fallback.hidden = false;
  };
  if (photoUrl) {
    photo.src = photoUrl;
  } else {
    photo.hidden = true;
  }
  const fallback = document.createElement('span');
  fallback.className = 'avatar-fallback';
  fallback.textContent = initials(label);
  if (photoUrl) {
    fallback.hidden = true;
  }
  container.append(photo, fallback);
}

function findPresenceUserByIdentity(identity) {
  if (!identity) return null;
  if (state.user?.identity === identity) return state.user;
  for (const users of Object.values(state.presenceByRoom || {})) {
    const match = (users || []).find((user) => user?.identity === identity);
    if (match) return match;
  }
  return null;
}

function participantAvatarUrl(participant) {
  if (!participant) return '';
  const profile = participantAvatarProfile(participant);
  if (participant.isLocal) {
    return (
      profile.photoUrl ||
      avatarUrlForIdentity(participant.identity, profile.username) ||
      state.user?.photo_url ||
      telegramAvatarUrl(state.user?.username)
    );
  }
  return profile.photoUrl || avatarUrlForIdentity(participant.identity, profile.username);
}

function messageAvatarUrl(message) {
  if (!message) return '';
  return (
    message.photo_url ||
    avatarUrlForIdentity(message.identity, message.username) ||
    telegramAvatarUrl(message.username) ||
    (message.identity === state.identity
      ? state.user?.photo_url || telegramAvatarUrl(state.user?.username)
      : '')
  );
}

function syncKnownAvatars(records = []) {
  for (const record of records) {
    if (!record) continue;
    const profile = participantAvatarProfile(record);
    recordAvatar(
      record.identity,
      profile.photoUrl || record.photo_url,
      profile.username || record.username
    );
  }
}

function refreshChatAvatars(identity = '') {
  const rows = identity
    ? els.chatLog.querySelectorAll(`.message[data-message-identity="${cssEscape(identity)}"]`)
    : els.chatLog.querySelectorAll('.message[data-message-id]');
  for (const row of rows) {
    const messageId = row.dataset.messageId;
    const message = messageId ? state.chatMessagesById.get(messageId) : null;
    if (!message) continue;
    const avatar = row.querySelector('.message-avatar');
    if (avatar) {
      renderAvatar(avatar, messageAvatarUrl(message), message.author || 'Guest');
    }
  }
}

function setLocalDemoDisabled(disabled) {
  state.screenDisabledLocal = Boolean(disabled);
  localStorage.setItem('debilbi:screenDisabledLocal', state.screenDisabledLocal ? '1' : '0');
  renderRoom();
}

function syncRemoteScreenSubscriptions(participants = getParticipants()) {
  if (!state.room) return;
  const shouldSubscribe = !state.screenDisabledLocal;
  for (const participant of participants) {
    if (!participant || participant.isLocal) continue;
    for (const publication of participant.trackPublications.values()) {
      if (publication.source !== Track.Source.ScreenShare) continue;
      if (typeof publication.setSubscribed !== 'function') continue;
      if (publication.isSubscribed === shouldSubscribe) continue;
      try {
        publication.setSubscribed(shouldSubscribe);
      } catch (error) {
        console.warn(error);
      }
    }
  }
}

function collectVisibleScreenShares(participants = getParticipants()) {
  const screens = collectScreenShares(participants);
  if (!state.screenDisabledLocal) return screens;
  return [];
}

function syncTheaterControls() {
  if (!els.fullscreenButton || !els.closeTheaterButton) return;
  const theaterFullscreen = document.fullscreenElement === els.theater;
  els.fullscreenButton.dataset.fullscreen = theaterFullscreen ? 'true' : 'false';
  const fullscreenLabel = theaterFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
  els.fullscreenButton.title = fullscreenLabel;
  els.fullscreenButton.setAttribute('aria-label', fullscreenLabel);
  els.closeTheaterButton.title = 'Close demo';
  els.closeTheaterButton.setAttribute('aria-label', 'Close demo');
}

function iconSvg(name) {
  switch (name) {
    case 'mic':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V8a3 3 0 1 0 -6 0v3a3 3 0 0 0 3 3Z"/>
          <path d="M5 11a7 7 0 0 0 14 0"/>
          <path d="M12 18v3"/>
        </svg>
      `;
    case 'muted':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 9V8a3 3 0 1 1 6 0v3"/>
          <path d="M12 14a3 3 0 0 0 3-3"/>
          <path d="M5 11a7 7 0 0 0 10.5 6"/>
          <path d="M12 18v3"/>
          <path d="M4 4l16 16"/>
        </svg>
      `;
    case 'timer':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="13" r="7"/>
          <path d="M12 6V4"/>
          <path d="M9 13h3l2-2"/>
          <path d="M9.5 3.5h5"/>
        </svg>
      `;
    case 'screen':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="10" rx="2"/>
          <path d="M12 15v4"/>
          <path d="M8 19h8"/>
          <path d="M8 9h8"/>
        </svg>
      `;
    case 'play':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true" style="fill: currentColor; stroke: none;">
          <path d="M8 6l10 6-10 6V6z"/>
        </svg>
      `;
    case 'pause':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true" style="fill: currentColor; stroke: none;">
          <rect x="7" y="6" width="3" height="12" rx="0.75"/>
          <rect x="14" y="6" width="3" height="12" rx="0.75"/>
        </svg>
      `;
    case 'volume':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 10v4h3l4 4V6L8 10H5z"/>
          <path d="M16 9a3 3 0 0 1 0 6"/>
          <path d="M18.5 6.5a6 6 0 0 1 0 11"/>
        </svg>
      `;
    case 'mute':
      return `
        <svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 10v4h3l4 4V6L8 10H5z"/>
          <path d="M15 9l5 6"/>
          <path d="M20 9l-5 6"/>
        </svg>
      `;
    default:
      return '';
  }
}
