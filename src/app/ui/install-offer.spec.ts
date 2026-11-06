import { TestBed } from '@angular/core/testing';
import { InstallMode } from '../core/install-prompt';
import { InstallOffer } from './install-offer';

async function mount(mode: InstallMode, dismissible = false) {
  const fixture = TestBed.createComponent(InstallOffer);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('dismissible', dismissible);
  const events: string[] = [];
  fixture.componentInstance.install.subscribe(() => events.push('install'));
  fixture.componentInstance.dismiss.subscribe(() => events.push('dismiss'));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const text = () => el.textContent?.replace(/\s+/g, ' ').trim();
  const button = (label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  return { events, text, button };
}

describe('InstallOffer', () => {
  it('offers the browser install, and "not now" where it can be closed', async () => {
    const { events, text, button } = await mount('prompt', true);
    expect(text()).toContain('Pune Spinema pe ecranul telefonului');
    button('Instalează')!.click();
    button('Nu acum')!.click();
    expect(events).toEqual(['install', 'dismiss']);
  });

  it('gives the share-menu steps on iPhone, with the share icon', async () => {
    const { text, button } = await mount('ios', true);
    expect(text()).toBe('Pune Spinema pe ecranul telefonului: în Safari, apasă Partajează, apoi „Adaugă pe ecranul principal”. Am înțeles');
    expect(button('Am înțeles')).toBeTruthy();
  });

  it('in settings it cannot be closed, and says when the app is already installed', async () => {
    expect((await mount('prompt')).button('Nu acum')).toBeUndefined();
    TestBed.resetTestingModule();
    expect((await mount('installed')).text()).toBe('Spinema e instalată pe acest dispozitiv.');
  });
});
