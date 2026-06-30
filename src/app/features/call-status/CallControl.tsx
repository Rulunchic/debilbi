import {
  Box,
  Icon,
  IconButton,
  Icons,
  IconSrc,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
} from 'folds';
import React, { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { callEmbedAtom } from '../../state/callEmbed';

type ControlButtonProps = {
  enabled: boolean;
  disabled?: boolean;
  tooltip: string;
  enabledVariant: 'Surface' | 'Warning' | 'Success';
  disabledVariant?: 'Surface' | 'Warning' | 'Success';
  icon: IconSrc;
  filled?: boolean;
  size: '300' | '400';
  iconSize: '100' | '200';
  onClick: () => void;
};

function ControlButton({
  enabled,
  disabled,
  tooltip,
  enabledVariant,
  disabledVariant,
  icon,
  filled,
  size,
  iconSize,
  onClick,
}: ControlButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{tooltip}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? enabledVariant : disabledVariant ?? 'Surface'}
          fill="Soft"
          radii="400"
          size={size}
          onClick={onClick}
          outlined
          disabled={disabled}
        >
          <Icon size={iconSize} src={icon} filled={filled ?? enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function CallControl({
  callEmbed,
  compact,
  callJoined,
}: {
  callEmbed: CallEmbed;
  compact: boolean;
  callJoined: boolean;
}) {
  const { microphone, screenshare } = useCallControlState(callEmbed.control);
  const setCallEmbed = useSetAtom(callEmbedAtom);

  const [hangupState, hangup] = useAsyncCallback(
    useCallback(() => callEmbed.hangup(), [callEmbed])
  );
  const exiting =
    hangupState.status === AsyncStatus.Loading || hangupState.status === AsyncStatus.Success;
  const buttonSize = compact ? '300' : '400';
  const iconSize = '100';

  const handleHangup = () => {
    if (!callJoined) {
      setCallEmbed(undefined);
      return;
    }
    hangup();
  };

  return (
    <Box shrink="No" alignItems="Center" gap="200">
      <ControlButton
        enabled={microphone}
        disabled={!callJoined}
        tooltip={microphone ? 'Turn Off Microphone' : 'Turn On Microphone'}
        enabledVariant="Surface"
        disabledVariant="Warning"
        icon={microphone ? Icons.Mic : Icons.MicMute}
        filled={!microphone}
        size={buttonSize}
        iconSize={iconSize}
        onClick={() => callEmbed.control.toggleMicrophone()}
      />
      <ControlButton
        enabled={screenshare}
        disabled={!callJoined}
        tooltip={screenshare ? 'Stop Screenshare' : 'Start Screenshare'}
        enabledVariant="Success"
        disabledVariant="Surface"
        icon={Icons.ScreenShare}
        filled={screenshare}
        size={buttonSize}
        iconSize={iconSize}
        onClick={() => callEmbed.control.toggleScreenshare()}
      />
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
            size={buttonSize}
            onClick={handleHangup}
            disabled={exiting}
            outlined
          >
            {exiting ? (
              <Spinner variant="Critical" fill="Soft" size={iconSize} />
            ) : (
              <Icon size={iconSize} src={Icons.PhoneDown} filled />
            )}
          </IconButton>
        )}
      </TooltipProvider>
    </Box>
  );
}
