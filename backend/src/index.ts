import { createApp } from './app';
import { config } from './config';
import { migrate } from './db';

migrate()
  .then(() => {
    createApp().listen(config.port, () => {
      console.log(`Smart Study Assistant API sur http://localhost:${config.port}`);
      if (!config.anthropicKey) console.warn('⚠ ANTHROPIC_API_KEY manquante : les fonctions IA renverront une erreur 503.');
    });
  })
  .catch((e) => {
    console.error('Impossible de se connecter à PostgreSQL / migrer le schéma :', e.message);
    process.exit(1);
  });
