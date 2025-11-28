// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({limit: '50mb'}));
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Usamos el modelo flash si quieres más velocidad, o pro para más razonamiento
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); 

const generationConfig = {
  temperature: 0.3, // Temperatura baja para ser más preciso y académico
  topK: 1,
  topP: 1,
};

// Instrucción del sistema enfocada en NLP académico e Historia
const systemInstruction = `
Eres "El Escriba", un asistente de redacción académica experto en Historia de México.
Tu objetivo es ayudar a estudiantes a mejorar sus textos.

Tus capacidades son:
1. **Mejorar Coherencia:** Reescribir párrafos confusos para que fluyan mejor.
2. **Corrección Gramática:** Arreglar ortografía, puntuación y sintaxis.
3. **Resumir:** Crear síntesis precisas del texto proporcionado.
4. **Ideas Principales:** Extraer los puntos clave en lista.
5. **Estructura:** Sugerir cómo organizar mejor el ensayo o reporte.

REGLAS DE COMPORTAMIENTO:
- Tu tono debe ser formal, académico y alentador.
- Si el texto del alumno trata sobre Historia de México, puedes aportar contexto adicional breve si es pertinente.
- Si te piden corregir, muestra primero la versión corregida y luego explica brevemente los cambios importantes.
- Estructura tus respuestas usando Markdown (negritas, listas) para facilitar la lectura.
`;

app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body.message;
    const fileData = req.body.file; // Aquí recibiremos el PDF

    if (!userInput && !fileData) {
      return res.status(400).json({ reply: "Por favor, envía un texto o un archivo." });
    }

    // Preparamos el mensaje para Gemini (Texto + Archivo si existe)
    const parts = [];

    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData.data, // El código base64 del PDF
          mimeType: fileData.mimeType
        }
      });
      // Si sube un archivo pero no dice nada, agregamos una instrucción por defecto
      if (!userInput) parts.push({ text: "Analiza este documento y genera un resumen." });
    }

    if (userInput) {
      parts.push({ text: userInput });
    }

    const chat = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [{ text: systemInstruction }],
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Soy El Escriba. Puedo leer tus PDFs si los adjuntas." }],
        },
      ],
    });

    const result = await chat.sendMessage(parts);
    const response = await result.response;
    res.json({ reply: response.text() });

  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({ reply: "Hubo un error al procesar tu solicitud (quizás el archivo es muy pesado)." });
  }
});

app.listen(port, () => {
  console.log(`Búho Académico escuchando en http://localhost:${port}`);
});