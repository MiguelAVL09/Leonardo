// Referencias DOM
const loginScreen = document.getElementById('login-screen');
const appInterface = document.getElementById('app-interface');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const usernameDisplay = document.getElementById('username-display');

// --- LÓGICA DE LOGIN ---
function ingresar(tipo) {
    // Simulación de transición
    loginScreen.style.opacity = '0';
    setTimeout(() => {
        loginScreen.classList.add('hidden');
        appInterface.classList.remove('hidden');
        
        // Personalizar nombre
        if(tipo === 'invitado') {
            usernameDisplay.textContent = "Invitado";
        } else {
            usernameDisplay.textContent = "Estudiante"; // Aquí iría el nombre real en un futuro
        }
    }, 500);
}

function logout() {
    appInterface.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.style.opacity = '1';
    chatMessages.innerHTML = ''; // Limpiar chat al salir
}

// --- LÓGICA DEL CHAT ---

// Función para botones rápidos de la barra lateral
function setPrompt(text) {
    chatInput.value = text + " ";
    chatInput.focus();
}

// Enviar mensaje
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // 1. Mostrar mensaje usuario
    addMessage(text, 'user');
    chatInput.value = '';

    // 2. Mostrar "Escribiendo..."
    const loadingId = addMessage("Analizando textos antiguos...", 'bot', true);

    try {
        // 3. Petición al backend
        const response = await fetch('https://buho-academico.onrender.com/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });

        const data = await response.json();
        
        // 4. Quitar loading y mostrar respuesta
        removeMessage(loadingId);
        // Formatear la respuesta (convertir saltos de línea y negritas markdown básicas)
        const formattedReply = formatResponse(data.reply);
        addMessage(formattedReply, 'bot');

    } catch (error) {
        removeMessage(loadingId);
        addMessage("Error: La pluma se ha roto. Verifica el servidor.", 'bot');
    }
});

function addMessage(text, sender, isLoading = false) {
    const div = document.createElement('div');
    div.classList.add('message', `${sender}-message`);
    
    // Si es loading, damos un ID para borrarlo luego
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

// Pequeña utilidad para convertir Markdown básico a HTML
function formatResponse(text) {
    // Negritas **texto** -> <b>texto</b>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Saltos de línea
    formatted = formatted.replace(/\n/g, '<br>');
    // Listas simples (guiones)
    formatted = formatted.replace(/- (.*?)<br>/g, '<li>$1</li>');
    return formatted;
}