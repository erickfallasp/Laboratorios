/**
 * ==========================================
 * SISTEMA DE AUTENTICACIÓN - app-auth.js
 * ==========================================
 * PROPÓSITO: Este archivo maneja TODO lo relacionado
 * con el inicio y cierre de sesión de los usuarios.
 * 
 * FUNCIONALIDADES PRINCIPALES:
 * 1. Verificar si hay un usuario logueado al cargar la página
 * 2. Redirigir según el rol (admin → dashboard-admin, cliente → dashboard-cliente)
 * 3. Procesar el formulario de login
 * 4. Procesar el formulario de registro de nuevos usuarios
 * 5. Cerrar sesión y limpiar datos
 * 
 * CONEXIONES:
 * - Importa 'supabase' desde supabase.js para conectar con la BD
 * - Usa SweetAlert2 para mostrar alertas bonitas al usuario
 * - Se conecta con las tablas: auth.users y public.perfiles
 */

// ==========================================
// IMPORTAR DEPENDENCIAS
// ==========================================
// Importamos el cliente de Supabase que ya está configurado
// Esto nos permite hacer consultas a la base de datos
import { supabase } from "./supabase.js";

// Mensajes de confirmación en consola (útiles para depuración)
console.log('✅ Sistema de autenticación cargado');
console.log('🔗 Supabase:', supabase);

// ==========================================
// VARIABLE DE CONTROL DE SESIÓN
// ==========================================
// Esta variable evita que verifiquemos la sesión múltiples veces
// cuando el usuario navega entre páginas, mejorando el rendimiento
let sesionVerificada = false;

// ==========================================
// EVENTO PRINCIPAL: AL CARGAR LA PÁGINA
// ==========================================
// Este código se ejecuta automáticamente cuando el HTML está listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Verificando sesión...');
    
    // ==========================================
    // DETECTAR EN QUÉ PÁGINA ESTAMOS
    // ==========================================
    // Obtenemos la ruta actual para tomar decisiones
    // Ej: "/Proyecto/login.html" o "/Proyecto/dashboard-cliente.html"
    const paginaActual = window.location.pathname;
    
    // ==========================================
    // CASO 1: Estamos en login.html o registro.html
    // ==========================================
    // Si el usuario está en las páginas de autenticación,
    // NO lo redirigimos (obviamente, necesita estar ahí para loguearse)
    if (paginaActual.includes('login.html') || paginaActual.includes('registro.html')) {
        console.log('📄 Página de auth, no redirigir');
        
        // Buscamos los formularios en el HTML por sus IDs
        const loginForm = document.getElementById('loginForm');
        const registroForm = document.getElementById('registroForm');
        
        // Si existe el formulario de login, le agregamos un "escuchador"
        // que ejecutará la función handleLogin cuando el usuario envíe el formulario
        if (loginForm) {
            console.log('✅ Formulario de login encontrado');
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // Lo mismo para el formulario de registro
        if (registroForm) {
            console.log('✅ Formulario de registro encontrado');
            registroForm.addEventListener('submit', handleRegistro);
        }
        
        // Salimos de la función porque no necesitamos verificar sesión aquí
        return;
    }
    
    // ==========================================
    // CASO 2: Estamos en una página protegida (dashboard, citas, etc.)
    // ==========================================
    
    // Evitamos verificar la sesión más de una vez (optimización)
    if (sesionVerificada) {
        console.log('✅ Sesión ya verificada');
        return;
    }
    
    // Marcamos que ya verificamos para no repetir
    sesionVerificada = true;
    
    // ==========================================
    // CONSULTAR SESIÓN ACTIVA EN SUPABASE
    // ==========================================
    // Preguntamos a Supabase: "¿Hay algún usuario logueado?"
    // Esta consulta es asíncrona (async/await) porque va a la nube
    const { data: { session } } = await supabase.auth.getSession();
    
    // ==========================================
    // SI NO HAY SESIÓN → REDIRIGIR A LOGIN
    // ==========================================
    // Si session es null/undefined, el usuario NO está logueado
    // Por seguridad, lo mandamos al login para que se autentique
    if (!session) {
        console.log('⚠️ No hay sesión, redirigiendo a login');
        window.location.href = 'login.html';
        return; // Detenemos la ejecución
    }
    
    // Si llegamos aquí, el usuario SÍ está logueado
    console.log('✅ Sesión activa:', session.user.email);
    
    // ==========================================
    // VERIFICAR ROL DEL USUARIO (Solo en dashboards)
    // ==========================================
    // Si estamos en una página de dashboard, necesitamos saber
    // si es administrador o cliente para controlar el acceso
    if (paginaActual.includes('dashboard')) {
        
        // Consultamos la tabla 'perfiles' para obtener el rol del usuario
        // .eq('id', session.user.id) → Filtra por el ID del usuario logueado
        // .single() → Esperamos solo un resultado (cada usuario tiene un perfil)
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol, nombre_completo')  // Solo traemos estos campos
            .eq('id', session.user.id)
            .single();
        
        // ==========================================
        // CONTROL DE ACCESO PARA ADMINISTRADORES
        // ==========================================
        // Si estamos en dashboard-admin PERO el usuario NO es admin,
        // lo bloqueamos y lo redirigimos a su dashboard de cliente
        if (paginaActual.includes('dashboard-admin') && perfil?.rol !== 'administrador') {
            Swal.fire({
                icon: 'error',
                title: 'Acceso denegado',
                text: 'No eres administrador'
            }).then(() => {
                window.location.href = 'dashboard-cliente.html';
            });
            return;
        }
        
        // ==========================================
        // ACTUALIZAR INFORMACIÓN DEL USUARIO EN EL HTML
        // ==========================================
        // Si el HTML tiene elementos para mostrar el nombre y email,
        // los llenamos con los datos del perfil del usuario
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        
        if (userNameEl && perfil?.nombre_completo) {
            userNameEl.textContent = perfil.nombre_completo;
        }
        if (userEmailEl) {
            userEmailEl.textContent = session.user.email;
        }
    }
});

// ==========================================
// FUNCIÓN: MANEJAR INICIO DE SESIÓN (LOGIN)
// ==========================================
// Esta función se ejecuta cuando el usuario envía el formulario de login
async function handleLogin(evento) {
    // Prevenir que el formulario recargue la página (comportamiento por defecto)
    evento.preventDefault();
    
    // ==========================================
    // OBTENER DATOS DEL FORMULARIO
    // ==========================================
    // .value → Obtiene lo que escribió el usuario
    // .trim() → Elimina espacios en blanco al inicio y final
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('🔐 Intentando login con:', email);
    
    // ==========================================
    // BLOQUE TRY-CATCH PARA MANEJAR ERRORES
    // ==========================================
    // Todo lo que pueda fallar (red, BD, credenciales) va dentro de try
    // Si algo falla, el catch lo captura y muestra un mensaje amigable
    try {
        // ==========================================
        // MOSTRAR INDICADOR DE CARGA
        // ==========================================
        // SweetAlert2 muestra una alerta con animación de "loading"
        // allowOutsideClick: false → El usuario debe esperar a que termine
        Swal.fire({
            title: 'Iniciando sesión...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()  // Activa la animación
        });
        
        // ==========================================
        // AUTENTICAR CON SUPABASE
        // ==========================================
        // signInWithPassword verifica email y contraseña contra auth.users
        // Retorna: { data: { user }, error }
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        // Si hay error (credenciales incorrectas, usuario no existe, etc.)
        if (error) throw error;  // Lo lanzamos para que lo capture el catch
        
        console.log('✅ Login exitoso:', data.user.email);
        
        // ==========================================
        // OBTENER PERFIL PARA CONOCER EL ROL
        // ==========================================
        // Necesitamos saber si es admin o cliente para redirigirlo correctamente
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol, nombre_completo')
            .eq('id', data.user.id)  // Buscamos por el ID del usuario autenticado
            .single();
        
        console.log('👤 Perfil:', perfil);
        
        // Cerrar la alerta de loading
        Swal.close();
        
        // ==========================================
        // MOSTRAR MENSAJE DE BIENVENIDA
        // ==========================================
        await Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            text: `Hola ${perfil?.nombre_completo || email}`,  // Nombre o email si no hay nombre
            timer: 1500,  // Se cierra automático en 1.5 segundos
            showConfirmButton: false
        });
        
        // ==========================================
        // REDIRECCIÓN SEGÚN EL ROL
        // ==========================================
        // Esperamos 1.5 segundos para que el usuario vea el mensaje de éxito
        setTimeout(() => {
            if (perfil?.rol === 'administrador') {
                // Si es admin → Panel de administración (ve TODO)
                window.location.href = 'dashboard-admin.html';
            } else {
                // Si es cliente → Panel personal (ve SOLO lo suyo)
                window.location.href = 'dashboard-cliente.html';
            }
        }, 1500);
        
    } catch (error) {
        // ==========================================
        // MANEJO DE ERRORES
        // ==========================================
        // Si algo falló en el try, llegamos aquí
        console.error('❌ Error en login:', error);
        Swal.close();  // Aseguramos cerrar el loading
        
        // Mostramos un mensaje amigable al usuario (no técnico)
        Swal.fire({
            icon: 'error',
            title: 'Error al iniciar sesión',
            text: error.message || 'Credenciales incorrectas',
            confirmButtonText: 'Intentar de nuevo'
        });
    }
}

// ==========================================
// FUNCIÓN: MANEJAR REGISTRO DE NUEVO USUARIO
// ==========================================
async function handleRegistro(evento) {
    evento.preventDefault();  // Evitar recarga de página
    console.log('📝 Iniciando registro...');
    
    // ==========================================
    // CAPTURAR DATOS DEL FORMULARIO
    // ==========================================
    const nombreCompleto = document.getElementById('nombre_completo').value.trim();
    const email = document.getElementById('email_registro').value.trim();
    const telefono = document.getElementById('telefono_registro').value.trim();
    const password = document.getElementById('password_registro').value;
    const passwordConfirm = document.getElementById('password_confirm').value;
    
    console.log('Datos del registro:', { email, nombreCompleto, telefono });
    
    // ==========================================
    // VALIDACIÓN 1: Contraseñas deben coincidir
    // ==========================================
    // Evitamos registrar si el usuario escribió mal la contraseña
    if (password !== passwordConfirm) {
        console.error('❌ Las contraseñas no coinciden');
        Swal.fire({
            icon: 'error',
            title: 'Las contraseñas no coinciden',
            text: 'Por favor verifica que ambas contraseñas sean iguales',
            confirmButtonText: 'Corregir'
        });
        return;  // Detenemos el registro
    }
    
    // ==========================================
    // VALIDACIÓN 2: Longitud mínima de contraseña
    // ==========================================
    // Supabase requiere al menos 6 caracteres por seguridad
    if (password.length < 6) {
        console.error('❌ Contraseña muy corta');
        Swal.fire({
            icon: 'error',
            title: 'Contraseña muy corta',
            text: 'La contraseña debe tener al menos 6 caracteres',
            confirmButtonText: 'Corregir'
        });
        return;
    }
    
    try {
        console.log('⏳ Creando usuario...');
        
        // Mostrar loading mientras se crea la cuenta
        Swal.fire({
            title: 'Creando cuenta...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // ==========================================
        // CREAR USUARIO EN SUPABASE AUTH
        // ==========================================
        // signUp crea el usuario en la tabla auth.users de Supabase
        // options.data permite guardar información adicional (metadata)
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {  // Metadata que se guarda en auth.users
                    nombre_completo: nombreCompleto,
                    telefono: telefono
                }
            }
        });
        
        console.log('📊 Respuesta de signUp:', { data, error });
        
        // Si hubo error (email ya existe, formato inválido, etc.)
        if (error) {
            console.error('❌ Error de Supabase:', error);
            throw error;
        }
        
        // Verificar que realmente se creó el usuario
        if (!data.user) {
            throw new Error('No se creó el usuario');
        }
        
        console.log('✅ Usuario creado:', data.user.id);
        
        // ==========================================
        // ACTUALIZAR PERFIL EN TABLA PÚBLICA
        // ==========================================
        // El trigger en la BD debería crear el perfil automáticamente,
        // pero actualizamos por seguridad con los datos completos
        if (data.user) {
            console.log('📝 Actualizando perfil...');
            
            const { error: updateError } = await supabase
                .from('perfiles')  // Tabla pública con información extra
                .update({
                    nombre_completo: nombreCompleto,
                    telefono: telefono
                })
                .eq('id', data.user.id);  // Filtrar por el ID del usuario
            
            if (updateError) {
                console.error('❌ Error al actualizar perfil:', updateError);
            } else {
                console.log('✅ Perfil actualizado');
            }
        }
        
        Swal.close();  // Cerrar loading
        
        // ==========================================
        // MENSAJE DE ÉXITO Y REDIRECCIÓN
        // ==========================================
        Swal.fire({
            icon: 'success',
            title: '¡Cuenta creada!',
            text: 'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.',
            confirmButtonText: 'Ir a Iniciar Sesión',
            confirmButtonColor: '#10CFC8'
        }).then(() => {
            console.log('🔄 Redirigiendo a login...');
            window.location.href = 'login.html';  // Mandar a login para que se autentique
        });
        
    } catch (error) {
        // ==========================================
        // MANEJO DE ERRORES CON MENSAJES AMIGABLES
        // ==========================================
        console.error('❌ Error en registro:', error);
        console.error('📋 Detalles:', error.message);
        Swal.close();
        
        // Personalizamos el mensaje de error según el tipo
        let mensajeError = error.message;
        
        if (error.message.includes('User already registered')) {
            mensajeError = 'Este correo ya está registrado. Intenta iniciar sesión.';
        } else if (error.message.includes('Invalid email')) {
            mensajeError = 'El correo electrónico no es válido.';
        } else if (error.message.includes('Password')) {
            mensajeError = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error al crear cuenta',
            text: mensajeError,
            confirmButtonText: 'Intentar de nuevo'
        });
    }
}

// ==========================================
// FUNCIÓN: CERRAR SESIÓN (LOGOUT)
// ==========================================
// Esta función es exportada para que otros archivos puedan usarla
export async function cerrarSesion() {
    console.log('🚪 Cerrando sesión...');
    
    // signOut() elimina la sesión activa de Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('❌ Error:', error);
        Swal.fire('Error', error.message, 'error');
        return;
    }
    
    // Mostrar mensaje de despedida
    Swal.fire({
        icon: 'success',
        title: 'Sesión cerrada',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        // Redirigir al login después de cerrar
        window.location.href = 'login.html';
    });
}

// ==========================================
// HACER LA FUNCIÓN GLOBAL PARA EL HTML
// ==========================================
// Esto permite que el botón "Cerrar Sesión" en el HTML
// pueda llamar a esta función con onclick="cerrarSesion()"
window.cerrarSesion = cerrarSesion;

console.log('✅ app-auth.js cargado completamente');