import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { STRINGS, loadDictionary, startupLanguage } from './app/i18n/strings';

// Romanian resolves at once; English and Hungarian load their small chunk first.
loadDictionary(startupLanguage(navigator.languages))
  .then((dictionary) =>
    bootstrapApplication(App, { ...appConfig, providers: [...appConfig.providers, { provide: STRINGS, useValue: dictionary }] }),
  )
  .catch((err) => console.error(err));
