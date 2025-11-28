// ==========================================
// 🦅 SCRIPT.JS - EL ESCRIBA (FULL STACK)
// ==========================================

// --- 1. REFERENCIAS DEL DOM (Elementos de la pantalla) ---
const loginScreen = document.getElementById('login-screen');
const appInterface = document.getElementById('app-interface');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const usernameDisplay = document.getElementById('username-display');

// Elementos de Autenticación
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const toggleAuth = document.getElementById('toggle-auth');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');

// Elementos de Archivos (PDF)
const fileInput = document.getElementById('file-input');
const attachBtn = document.getElementById('attach-btn');
const fileNameDisplay = document.getElementById('file-name-display');

// --- 2. ESTADO GLOBAL ---
let currentFile = null;      // Para guardar el PDF temporalmente
let isRegisterMode = false;  // Para saber si estamos en Login o Registro
// 👇 IMPORTANTE: Asegúrate de que esta URL sea la tuya de Render
const API_URL = 'https://buho-academico.onrender.com'; 


// ==========================================
// 🔐 SECCIÓN A: LÓGICA DE LOGIN / REGISTRO
// ==========================================

// Cambiar entre formulario de "Iniciar Sesión" y "Crear Cuenta"
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    authError.style.display = 'none'; // Limpiar errores viejos

    if (isRegisterMode) {
        // MODO REGISTRO
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'block';
        toggleText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggle-auth-back">Inicia sesión</a>';
        
        // Asignar evento al nuevo link generado dinámicamente
        document.getElementById('toggle-auth-back').addEventListener('click', (ev) => {
            ev.preventDefault();
            toggleAuth.click(); // Simular clic para volver
        });
    } else {
        // MODO LOGIN
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'none';
        toggleText.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-auth">Crear una nueva</a>';
    }
});

// Función Principal de Autenticación (Llama al servidor)
async function handleAuth(endpoint) {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showError("Por favor ingresa usuario y contraseña.");
        return;
    }

    // Feedback visual (deshabilitar botones mientras carga)
    const btn = isRegisterMode ? registerBtn : loginBtn;
    const originalText = btn.textContent;
    btn.textContent = "Procesando...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Error de conexión");
        }

        if (endpoint === '/register') {
            alert("¡Cuenta creada con éxito! Ahora inicia sesión.");
            // Volver automáticamente al login
            toggleAuth.click(); 
        } else {
            // Login exitoso
            ingresar('usuario', data.username);
        }

    } catch (error) {
        showError(error.message);
    } finally {
        // Restaurar botones
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Función auxiliar para mostrar errores rojos
function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
}

// Eventos de los botones de Auth
loginBtn.addEventListener('click', () => handleAuth('/login'));
registerBtn.addEventListener('click', () => handleAuth('/register'));


// Función de transición de pantalla (Login -> App)
function ingresar(tipo, nombreReal) {
    loginScreen.style.opacity = '0'; // Efecto desvanecer
    
    setTimeout(() => {
        loginScreen.classList.add('hidden');
        appInterface.classList.remove('hidden');
        
        // Limpiar campos de contraseña por seguridad
        passwordInput.value = '';
        authError.style.display = 'none';

        if(tipo === 'invitado') {
            usernameDisplay.textContent = "Invitado";
        } else {
            usernameDisplay.textContent = nombreReal || "Estudiante";
        }
    }, 500);
}

// Función Cerrar Sesión
function logout() {
    appInterface.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.style.opacity = '1';
    
    // Limpiar chat y archivos
    chatMessages.innerHTML = '';
    chatInput.value = '';
    currentFile = null;
    updateFileDisplay();
}


// ==========================================
// 📎 SECCIÓN B: MANEJO DE ARCHIVOS (PDF)
// ==========================================

// Click en el clip -> Abre selector de archivos
attachBtn.addEventListener('click', () => fileInput.click());

// Cuando el usuario selecciona un archivo
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            alert("Por el momento, El Escriba solo lee archivos PDF.");
            return;
        }

        // Convertir PDF a Base64 (Texto largo para enviarlo)
        const reader = new FileReader();
        reader.onload = function(event) {
            // Extraer solo la parte de datos (quitar encabezado)
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

// Actualizar la vista visual del archivo adjunto
function updateFileDisplay() {
    if (currentFile) {
        fileNameDisplay.textContent = `📄 Archivo listo: ${currentFile.name}`;
        fileNameDisplay.style.display = 'block';
        attachBtn.style.color = '#2c4c3b'; // Verde activo
    } else {
        fileNameDisplay.style.display = 'none';
        attachBtn.style.color = ''; // Color normal
        fileInput.value = ''; // Reset input
    }
}


// ==========================================
// 💬 SECCIÓN C: LÓGICA DEL CHAT
// ==========================================

// Función para los botones rápidos de la barra lateral
function setPrompt(text) {
    chatInput.value = text + " ";
    chatInput.focus();
}

// Enviar mensaje (Submit del formulario)
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    
    // Validar: Debe haber texto O un archivo adjunto
    if (!text && !currentFile) return;

    // 1. Mostrar mensaje del usuario en pantalla
    let userMsgDisplay = text;
    if (currentFile) {
        userMsgDisplay += ` <br><small style="color:#666">📎 [Adjunto: ${currentFile.name}]</small>`;
    }
    addMessage(userMsgDisplay, 'user');
    
    // Limpiar input y guardar referencia del archivo a enviar
    chatInput.value = '';
    const fileToSend = currentFile; 
    
    // Limpiar archivo seleccionado (para que no se envíe de nuevo por error)
    currentFile = null; 
    updateFileDisplay();

    // 2. Mostrar "Escribiendo..."
    const loadingId = addMessage("Analizando pergaminos...", 'bot', true);

    try {
        // 3. Petición al Backend (/chat)
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                file: fileToSend // Se envía null si no hay archivo
            }),
        });

        const data = await response.json();
        
        // Quitar loading
        removeMessage(loadingId);

        // 4. Mostrar respuesta del Bot
        if (!response.ok) throw new Error("Error en la respuesta");
        
        const formattedReply = formatResponse(data.reply);
        addMessage(formattedReply, 'bot');

    } catch (error) {
        removeMessage(loadingId);
        addMessage("Error: La pluma se ha roto. Verifica tu conexión o intenta de nuevo.", 'bot');
        console.error(error);
    }
});


// --- Utilidades de Renderizado ---

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
    // Auto-scroll hacia abajo
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgId;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Formato Markdown básico a HTML
function formatResponse(text) {
    if (!text) return "";
    // Negritas **texto** -> <b>texto</b>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Saltos de línea
    formatted = formatted.replace(/\n/g, '<br>');
    // Listas (guiones)
    formatted = formatted.replace(/- (.*?)<br>/g, '<li>$1</li>');
    return formatted;
}