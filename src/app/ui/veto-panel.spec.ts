import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Genre } from '../core/tmdb.models';
import { VetoPanel } from './veto-panel';

const GENRES: Genre[] = [
  { id: 27, name: 'Horror' },
  { id: 37, name: 'Western' },
  { id: 18, name: 'Dramă' },
  { id: 35, name: 'Comedie' },
];

describe('VetoPanel', () => {
  let fixture: ComponentFixture<VetoPanel>;
  let ref: ComponentRef<VetoPanel>;
  let el: HTMLElement;
  const events: string[] = [];

  const button = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  const settle = () => fixture.whenStable();

  beforeEach(async () => {
    events.length = 0;
    fixture = TestBed.createComponent(VetoPanel);
    ref = fixture.componentRef;
    el = fixture.nativeElement;
    ref.setInput('genres', GENRES);
    ref.setInput('vetoed', []);
    ref.setInput('maxPeople', 6);
    fixture.componentInstance.start.subscribe((n) => events.push(`start ${n}`));
    fixture.componentInstance.pick.subscribe((id) => events.push(`pick ${id}`));
    fixture.componentInstance.cancel.subscribe(() => events.push('cancel'));
    fixture.componentInstance.clear.subscribe(() => events.push('clear'));
    await settle();
  });

  it('asks how many people, 2 to 6, then starts with the chosen number', async () => {
    button('Veto de grup').click();
    await settle();
    const options = [...el.querySelectorAll<HTMLInputElement>('.count-option input')];
    expect(options.map((o) => o.parentElement?.textContent?.trim())).toEqual(['2', '3', '4', '5', '6']);
    expect(document.activeElement).toBe(options[0]);
    options[1].click();
    button('Începe vetoul').click();
    expect(events).toEqual(['start 3']);
  });

  it('shows whose turn it is and one button per genre left, named for voice control', async () => {
    ref.setInput('people', 3);
    ref.setInput('turn', 1);
    ref.setInput('genres', GENRES.slice(1));
    ref.setInput('vetoed', GENRES.slice(0, 1));
    await settle();
    expect(el.querySelector('.veto-title')?.textContent?.trim()).toBe('Persoana 2 din 3: ce gen nu vreți diseară?');
    expect(el.querySelector('[role=status]')?.textContent?.trim()).toBe('Horror a ieșit de pe roată.');
    const western = button('Western');
    expect(western.textContent?.replace(/\s+/g, ' ').trim()).toBe('Scoate Western');
    western.click();
    expect(events).toEqual(['pick 37']);
  });

  it('sums up the veto as a Romanian list and can undo it', async () => {
    ref.setInput('vetoed', GENRES.slice(0, 3));
    await settle();
    expect(el.querySelector('.veto-summary')?.textContent?.trim()).toBe('Diseară fără Horror, Western și Dramă.');
    button('Anulează vetoul').click();
    expect(events).toEqual(['clear']);
  });

  it('cannot be started while the wheel is spinning', async () => {
    ref.setInput('locked', true);
    await settle();
    expect(button('Veto de grup').disabled).toBe(true);
  });
});
