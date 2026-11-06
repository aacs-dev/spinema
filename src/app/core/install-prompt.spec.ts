import { TestBed } from '@angular/core/testing';
import { InstallPrompt, isAppleMobile } from './install-prompt';

/** A stand-in for Chromium's beforeinstallprompt event, answering with the given choice. */
function installEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn(async () => undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('InstallPrompt', () => {
  it('has nothing to offer until the browser says the app can be installed', () => {
    expect(TestBed.inject(InstallPrompt).mode()).toBe('unavailable');
  });

  it('keeps the browser offer, opens it on request, and counts an accepted one as installed', async () => {
    const install = TestBed.inject(InstallPrompt);
    const event = installEvent('accepted');
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(install.mode()).toBe('prompt');

    expect(await install.install()).toBe(true);
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(install.mode()).toBe('installed');
  });

  it('uses an offer only once: after "not now" in the browser dialog it is gone', async () => {
    const install = TestBed.inject(InstallPrompt);
    window.dispatchEvent(installEvent('dismissed'));
    expect(await install.install()).toBe(false);
    expect(install.mode()).toBe('unavailable');
    expect(await install.install()).toBe(false);
  });

  it('notices an install made from the browser menu', () => {
    const install = TestBed.inject(InstallPrompt);
    window.dispatchEvent(installEvent('accepted'));
    window.dispatchEvent(new Event('appinstalled'));
    expect(install.mode()).toBe('installed');
  });
});

describe('isAppleMobile', () => {
  const nav = (userAgent: string, platform = '', maxTouchPoints = 0) => ({ userAgent, platform, maxTouchPoints }) as Navigator;

  it('recognises iPhone and iPad, including iPadOS posing as a Mac', () => {
    expect(isAppleMobile(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'))).toBe(true);
    expect(isAppleMobile(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5))).toBe(true);
  });

  it('leaves out Macs, Android and Windows', () => {
    expect(isAppleMobile(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0))).toBe(false);
    expect(isAppleMobile(nav('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 'Linux armv8l', 5))).toBe(false);
    expect(isAppleMobile(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0))).toBe(false);
  });
});
