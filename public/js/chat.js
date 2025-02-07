// Verificar si jwt-decode está disponible
if (typeof window.jwt_decode !== "function") {
    console.error("❌ jwt-decode no está disponible.");
    alert("Error crítico: jwt-decode no está cargado correctamente.");
    window.location.href = "login.html";
}

// Objeto para almacenar chats privados
const privateChats = {};

// Función para verificar si el token ha caducado
function isTokenExpired(token) {
    try {
        const decoded = jwt_decode(token);
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (err) {
        return true;
    }
}

// Función para renovar el token si es necesario
async function refreshTokenIfNeeded() {
    const storedToken = localStorage.getItem("token");

    if (!storedToken || isTokenExpired(storedToken)) {
        try {
            const response = await fetch("/refresh-token", {
                method: "POST",
                headers: { Authorization: `Bearer ${storedToken}` },
            });

            if (!response.ok) throw new Error("No se pudo renovar el token.");

            const data = await response.json();
            if (!data.token) throw new Error("Respuesta inválida del servidor.");

            localStorage.setItem("token", data.token);
            console.log("✅ Token renovado:", data.token);
            return data.token;
        } catch (err) {
            console.error("❌ Error al renovar el token:", err);
            alert("Error al renovar el token. Por favor, inicia sesión nuevamente.");
            window.location.href = "login.html";
        }
    }
    return storedToken;
}

// Función para mostrar mensajes en el chat
function mostrarMensaje(usuario, mensaje, esMio, esPrivado, chatBoxId) {
    const chatBox = document.getElementById(chatBoxId);
    if (!chatBox) {
        console.error(`❌ Error: No se encontró el contenedor de mensajes (${chatBoxId}).`);
        return;
    }

    const mensajeElemento = document.createElement("div");
    mensajeElemento.classList.add("message", esMio ? "mine" : "other");
    if (esPrivado) mensajeElemento.classList.add("private-message");

    mensajeElemento.innerHTML = `<strong>${usuario}:</strong> ${mensaje}`;
    chatBox.appendChild(mensajeElemento);

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Función para actualizar la lista de usuarios
function actualizarListaUsuarios(usuarios, nombreEmisor) {
    const userList = document.getElementById("userList"); // Select de usuarios
    const userListSidebar = document.querySelector(".sidebar .user-list ul"); // Lista de la sidebar

    if (!userList || !userListSidebar) {
        console.error("❌ No se encontraron los elementos de la lista de usuarios.");
        return;
    }

    // ✅ Limpiar ambas listas antes de actualizar
    userList.innerHTML = "";
    userListSidebar.innerHTML = "";

    // ✅ Agregar opción de mensaje público al select
    const optionPublic = document.createElement("option");
    optionPublic.value = "public";
    optionPublic.textContent = "Mensaje Público";
    optionPublic.selected = true;
    userList.appendChild(optionPublic);

    // ✅ Recorrer los usuarios conectados y agregarlos al DOM
    usuarios.forEach((username) => {
        if (username !== nombreEmisor) {
            // Agregar usuario a la lista de la sidebar
            const listItem = document.createElement("li");
            listItem.textContent = username;
            userListSidebar.appendChild(listItem);

            // Agregar usuario al select de usuarios
            const option = document.createElement("option");
            option.value = username;
            option.textContent = username;
            userList.appendChild(option);
        }
    });
}





// Obtener el token desde localStorage
const token = localStorage.getItem("token");

if (!token) {
    alert("❌ No tienes una sesión activa. Por favor, inicia sesión.");
    window.location.href = "login.html";
} else {
    console.log("🔹 Token encontrado en localStorage:", token);

    // Renovar el token si es necesario
    refreshTokenIfNeeded().then((validToken) => {
        if (validToken) {
            try {
                const decoded = jwt_decode(validToken);
                const nombreEmisor = decoded.username;

                document.getElementById("usernameDisplay").textContent = `${nombreEmisor} `;

                // Conectar con WebSockets
                const socket = io({ auth: { token: validToken } });

                // Eventos del socket
                socket.on("connect", () => {
                    console.log(`✅ Conectado al servidor WebSocket como ${nombreEmisor}`);
                });

                socket.on("update user list", (usuarios) => {
                    console.log("✅ Lista de usuarios actualizada:", usuarios);
                    actualizarListaUsuarios(usuarios, nombreEmisor);
                });//

                socket.on("chat message", (data) => {
                    mostrarMensaje(data.username, data.msg, false, false, "chatBox");
                });
   
                socket.on("private message", (data) => {
                    if (data.emisor !== nombreEmisor) {
                        if (!privateChats[data.emisor]) {
                            crearChatPrivado(data.emisor);
                        }
                        mostrarMensaje(data.emisor, data.msg, false, true, `chat-${data.emisor}`);
                    }
                });

                // Manejo de mensajes privados
                document.getElementById("messageForm").addEventListener("submit", function (event) {
                    event.preventDefault();
                    const messageInput = document.getElementById("message");
                    const message = messageInput.value.trim();
                    const destinatario = document.getElementById("userList").value;

                    if (message) {
                        if (destinatario === "public") {
                            socket.emit("chat message", { msg: message });
                            mostrarMensaje("Tú", message, true, false, "chatBox");
                        } else if (destinatario !== nombreEmisor) {
                            socket.emit("private message", { destinatario, msg: message });
                            mostrarMensaje("Tú", `➡️ ${destinatario}: ${message}`, true, true, `chat-${destinatario}`);
                            mostrarChatPrivado(destinatario);
                        } else {
                            alert("❌ No puedes enviarte mensajes a ti mismo.");
                        }
                        messageInput.value = "";
                    }
                });

            } catch (error) {
                console.error("❌ Error al decodificar el token:", error);
                alert("Sesión inválida. Por favor, inicia sesión nuevamente.");
                window.location.href = "login.html";
            }
        }

        function crearChatPrivado(usuario) {
            const chatContainer = document.querySelector(".main-chat-area");

            // Crear contenedor de chat privado si no existe
            const chatBox = document.createElement("div");
            chatBox.classList.add("chat-box", "private-chat");
            chatBox.id = `chat-${usuario}`;
            chatBox.style.display = "none";

            chatContainer.appendChild(chatBox);

            privateChats[usuario] = chatBox;
        }

            function mostrarChatPrivado(usuario) {
                // Ocultar el chat público
                document.getElementById("chatBox").style.display = "none";

                // Ocultar todos los chats privados
                document.querySelectorAll(".private-chat").forEach(chat => {
                    chat.style.display = "none";
                });

                // Mostrar solo el chat privado seleccionado
                if (privateChats[usuario]) {
                    privateChats[usuario].style.display = "block";
                }
            }

        document.getElementById("userList").addEventListener("change", function () {
            const selectedUser = this.value;
            if (selectedUser === "public") {
                document.getElementById("chatBox").style.display = "block";
                document.querySelectorAll(".private-chat").forEach(chat => {
                    chat.style.display = "none";
                });
            } else {
                if (!privateChats[selectedUser]) {
                    crearChatPrivado(selectedUser);
                }
                mostrarChatPrivado(selectedUser);
            }
        });

    });
}
