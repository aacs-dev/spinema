import { TestBed } from '@angular/core/testing';
import { InstallPrompt, captureEarlyInstallPrompt } from './install-prompt';

// Its own file: the early capture is module state, and every test file gets a fresh module.
describe('captureEarlyInstallPrompt', () => {
  it('keeps an offer that arrives before the app has started, and hands it to the app', async () => {
    captureEarlyInstallPrompt(window);
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = vi.fn(async () => undefined);
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    // Created only now, as Angular would be after the texts have loaded.
    const install = TestBed.inject(InstallPrompt);
    expect(install.mode()).toBe('prompt');
    expect(await install.install()).toBe(true);
    expect(event.prompt).toHaveBeenCalled();
  });
});
