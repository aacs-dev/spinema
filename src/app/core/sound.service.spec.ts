import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
import { SoundService } from './sound.service';

class FakeAudioContext {
  static last: FakeAudioContext | null = null;
  state: string = 'suspended';
  readonly resume = vi.fn(async () => {
    this.state = 'running';
  });
  constructor() {
    FakeAudioContext.last = this;
  }
}

describe('SoundService', () => {
  beforeEach(() => {
    localStorage.clear();
    FakeAudioContext.last = null;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stays silent, and creates no audio context, while sound is off', () => {
    TestBed.inject(SoundService).prime();
    expect(FakeAudioContext.last).toBeNull();
  });

  it('resumes a context Safari reports as interrupted', () => {
    TestBed.inject(SettingsService).update({ sound: true });
    const sound = TestBed.inject(SoundService);
    sound.prime();
    const context = FakeAudioContext.last!;
    expect(context.resume).toHaveBeenCalledTimes(1);

    context.state = 'interrupted';
    sound.prime();
    expect(context.resume).toHaveBeenCalledTimes(2);

    context.state = 'running';
    sound.prime();
    expect(context.resume).toHaveBeenCalledTimes(2);
  });
});
