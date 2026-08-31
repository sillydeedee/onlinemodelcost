// @ts-check
import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL ?? 'https://onlinemodelcost.com';

// https://astro.build/config
export default defineConfig({
  site,
  output: 'static',
  devToolbar: {
    enabled: false,
  },
});
