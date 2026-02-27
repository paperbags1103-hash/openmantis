export interface WatcherStatus {
  running: boolean;
  lastCheck: string | null;
  errorCount: number;
}

export interface Watcher {
  name: string;
  start(): Promise<void>;
  stop(): void;
  status(): WatcherStatus;
}
