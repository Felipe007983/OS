import { app } from './app.js';
import { ENV } from './config/env.js';

// Em produção na Vercel, o app é exportado via api/index.ts (serverless).
// O listen só roda em desenvolvimento local.
if (!process.env.VERCEL) {
  const PORT = ENV.PORT;

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    console.log(`📡 URL da API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
}
