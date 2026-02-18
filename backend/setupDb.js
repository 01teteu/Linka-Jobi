
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
    try {
        console.log("🔌 Conectando ao Supabase...");
        const client = await pool.connect();
        console.log("✅ Conectado com sucesso!");

        console.log("📂 Lendo o arquivo de criação do banco (schema.sql)...");
        const sqlPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("🚀 Criando tabelas e inserindo dados de teste...");
        // Executa o SQL completo
        await client.query(sql);
        
        console.log("------------------------------------------------");
        console.log("✅ SUCESSO! O Banco de Dados está pronto.");
        console.log("------------------------------------------------");
        console.log("Usuários criados para teste:");
        console.log("1. Cliente: jane@linka.com (Senha: 123456)");
        console.log("2. Profissional: joao@linka.com (Senha: 123456)");
        console.log("------------------------------------------------");

        client.release();
    } catch (err) {
        console.error("❌ Erro ao configurar banco:", err.message);
        console.log("Dica: Verifique se a senha no arquivo .env está correta.");
    } finally {
        await pool.end();
    }
}

setup();
