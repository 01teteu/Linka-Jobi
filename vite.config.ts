
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
      // API Key removida por segurança. O Frontend não deve ter acesso a ela.
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
