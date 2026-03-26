/**
 * ==========================================
 * CITAS AGENDADAS - LÓGICA DE VISUALIZACIÓN
 * ==========================================
 * Este archivo maneja:
 * 1. Carga de citas desde Supabase
 * 2. Visualización en tabla
 * 3. Eliminación de citas
 * 4. Formato de fechas
 */

// Importamos el cliente de Supabase
import { supabase } from "./supabase.js";

console.log('✅ Cargando app-citas-agendadas.js');

/**
 * ==========================================
 * AL CARGAR EL DOM
 * ==========================================
 * Ejecutamos la función cargarCitas() cuando
 * la página esté lista
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM cargado, cargando citas...');
    cargarCitas();
});

/**
 * ==========================================
 * CARGAR CITAS DESDE SUPABASE
 * ==========================================
 * Función principal que:
 * 1. Consulta todas las citas
 * 2. Las ordena por fecha y hora
 * 3. Las muestra en la tabla
 */
const cargarCitas = async () => {
    console.log('🔍 Iniciando carga de citas...');
    
    // Obtenemos referencias a elementos del DOM
    const tbody = document.getElementById('tbodyCitas');
    const sinCitas = document.getElementById('sinCitas');
    const tabla = document.getElementById('tablaCitas');
    
    // Verificamos que el tbody exista
    if (!tbody) {
        console.error('❌ No se encontró tbodyCitas');
        return;
    }
    
    // Mostramos "Cargando..." mientras consultamos
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>';
    
    try {
        console.log('📡 Consultando Supabase...');
        
        /**
         * CONSULTA A SUPABASE
         * Traemos TODAS las columnas (*) de la tabla 'citas'
         * Ordenadas por fecha (ascendente) y hora (ascendente)
         */
        const { data, error } = await supabase
            .from('citas')                          // Tabla
            .select('*')                            // Todas las columnas
            .order('fecha_cita', { ascending: true })  // Orden por fecha
            .order('hora_cita', { ascending: true });  // Orden por hora
        
        console.log('📊 Respuesta:', { data, error });
        
        // Si hay error, lo lanzamos
        if (error) {
            console.error('❌ Error en consulta:', error);
            throw error;
        }
        
        /**
         * VERIFICAR SI HAY CITAS
         * Si no hay datos, mostramos el mensaje "No hay citas"
         */
        if (!data || data.length === 0) {
            console.log('ℹ️ No hay citas registradas');
            tabla.style.display = 'none';    // Ocultar tabla
            sinCitas.style.display = 'block'; // Mostrar mensaje
            return;
        }
        
        console.log('✅ Citas encontradas:', data.length);
        
        // Mostramos la tabla y ocultamos el mensaje de "sin citas"
        tabla.style.display = 'table';
        sinCitas.style.display = 'none';
        
        // Limpiamos el tbody
        tbody.innerHTML = '';
        
        /**
         * GENERAR FILAS DE LA TABLA
         * Por cada cita, creamos una fila <tr>
         */
        data.forEach((cita, index) => {
            console.log(`📝 Procesando cita ${index + 1}:`, cita);
            
            // Creamos elemento <tr>
            const tr = document.createElement('tr');
            
            /**
             * FORMATEAR FECHA
             * Convertimos "2026-03-24" a "24 de marzo de 2026"
             */
            const fechaFormateada = formatearFecha(cita.fecha_cita);
            
            /**
             * GENERAR HTML DE LA FILA
             * Usamos template literals (backticks) para insertar variables
             */
            tr.innerHTML = `
                <td>${fechaFormateada}</td>
                <td>${cita.hora_cita}</td>
                <td>${cita.nombre}</td>
                <td>${cita.telefono}</td>
                <td>${cita.marca} ${cita.modelo}</td>
                <td><span class="badge">${cita.placa}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarCita(${cita.id})" title="Eliminar">
                        🗑️
                    </button>
                </td>
            `;
            
            // Agregamos la fila al tbody
            tbody.appendChild(tr);
        });
        
        console.log('✅ Tabla actualizada con', data.length, 'citas');
        
    } catch (error) {
        /**
         * MANEJO DE ERRORES
         * Si algo falla, mostramos el error en la tabla
         */
        console.error('❌ Error al cargar citas:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        
        Swal.fire({
            icon: 'error',
            title: 'Error al cargar citas',
            text: error.message,
            confirmButtonText: 'Aceptar'
        });
    }
};

/**
 * ==========================================
 * FORMATEAR FECHA
 * ==========================================
 * Convierte fecha ISO (2026-03-24) a formato
 * legible en español (24 de marzo de 2026)
 */
const formatearFecha = (fechaString) => {
    if (!fechaString) return '';
    
    // Opciones de formato en español
    const opciones = { 
        year: 'numeric',    // Año completo (2026)
        month: 'long',      // Mes completo (marzo)
        day: 'numeric'      // Día (24)
    };
    
    // Convertimos y formateamos
    return new Date(fechaString).toLocaleDateString('es-ES', opciones);
};

/**
 * ==========================================
 * ELIMINAR CITA
 * ==========================================
 * Función global (window.eliminarCita) que se
 * llama desde el botón de eliminar en la tabla
 */
window.eliminarCita = async (id) => {
    /**
     * CONFIRMAR ELIMINACIÓN
     * SweetAlert2 con confirmación
     */
    const result = await Swal.fire({
        title: '¿Eliminar cita?',
        text: "No podrás revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EB6763',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    // Si el usuario confirma
    if (result.isConfirmed) {
        try {
            console.log('🗑️ Eliminando cita ID:', id);
            
            /**
             * ELIMINAR DE SUPABASE
             * Borramos la cita con el ID específico
             */
            const { error } = await supabase
                .from('citas')
                .delete()
                .eq('id', id);  // WHERE id = id
            
            if (error) throw error;
            
            console.log('✅ Cita eliminada');
            
            Swal.fire({
                icon: 'success',
                title: '¡Eliminadas!',
                timer: 2000,           // Auto-cerrar en 2 segundos
                showConfirmButton: false
            });
            
            // Recargamos la tabla para ver los cambios
            cargarCitas();
            
        } catch (error) {
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