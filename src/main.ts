import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { captureEarlyInstallPrompt } from './app/core/install-prompt';
import { STRINGS, loadDictionary, startupLanguage } from './app/i18n/strings';

// Before anything is awaited: the browser's install offer may arrive while the texts still load.
captureEarlyInstallPrompt(window);

// Romanian resolves at once; English and Hungarian load their small chunk first.
loadDictionary(startupLanguage(navigator.languages))
  .then((dictionary) =>
    bootstrapApplication(App, { ...appConfig, providers: [...appConfig.providers, { provide: STRINGS, useValue: dictionary }] }),
  )
  .catch((err) => console.error(err));
