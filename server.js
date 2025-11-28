// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de límites y seguridad
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- CONFIGURACIÓN BASE DE DATOS (SQLite) ---
// Se crea un archivo 'users.db' localmente
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) console.error("Error al abrir DB:", err.message);
    else {
        console.log("📦 Base de datos conectada.");
        // Crear tabla de usuarios si no existe
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);
    }
});

// --- CONFIGURACIÓN GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generationConfig = {
    temperature: 0.3,
    topK: 1,
    topP: 1,
};

const systemInstruction = `
Eres "El Escriba", un asistente de redacción académica experto en Historia de México.
Tu objetivo es ayudar a estudiantes a mejorar sus textos.
Reglas: Formal, académico, útil. Si te envían un archivo, analízalo.
`;

// --- RUTAS DE AUTENTICACIÓN ---

// 1. REGISTRO
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan datos" });

    try {
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, 
            [username, hashedPassword], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "El usuario ya existe" });
                    return res.status(500).json({ error: "Error en base de datos" });
                }
                res.json({ message: "Usuario creado exitosamente", userId: this.lastID });
            }
        );
    } catch (e) {
        res.status(500).json({ error: "Error interno" });
    }
});

// 2. LOGIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

        // Comparar contraseña
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ message: "Login exitoso", username: user.username });
        } else {
            res.status(400).json({ error: "Contraseña incorrecta" });
        }
    });
});

// --- RUTA DEL CHAT (Tu código existente) ---
app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body.message;
        const fileData = req.body.file;

        if (!userInput && !fileData) return res.status(400).json({ reply: "Envía texto o archivo." });

        const parts = [];
        if (fileData) {
            parts.push({
                inlineData: { data: fileData.data, mimeType: fileData.mimeType }
            });
            if (!userInput) parts.push({ text: "Analiza este documento." });
        }
        if (userInput) parts.push({ text: userInput });

        const chat = model.startChat({
            generationConfig,
            history: [
                { role: "user", parts: [{ text: systemInstruction }] },
                { role: "model", parts: [{ text: "Entendido. Soy El Escriba." }] },
            ],
        });

        const result = await chat.sendMessage(parts);
        const response = await result.response;
        res.json({ reply: response.text() });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ reply: "Error en el servidor académico." });
    }
});

app.listen(port, () => {
    console.log(`Búho Académico escuchando en puerto ${port}`);
});