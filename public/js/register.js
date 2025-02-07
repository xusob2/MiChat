document.getElementById('registerForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validación de coincidencia de contraseñas
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden. Por favor, intenta de nuevo.');
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        // Verifica si la respuesta es exitosa (código 200 o 201)
        if (response.ok) {
            alert('Registro exitoso. Por favor, inicia sesión.');
            window.location.href = 'login.html';
            return;
        }

        // Manejo de respuestas con error
        const data = await response.json(); // Extrae el mensaje de error del servidor
        if (response.status === 409) { // Código 409 = Usuario ya registrado
            alert(data.message || 'El nombre de usuario ya está en uso.');
        } else {
            alert(data.message || 'Error desconocido al registrarte.');
        }
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        alert('No se pudo conectar con el servidor. Inténtalo más tarde.');
    }
});
