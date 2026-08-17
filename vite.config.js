import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: 'index.html',
        about: 'pages/about.html',
        portfolio: 'pages/portfolio.html',
        contact: 'pages/contact.html'
      }
    }
  }
});
