import React, { MouseEventHandler, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Button,
  color,
  config,
  Icon,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  toRem,
} from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCardStyle } from '../styles.css';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useAudioOutputDevices } from '../../../hooks/media';
import { stopPropagation } from '../../../utils/keyboard';

const getDeviceLabel = (deviceId: string | undefined, label: string, index: number) => {
  if (!deviceId) return 'System default';
  if (label.trim().length > 0) return label;
  return `Output ${index + 1}`;
};

export function AudioOutput() {
  const [preferredAudioOutputDeviceId, setPreferredAudioOutputDeviceId] = useSetting(
    settingsAtom,
    'preferredAudioOutputDeviceId'
  );
  const { devices, refresh, supported } = useAudioOutputDevices();
  const [menuCords, setMenuCords] = useState<RectCords>();

  const selectedIndex = useMemo(
    () => devices.findIndex((device) => device.deviceId === preferredAudioOutputDeviceId),
    [devices, preferredAudioOutputDeviceId]
  );
  const selectedDevice = selectedIndex >= 0 ? devices[selectedIndex] : undefined;
  const savedDeviceUnavailable = !!preferredAudioOutputDeviceId && !selectedDevice;
  const selectedLabel = savedDeviceUnavailable
    ? 'Saved output unavailable'
    : getDeviceLabel(
        selectedDevice?.deviceId,
        selectedDevice?.label ?? '',
        selectedIndex >= 0 ? selectedIndex : 0
      );

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    void refresh();
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (deviceId?: string) => {
    setPreferredAudioOutputDeviceId(deviceId);
    setMenuCords(undefined);
  };

  const description = !supported ? (
    <Text as="span" style={{ color: color.Critical.Main }} size="T200">
      This browser cannot reroute media to a separate output device. The desktop build is the
      reliable path for Discord-style audio separation.
    </Text>
  ) : savedDeviceUnavailable ? (
    <Text as="span" style={{ color: color.Warning.Main }} size="T200">
      The saved output device is unavailable right now. Audio will fall back to the system output
      until you pick another device.
    </Text>
  ) : preferredAudioOutputDeviceId ? (
    <Text as="span" size="T200">
      Call audio and playback sounds will use {selectedLabel}.
    </Text>
  ) : (
    <Text as="span" size="T200">
      Call audio and playback sounds use the system default output. Pick headphones or another
      sink if you are sharing your screen.
    </Text>
  );

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Audio</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Audio Output"
          description={description}
          after={
            <Button
              size="300"
              variant="Secondary"
              outlined
              fill="Soft"
              radii="300"
              style={{ maxWidth: toRem(240) }}
              after={<Icon size="300" src={Icons.ChevronBottom} />}
              before={<Icon size="200" src={Icons.Headphone} />}
              onClick={supported ? handleMenu : undefined}
              disabled={!supported}
            >
              <Text size="T300" truncate>
                {selectedLabel}
              </Text>
            </Button>
          }
        />
      </SequenceCard>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
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
                <MenuItem
                  size="300"
                  variant={!preferredAudioOutputDeviceId ? 'Primary' : 'Surface'}
                  radii="300"
                  onClick={() => handleSelect(undefined)}
                >
                  <Text size="T300">System default</Text>
                </MenuItem>
                {devices.length === 0 && (
                  <MenuItem size="300" variant="Surface" radii="300" disabled>
                    <Text size="T300">No output devices detected</Text>
                  </MenuItem>
                )}
                {devices.map((device, index) => {
                  const isSelected = preferredAudioOutputDeviceId === device.deviceId;
                  return (
                    <MenuItem
                      key={device.deviceId}
                      size="300"
                      variant={isSelected ? 'Primary' : 'Surface'}
                      radii="300"
                      onClick={() => handleSelect(device.deviceId)}
                    >
                      <Text size="T300">{getDeviceLabel(device.deviceId, device.label, index)}</Text>
                    </MenuItem>
                  );
                })}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </Box>
  );
}
