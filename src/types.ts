export interface Song {
  num: number;
  ytid: string;
  title: string;
  artist: string;
  movie?: string;
  year?: string;
  start?: number;
  end?: number;
}

export interface TicketData {
  serial: string;
  from: string;
  to: string;
  fare: number;
  duration: string;
  seat: string;
  savedAt: number;
}

export interface RouteOption {
  from: string;
  to: string;
  fare: number;
}

export type WeatherType = 'clear' | 'rain' | 'fog';

export namespace YT {
  export enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  export interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    playsinline?: 0 | 1;
    origin?: string;
  }

  export interface OnStateChangeEvent {
    data: PlayerState;
  }

  export interface PlayerOptions {
    height?: string;
    width?: string;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: (event: unknown) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: unknown) => void;
      onAutoplayBlocked?: () => void;
    };
  }

  export interface Player {
    loadVideoById(args: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): PlayerState;
  }

  export interface PlayerConstructor {
    new (elementId: string, options: PlayerOptions): Player;
  }
}

declare global {
  interface Window {
    YT: {
      Player: YT.PlayerConstructor;
      PlayerState: typeof YT.PlayerState;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
