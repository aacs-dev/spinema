import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppStatus } from './app-status.service';

describe('AppStatus', () => {
  const versionUpdates = new Subject<VersionEvent>();
  const activateUpdate = vi.fn(async () => true);

  beforeEach(() => {
    activateUpdate.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: SwUpdate, useValue: { isEnabled: true, versionUpdates, activateUpdate } }],
    });
  });

  it('follows the browser going offline and back online', () => {
    const status = TestBed.inject(AppStatus);
    window.dispatchEvent(new Event('offline'));
    expect(status.online()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(status.online()).toBe(true);
  });

  it('offers a reload only once a new version is fully downloaded', () => {
    const status = TestBed.inject(AppStatus);
    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(status.updateReady()).toBe(false);
    versionUpdates.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    expect(status.updateReady()).toBe(true);
  });
});
