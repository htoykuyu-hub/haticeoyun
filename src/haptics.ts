// Android Haptic Vibration Engine

class HapticsManager {
  public enabled: boolean = true;

  public vibrate(pattern: number | number[]) {
    if (!this.enabled) return;
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently ignore if not supported or blocked by browser permissions
      }
    }
  }

  // Common Android game haptics
  public jump() {
    this.vibrate(28);
  }

  public buttonPress() {
    this.vibrate(18);
  }

  public correct() {
    this.vibrate([40, 30, 80]);
  }

  public wrong() {
    this.vibrate([140]);
  }

  public lifeLost() {
    this.vibrate([180, 80, 180]);
  }

  public costumeEquip() {
    this.vibrate([40, 40, 60, 40, 80]);
  }

  public levelClear() {
    this.vibrate([80, 50, 80, 50, 160]);
  }

  public victory() {
    this.vibrate([70, 40, 70, 40, 70, 40, 250]);
  }

  public toggle(enable?: boolean) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    if (this.enabled) {
      this.vibrate(40);
    }
    return this.enabled;
  }
}

export const haptics = new HapticsManager();
