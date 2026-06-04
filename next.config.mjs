import path from 'path';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Opcional: desactivar el service worker en dev para evitar problemas de caché al programar
  disable: process.env.NODE_ENV === 'development',
});

const projectRoot = path.resolve(process.cwd());

export default withSerwist({
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
});
