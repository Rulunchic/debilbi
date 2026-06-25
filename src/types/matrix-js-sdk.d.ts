import type { InCinnySpacesContent } from '../app/hooks/useSidebarItems';
import type { EmoteRoomsContent, PackContent } from '../app/plugins/custom-emoji';
import type { IRecentEmojiContent } from '../app/plugins/recent-emoji';

declare module 'matrix-js-sdk/lib/@types/event' {
  interface StateEvents {
    [eventType: string]: object;
    'im.ponies.room_emotes': PackContent;
    'in.cinny.room.power_level_tags': object;
  }

  interface AccountDataEvents {
    [eventType: string]: object;
    'in.cinny.spaces': InCinnySpacesContent;
    'io.element.recent_emoji': IRecentEmojiContent;
    'im.ponies.user_emotes': PackContent;
    'im.ponies.emote_rooms': EmoteRoomsContent;
  }

  interface RoomAccountDataEvents {
    [eventType: string]: object;
  }
}

declare module 'matrix-js-sdk/lib/@types/event.ts' {
  interface StateEvents {
    [eventType: string]: object;
    'im.ponies.room_emotes': PackContent;
    'in.cinny.room.power_level_tags': object;
  }

  interface AccountDataEvents {
    [eventType: string]: object;
    'in.cinny.spaces': InCinnySpacesContent;
    'io.element.recent_emoji': IRecentEmojiContent;
    'im.ponies.user_emotes': PackContent;
    'im.ponies.emote_rooms': EmoteRoomsContent;
  }

  interface RoomAccountDataEvents {
    [eventType: string]: object;
  }
}
