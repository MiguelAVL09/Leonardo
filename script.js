// Referencias DOM
const loginScreen = document.getElementById('login-screen');
const appInterface = document.getElementById('app-interface');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const usernameDisplay = document.getElementById('username-display');
const fileInput = document.getElementById('file-input');
const attachBtn = document.getElementById('attach-btn');
const fileNameDisplay = document.getElementById('file-name-display');

// Variable para guardar el archivo seleccionado temporalmente
let currentFile = null;

// --- LÓGICA DE LOGIN ---
function ingresar(tipo) {
    loginScreen.style.opacity = '0';
    setTimeout(() => {
        loginScreen.classList.add('hidden');
        appInterface.classList.remove('hidden');
        if(tipo === 'invitado') usernameDisplay.textContent = "Invitado";
        else usernameDisplay.textContent = "Estudiante";
    }, 500);
}

function logout() {
    appInterface.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.style.opacity = '1';
    chatMessages.innerHTML = '';
    currentFile = null;
    updateFileDisplay();
}

// --- LÓGICA DE ARCHIVOS ---
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            alert("Solo se permiten archivos PDF por ahora.");
            return;
        }
        // Convertir a Base64
        const reader = new FileReader();
        reader.onload = function(event) {
            // Quitamos la parte del encabezado 'data:application/pdf;base64,' para enviar solo los datos
            const base64String = event.target.result.split(',')[1];
            currentFile = {
                mimeType: file.type,
                data: base64String,
                name: file.name
            };
            updateFileDisplay();
        };
        reader.readAsDataURL(file);
    }
});

function updateFileDisplay() {
    if (currentFile) {
        fileNameDisplay.textContent = `📄 Archivo listo: ${currentFile.name}`;
        fileNameDisplay.style.display = 'block';
        attachBtn.style.color = '#2c4c3b'; // Verde para indicar activo
    } else {
        fileNameDisplay.style.display = 'none';
        attachBtn.style.color = ''; // Color normal
        fileInput.value = ''; // Limpiar input
    }
}

// --- LÓGICA DEL CHAT ---
function setPrompt(text) {
    chatInput.value = text + " ";
    chatInput.focus();
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    
    // Validar que haya texto O archivo
    if (!text && !currentFile) return;

    // 1. Mostrar mensaje usuario
    let userMsg = text;
    if (currentFile) userMsg += ` <br><small>[Adjunto: ${currentFile.name}]</small>`;
    addMessage(userMsg, 'user');
    
    chatInput.value = '';
    const fileToSend = currentFile; // Copia para enviar
    currentFile = null; // Limpiar archivo seleccionado
    updateFileDisplay();

    // 2. Mostrar "Escribiendo..."
    const loadingId = addMessage("Analizando documentos...", 'bot', true);

    try {
        // 3. Petición al backend
        const response = await fetch('https://buho-academico.onrender.com/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                file: fileToSend // Enviamos el archivo si existe
            }),
        });

        const data = await response.json();
        removeMessage(loadingId);
        const formattedReply = formatResponse(data.reply);
        addMessage(formattedReply, 'bot');

    } catch (error) {
        removeMessage(loadingId);
        addMessage("Error: No pude leer el documento. (Verifica que no pese más de 10MB)", 'bot');
    }
});

function addMessage(text, sender, isLoading = false) {
    const div = document.createElement('div');
    div.classList.add('message', `${sender}-message`);
    const msgId = Date.now();
    div.id = msgId;
    if (isLoading) {
        div.innerHTML = `<i>${text}</i> ⏳`;
        div.style.opacity = "0.7";
    } else {
        div.innerHTML = `<div class="msg-content">${text}</div>`;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgId;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatResponse(text) {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/- (.*?)<br>/g, '<li>$1</li>');
    return formatted;
}