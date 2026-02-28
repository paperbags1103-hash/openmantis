import { SIGNAL_COOLDOWNS } from '../config/throttle.js';

export class SignalThrottle {
  private readonly lastFiredAt = new Map<string, number>();

  shouldAllow(signalType: string): boolean {
    const cooldownMs = SIGNAL_COOLDOWNS[signalType] ?? 0;
    if (cooldownMs <= 0) {
      return true;
    }

    const lastFiredAt = this.lastFiredAt.get(signalType);
    if (!lastFiredAt) {
      return true;
    }

    return Date.now() - lastFiredAt >= cooldownMs;
  }

  record(signalType: string): void {
    this.lastFiredAt.set(signalType, Date.now());
  }

  isQuietHours(quietStart: number, quietEnd: number): boolean {
    const currentHour = new Date().getHours();

    if (quietStart === quietEnd) {
      return false;
    }

    if (quietStart < quietEnd) {
      return currentHour >= quietStart && currentHour < quietEnd;
    }

    return currentHour >= quietStart || currentHour < quietEnd;
  }
}
