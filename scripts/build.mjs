process.env.DEBILBI_DISABLE_PWA = '1';

const { build } = await import('vite');
const { default: config } = await import('../vite.config.js');

await build({
  ...config,
  build: {
    ...config.build,
    sourcemap: false,
  },
  configFile: false,
});
