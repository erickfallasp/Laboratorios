/**
 * CITAS AGENDADAS - LOGICA DE VISUALIZACION
 * Proposito: Cargar y mostrar todas las citas en una tabla publica
 */

import { supabase } from "./supabase.js"; // Importa cliente de Supabase

console.log('✅ Cargando app-citas-agendadas.js');

// Se ejecuta cuando la pagina carga completamente
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM cargado, cargando citas...');
    
    // Llama a la funcion principal que carga las citas
    cargarCitas();
});

// FUNCION PRINCIPAL: Cargar y mostrar citas
const cargarCitas = async () => {
    console.log('🔍 Iniciando carga de citas...');
    
    // Obtiene referencias de elementos del HTML
    const cuerpoTabla = document.getElementById('tbodyCitas');
    const mensajeSinCitas = document.getElementById('sinCitas');
    const tabla = document.getElementById('tablaCitas');
    
    // Si no encuentra el cuerpo de tabla, sale para evitar errores
    if (!cuerpoTabla) {
        console.error('❌ No se encontro tbodyCitas');
        return;
    }
    
    // Muestra mensaje de carga mientras consulta a Supabase
    cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>';
    
    try {
        console.log('📡 Consultando Supabase...');
        
        // Consulta todas las citas ordenadas por fecha y hora
        const { data: citas, error } = await supabase
            .from('citas')
            .select('*')
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true });
        
        console.log('📊 Respuesta:', { citas, error });
        
        // Si hay error en la consulta, lo lanza para manejarlo abajo
        if (error) {
            console.error('❌ Error en consulta:', error);
            throw error;
        }
        
        // Si no hay citas, muestra mensaje alternativo
        if (!citas || citas.length === 0) {
            console.log('ℹ️ No hay citas registradas');
            tabla.style.display = 'none';
            mensajeSinCitas.style.display = 'block';
            return;
        }
        
        console.log('✅ Citas encontradas:', citas.length);
        
        // Prepara la tabla para mostrar los datos
        tabla.style.display = 'table';
        mensajeSinCitas.style.display = 'none';
        cuerpoTabla.innerHTML = '';
        
        // Genera una fila HTML por cada cita
        citas.forEach((cita, indice) => {
            console.log(`📝 Procesando cita ${indice + 1}:`, cita);
            
            // Crea un nuevo elemento <tr> para la fila
            const fila = document.createElement('tr');
            
            // Formatea la fecha de ISO a formato legible
            const fechaFormateada = formatearFecha(cita.fecha_cita);
            
            // Genera el HTML de la fila con los datos de la cita
            fila.innerHTML = `
                <td>${fechaFormateada}</td>
                <td>${cita.hora_cita}</td>
                <td>${cita.nombre}</td>
                <td>${cita.telefono}</td>
                <td>${cita.marca} ${cita.modelo}</td>
                <td><span class="badge">${cita.placa}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" 
                            onclick="eliminarCita(${cita.id})" 
                            title="Eliminar">
                        🗑️
                    </button>
                </td>
            `;
            
            // Agrega la fila al cuerpo de la tabla
            cuerpoTabla.appendChild(fila);
        });
        
        console.log('✅ Tabla actualizada con', citas.length, 'citas');
        
    } catch (error) {
        // Maneja errores y muestra mensaje al usuario
        console.error('❌ Error al cargar citas:', error);
        
        cuerpoTabla.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        
        Swal.fire({
            icon: 'error',
            title: 'Error al cargar citas',
            text: error.message,
            confirmButtonText: 'Aceptar'
        });
    }
};

// FUNCION AUXILIAR: Formatear fecha de ISO a español
const formatearFecha = (cadenaFecha) => {
    // Si no hay fecha, retorna vacio
    if (!cadenaFecha) return '';
    
    // Configura opciones para formato en español
    const opciones = { 
        year: 'numeric',    // Año completo: 2026
        month: 'long',      // Mes completo: marzo
        day: 'numeric'      // Dia: 24
    };
    
    // Convierte y formatea la fecha
    // Ejemplo: "2026-03-24" → "24 de marzo de 2026"
    return new Date(cadenaFecha).toLocaleDateString('es-ES', opciones);
};

// FUNCION GLOBAL: Eliminar cita (disponible para HTML)
window.eliminarCita = async (identificador) => {
    // Pide confirmacion antes de eliminar
    const resultado = await Swal.fire({
        title: '¿Eliminar cita?',
        text: "No podras revertir esta accion",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EB6763',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    // Solo continua si el usuario confirmo
    if (resultado.isConfirmed) {
        try {
            console.log('🗑️ Eliminando cita ID:', identificador);
            
            // Elimina la cita en Supabase
            const { error } = await supabase
                .from('citas')
                .delete()
                .eq('id', identificador);
            
            if (error) throw error;
            
            console.log('✅ Cita eliminada');
            
            // Muestra mensaje de exito
            Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Recarga la tabla para reflejar el cambio
            cargarCitas();
            
        } catch (error) {
            // Maneja errores de eliminacion
            console.error('❌ Error al eliminar:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar la cita'
            });
        }
    }
};

console.log('✅ app-citas-agendadas.js cargado');