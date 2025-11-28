// ==========================================
// 🦅 SERVER.JS - EL ESCRIBA (BACKEND FINAL)
// ==========================================

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg'); // Cliente para PostgreSQL (Neon)
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

// 1. Configuración Inicial del Servidor
const app = express();
const port = process.env.PORT || 3000;

// Aumentamos el límite a 50MB para recibir PDFs grandes sin error
app.use(express.json({ limit: '50mb' }));
app.use(cors());


// 2. Configuración de la Base de Datos (PostgreSQL en Neon)
// La variable DATABASE_URL la pondrás en el panel de Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para que Render acepte el certificado de Neon
    }
});

// Prueba de conexión y Creación de Tabla de Usuarios
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error fatal al conectar con la Base de Datos:', err.stack);
    }
    console.log('✅ Conexión exitosa a PostgreSQL (Neon Tech).');
    
    // Crear tabla 'users' si no existe (automáticamente)
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    client.query(createTableQuery, (err, res) => {
        release(); // Liberar el cliente al pool
        if (err) console.error("Error al crear tabla de usuarios:", err);
        else console.log("📦 Tabla de usuarios verificada y lista.");
    });
});


// 3. Configuración de Inteligencia Artificial (Google Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Usamos 'flash' por ser rápido y eficiente para lecturas largas
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generationConfig = {
    temperature: 0.3, // Creatividad baja para ser más preciso académicamente
    topK: 1,
    topP: 1,
};

const systemInstruction = `
Eres "El Escriba", un asistente de redacción académica experto en Historia de México y análisis de textos.
Tu objetivo es ayudar a estudiantes a mejorar sus redacciones, ortografía y comprensión lectora.

Tus capacidades:
- Si recibes un archivo PDF, analízalo a fondo y responde lo que pida el usuario (resumen, ideas principales, etc.).
- Si recibes solo texto, corrige gramática o mejora la coherencia según se pida.
- Mantén un tono formal, educativo y alentador.
`;


// ==========================================
// 🔐 RUTAS DE AUTENTICACIÓN (Login/Registro)
// ==========================================

// RUTA 1: REGISTRO DE USUARIO
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Por favor ingresa usuario y contraseña." });
    }

    try {
        // Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Guardar en PostgreSQL
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );
        
        res.json({ message: "Usuario registrado con éxito", userId: result.rows[0].id });

    } catch (e) {
        // Código de error '23505' en Postgres significa "Violación de unicidad" (usuario repetido)
        if (e.code === '23505') {
            return res.status(400).json({ error: "El nombre de usuario ya existe. Elige otro." });
        }
        console.error("Error en registro:", e);
        res.status(500).json({ error: "Error interno del servidor al registrar." });
    }
});

// RUTA 2: INICIO DE SESIÓN
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Buscar usuario en la BD
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: "Usuario no encontrado." });
        }

        // Comparar contraseña encriptada
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
            res.json({ message: "Login correcto", username: user.username });
        } else {
            res.status(400).json({ error: "Contraseña incorrecta." });
        }

    } catch (e) {
        console.error("Error en login:", e);
        res.status(500).json({ error: "Error interno del servidor al iniciar sesión." });
    }
});


// ==========================================
// 🤖 RUTA DEL CHATBOT (Con lectura de Archivos)
// ==========================================

app.post('/chat', async (req, res) => {
    try {
        // Recibimos texto y archivo (si existe) del frontend
        const { message: userInput, file: fileData } = req.body;

        if (!userInput && !fileData) {
            return res.status(400).json({ reply: "Por favor envía un texto o adjunta un archivo." });
        }

        // Preparamos el contenido para Gemini
        const parts = [];
        
        if (fileData) {
            // Si hay archivo, lo adjuntamos como "inlineData"
            parts.push({
                inlineData: {
                    data: fileData.data,       // El código Base64 del PDF
                    mimeType: fileData.mimeType
                }
            });
            // Si el usuario envió archivo pero no escribió nada, agregamos instrucción por defecto
            if (!userInput) {
                parts.push({ text: "Analiza este documento y genera un resumen con las ideas principales." });
            }
        }
        
        if (userInput) {
            parts.push({ text: userInput });
        }

        // Iniciamos el chat
        const chat = model.startChat({
            generationConfig,
            history: [
                { role: "user", parts: [{ text: systemInstruction }] },
                { role: "model", parts: [{ text: "Entendido. Soy El Escriba, listo para analizar textos y documentos." }] },
            ],
        });

        // Enviamos el mensaje a la IA
        const result = await chat.sendMessage(parts);
        const response = await result.response;
        
        // Respondemos al frontend
        res.json({ reply: response.text() });

    } catch (error) {
        console.error("Error en la API de IA:", error);
        res.status(500).json({ 
            reply: "Hubo un error al procesar tu solicitud. Si enviaste un archivo, asegúrate de que sea un PDF legible." 
        });
    }
});

// 4. Iniciar el Servidor
app.listen(port, () => {
    console.log(`🚀 Búho Académico escuchando en el puerto ${port}`);
});