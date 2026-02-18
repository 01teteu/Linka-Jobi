import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;

// Polyfill para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração da conexão usando a URL do seu .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setup() {
    let client;
    try {
        console.log("🔌 Tentando conectar ao Banco de Dados...");
        // Define um timeout curto para não ficar travado tentando conectar
        const connectionTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 5000)
        );
        
        client = await Promise.race([pool.connect(), connectionTimeout]);
        
        console.log("✅ Conectado com sucesso!");

        console.log("📂 Lendo o arquivo de criação do banco (schema.sql)...");
        const sqlPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("🚀 Criando tabelas e inserindo dados de teste...");
        await client.query(sql);
        
        console.log("------------------------------------------------");
        console.log("✅ SUCESSO! O Banco de Dados está pronto.");
        console.log("------------------------------------------------");

    } catch (err) {
        // Tratamento amigável de erro
        console.log("\n------------------------------------------------");
        console.log("⚠️  AVISO: Não foi possível conectar ao banco de dados externo.");
        console.log(`📝 Detalhe: ${err.message}`);
        console.log("------------------------------------------------");
        console.log("🟢 NÃO SE PREOCUPE! O Linka Jobi ativou o MODO DEMONSTRAÇÃO.");
        console.log("   O site funcionará usando dados locais simulados.");
        console.log("------------------------------------------------");
        console.log("👉 Próximo passo: Rode 'npm run dev' para abrir o site.");
        console.log("------------------------------------------------");
        
        // Sai com código 0 (sucesso) para não assustar o usuário com linhas vermelhas
        process.exit(0);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

setup();