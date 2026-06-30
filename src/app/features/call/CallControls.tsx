import React, { MouseEventHandler, useCallback, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  config,
} from 'folds';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import * as css from './styles.css';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { stopPropagation } from '../../utils/keyboard';

type CallControlsProps = {
  callEmbed: CallEmbed;
};

type ScreenShareQuality = {
  value: string;
  label: string;
};

const SCREEN_SHARE_QUALITIES: ScreenShareQuality[] = [
  { value: 'smooth720', label: 'Smooth 720p60' },
  { value: 'smooth1080', label: 'Smooth 1080p60' },
  { value: 'balanced1080', label: 'Balanced 1080p30' },
  { value: 'sharp1440', label: 'Sharp 1440p30' },
  { value: 'stable1440', label: 'Stable 1440p60' },
  { value: 'sharp4k', label: 'Sharp 4K30' },
];

function MicrophoneButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Turn Off Microphone' : 'Turn On Microphone'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Surface' : 'Warning'}
          fill="Soft"
          radii="400"
          size="300"
          onClick={onToggle}
          outlined
        >
          <Icon size="200" src={enabled ? Icons.Mic : Icons.MicMute} filled={!enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

function ScreenShareButton({
  enabled,
  selectedQuality,
  onStart,
  onStop,
}: {
  enabled: boolean;
  selectedQuality: ScreenShareQuality['value'];
  onStart: (quality: ScreenShareQuality['value']) => void;
  onStop: () => void;
}) {
  const [menuCords, setMenuCords] = useState<RectCords>();

  const selectedLabel =
    SCREEN_SHARE_QUALITIES.find((quality) => quality.value === selectedQuality)?.label ??
    SCREEN_SHARE_QUALITIES[0].label;

  const handleButtonClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    if (enabled) {
      onStop();
      return;
    }

    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (quality: ScreenShareQuality['value']) => {
    onStart(quality);
    setMenuCords(undefined);
  };

  return (
    <>
      <TooltipProvider
        position="Top"
        delay={500}
        tooltip={
          <Tooltip>
            <Text size="T200">
              {enabled ? 'Stop Screenshare' : `Start Screenshare · ${selectedLabel}`}
            </Text>
          </Tooltip>
        }
      >
        {(anchorRef) => (
          <IconButton
            ref={anchorRef}
            variant={enabled ? 'Success' : 'Surface'}
            fill="Soft"
            radii="400"
            size="300"
            onClick={handleButtonClick}
            outlined
          >
            <Icon size="200" src={Icons.ScreenShare} filled={enabled} />
          </IconButton>
        )}
      </TooltipProvider>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Top"
        align="Start"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <Text size="T200" style={{ paddingInline: config.space.S100 }}>
                  Screen share quality
                </Text>
                {SCREEN_SHARE_QUALITIES.map((quality) => {
                  const selected = selectedQuality === quality.value;
                  return (
                    <MenuItem
                      key={quality.value}
                      size="300"
                      variant={selected ? 'Primary' : 'Surface'}
                      radii="300"
                      onClick={() => handleSelect(quality.value)}
                    >
                      <Text size="T300">{quality.label}</Text>
                    </MenuItem>
                  );
                })}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

function HangupButton({ exiting, onLeave }: { exiting: boolean; onLeave: () => void }) {
  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">Leave Voice Chat</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant="Critical"
          fill="Soft"
          radii="400"
          size="300"
          onClick={onLeave}
          disabled={exiting}
          outlined
        >
          {exiting ? (
            <Spinner variant="Critical" fill="Soft" size="200" />
          ) : (
            <Icon size="200" src={Icons.PhoneDown} filled />
          )}
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function CallControls({ callEmbed }: CallControlsProps) {
  const { microphone, screenshare } = useCallControlState(callEmbed.control);
  const [hangupState, hangup] = useAsyncCallback(
    useCallback(() => callEmbed.hangup(), [callEmbed])
  );
  const [selectedQuality, setSelectedQuality] = useState<ScreenShareQuality['value']>(
    SCREEN_SHARE_QUALITIES[0].value
  );

  const exiting =
    hangupState.status === AsyncStatus.Loading || hangupState.status === AsyncStatus.Success;

  const handleStartScreenshare = useCallback(
    (quality: ScreenShareQuality['value']) => {
      setSelectedQuality(quality);
      callEmbed.control.startScreenshare(quality);
    },
    [callEmbed]
  );

  return (
    <Box
      className={css.CallControlOverlay}
      shrink="No"
      alignItems="Center"
      gap="200"
      style={{
        padding: config.space.S200,
        borderRadius: config.radii.R500,
      }}
    >
      <Box
        className={ContainerColor({ variant: 'Surface' })}
        alignItems="Center"
        gap="100"
        style={{
          padding: config.space.S100,
          borderRadius: config.radii.R500,
        }}
      >
        <MicrophoneButton
          enabled={microphone}
          onToggle={() => callEmbed.control.toggleMicrophone()}
        />
        <ScreenShareButton
          enabled={screenshare}
          selectedQuality={selectedQuality}
          onStart={handleStartScreenshare}
          onStop={() => callEmbed.control.toggleScreenshare()}
        />
        <HangupButton exiting={exiting} onLeave={hangup} />
      </Box>
    </Box>
  );
}
