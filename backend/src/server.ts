import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

app.listen(config.app.port, () => {
  console.log(`Snapshots API running on port ${config.app.port}`);
});
