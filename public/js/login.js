document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
    
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
    
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.token);
            console.log("✅ Token guardado en localStorage:", data.token); // <-- Verificar que se guarda
            window.location.href = "chat.html";
        } else {
            alert("❌ Error al iniciar sesión: " + data.message);
        }
    });
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token); // Guardar token en localStorage
            window.location.href = 'chat.html'; // Redirigir al chat
        } else {
            alert('Credenciales incorrectas');
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        document.getElementById('loginForm').addEventListener('submit', async function (event) {
            event.preventDefault();
        
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
        
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
        
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('token', data.token); // Guardar token en localStorage
                    window.location.href = 'chat.html'; // Redirigir al chat
                } else {
                    alert('Credenciales incorrectas');
                }
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                alert('Ocurrió un error al intentar iniciar sesión');
            }
        });    }
});