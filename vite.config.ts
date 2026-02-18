import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo atual (development/production)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Define variáveis globais para substituir no código cliente
    define: {
      // Mapeia a variável do .env (VITE_GOOGLE_API_KEY) para process.env.API_KEY
      // isso satisfaz a regra estrita do SDK do Google GenAI
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY),
    },
    server: {
      proxy: {
        // Redireciona chamadas /api para o backend em Node.js rodando na porta 3000
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});