// setupFiles roda antes dos imports de cada arquivo de teste — garante que
// `database.ts` e os controllers vejam o ambiente correto já na inicialização.
import { configurarEnvDeTeste } from './helpers/envDeTeste.js';

configurarEnvDeTeste();
