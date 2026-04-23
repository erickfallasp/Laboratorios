/**
 * SISTEMA DE AUTENTICACION
 * Proposito: Manejar login, registro y cierre de sesion
 */

import { supabase } from "./supabase.js";

console.log('✅ Sistema de autenticacion cargado');

let sesionVerificada = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Verificando sesion...');
    
    const paginaActual = window.location.pathname;
    
    if (paginaActual.includes('login.html') || paginaActual.includes('registro.html')) {
        console.log('📄 Pagina de auth, no redirigir');
        
        const loginForm = document.getElementById('loginForm');
        const registroForm = document.getElementById('registroForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        if (registroForm) {
            registroForm.addEventListener('submit', handleRegistro);
        }
        
        return;
    }
    
    if (sesionVerificada) {
        return;
    }
    
    sesionVerificada = true;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Sesion activa:', session.user.email);
    
    if (paginaActual.includes('dashboard')) {
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol, nombre_completo')
            .eq('id', session.user.id)
            .single();
        
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

async function handleLogin(evento) {
    evento.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        Swal.fire({
            title: 'Iniciando sesion...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol, nombre_completo')
            .eq('id', data.user.id)
            .single();
        
        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            text: `Hola ${perfil?.nombre_completo || email}`,
            timer: 1500,
            showConfirmButton: false
        });
        
        setTimeout(() => {
            if (perfil?.rol === 'administrador') {
                window.location.href = 'dashboard-admin.html';
            } else {
                window.location.href = 'dashboard-cliente.html';
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        Swal.close();
        
        Swal.fire({
            icon: 'error',
            title: 'Error al iniciar sesion',
            text: error.message || 'Credenciales incorrectas',
            confirmButtonText: 'Intentar de nuevo'
        });
    }
}

async function handleRegistro(evento) {
    evento.preventDefault();
    
    const nombreCompleto = document.getElementById('nombre_completo').value.trim();
    const email = document.getElementById('email_registro').value.trim();
    const telefono = document.getElementById('telefono_registro').value.trim();
    const password = document.getElementById('password_registro').value;
    const passwordConfirm = document.getElementById('password_confirm').value;
    
    if (password !== passwordConfirm) {
        Swal.fire({
            icon: 'error',
            title: 'Las contrasenas no coinciden',
            text: 'Por favor verifica que ambas contrasenas sean iguales',
            confirmButtonText: 'Corregir'
        });
        return;
    }
    
    if (password.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Contrasena muy corta',
            text: 'La contrasena debe tener al menos 6 caracteres',
            confirmButtonText: 'Corregir'
        });
        return;
    }
    
    try {
        Swal.fire({
            title: 'Creando cuenta...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre_completo: nombreCompleto,
                    telefono: telefono
                }
            }
        });
        
        if (error) throw error;
        
        if (!data.user) {
            throw new Error('No se creo el usuario');
        }
        
        if (data.user) {
            const { error: updateError } = await supabase
                .from('perfiles')
                .update({
                    nombre_completo: nombreCompleto,
                    telefono: telefono
                })
                .eq('id', data.user.id);
        }
        
        Swal.close();
        
        Swal.fire({
            icon: 'success',
            title: '¡Cuenta creada!',
            text: 'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesion.',
            confirmButtonText: 'Ir a Iniciar Sesion',
            confirmButtonColor: '#10CFC8'
        }).then(() => {
            window.location.href = 'login.html';
        });
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        Swal.close();
        
        let mensajeError = error.message;
        
        if (error.message.includes('User already registered')) {
            mensajeError = 'Este correo ya esta registrado. Intenta iniciar sesion.';
        } else if (error.message.includes('Invalid email')) {
            mensajeError = 'El correo electronico no es valido.';
        } else if (error.message.includes('Password')) {
            mensajeError = 'La contrasena es muy debil. Usa al menos 6 caracteres.';
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error al crear cuenta',
            text: mensajeError,
            confirmButtonText: 'Intentar de nuevo'
        });
    }
}

export async function cerrarSesion() {
    console.log('🚪 Cerrando sesion...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('❌ Error:', error);
        Swal.fire('Error', error.message, 'error');
        return;
    }
    
    Swal.fire({
        icon: 'success',
        title: 'Sesion cerrada',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'login.html';
    });
}

window.cerrarSesion = cerrarSesion;

console.log('✅ app-Autorizacion.js cargado completamente');