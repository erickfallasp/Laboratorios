/**
 * DASHBOARD DE ADMINISTRADOR
 * Proposito: Mostrar estadisticas y gestionar todas las citas del sistema
 */

import { supabase } from "./supabase.js"; // Importa cliente de Supabase

console.log('✅ Dashboard admin cargado');

// Se ejecuta cuando la pagina carga
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Iniciando dashboard...');
    cargarTodasLasCitas(); // Carga y muestra todas las citas
    cargarEstadisticas();  // Carga y muestra estadisticas
});

// FUNCION: Cargar estadisticas del sistema
async function cargarEstadisticas() {
    try {
        // Consulta total de citas
        const response1 = await supabase
            .from('citas')
            .select('*', { count: 'exact', head: true });
        const { count: totalCitas } = response1;
        
        // Consulta total de clientes
        const response2 = await supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'cliente');
        const { count: totalClientes } = response2;
        
        // Consulta citas del dia actual
        const hoy = new Date().toISOString().split('T')[0];
        const response3 = await supabase
            .from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('fecha_cita', hoy);
        const { count: citasHoy } = response3;
        
        // Actualiza los elementos del DOM con los valores
        const elemCitas = document.getElementById('totalCitas');
        const elemClientes = document.getElementById('totalClientes');
        const elemHoy = document.getElementById('citasHoy');
        
        if (elemCitas) elemCitas.textContent = totalCitas || 0;
        if (elemClientes) elemClientes.textContent = totalClientes || 0;
        if (elemHoy) elemHoy.textContent = citasHoy || 0;
        
        console.log('📊 Estadisticas:', { totalCitas, totalClientes, citasHoy });
    } catch (error) {
        console.error('❌ Error estadisticas:', error);
    }
}

// FUNCION: Cargar y mostrar todas las citas en la tabla
async function cargarTodasLasCitas() {
    console.log('🔍 Cargando citas...');
    
    const tbody = document.getElementById('tbodyCitasAdmin');
    if (!tbody) {
        console.error('❌ No existe tbodyCitasAdmin');
        return;
    }
    
    // Muestra mensaje de carga
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">⏳ Cargando...</td></tr>';
    
    try {
        // Consulta todas las citas ordenadas por fecha
        const response = await supabase
            .from('citas')
            .select('*')
            .order('fecha_cita', { ascending: false });
        
        console.log('📊 Respuesta completa:', response);
        
        // Extrae datos y error de la respuesta
        const citas = response.data;  //
        const error = response.error;
        console.log('📊 Citas extraidas:', citas);
        
        if (error) {
            console.error('❌ Error:', error);
            throw error;
        }
        
        // Si no hay citas, muestra mensaje alternativo
        if (!citas || citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">📭 No hay citas</td></tr>';
            const elem = document.getElementById('totalCitas');
            if (elem) elem.textContent = '0';
            return;
        }
        
        console.log('✅ Citas encontradas:', citas.length);
        tbody.innerHTML = '';
        
        // Genera una fila por cada cita con botones de accion
        citas.forEach(cita => {
            const tr = document.createElement('tr');
            const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-CR');
            
            tr.innerHTML = `
                <td><strong>#${cita.id}</strong></td>
                <td>${fecha}</td>
                <td>${cita.hora_cita || 'N/A'}</td>
                <td>${cita.nombre || 'Cliente'}</td>
                <td>${cita.email || 'Sin email'}</td>
                <td>${cita.telefono || 'Sin telefono'}</td>
                <td>${cita.marca || ''} ${cita.modelo || ''}</td>
                <td><span class="badge">${cita.placa || 'N/A'}</span></td>
                <td>
                    <button onclick="verDetalleCita(${cita.id})" class="boton boton-secundario boton-pequeno" style="margin-right: 3px;">👁️</button>
                    <button onclick="modificarCitaAdmin(${cita.id})" class="boton boton-secundario boton-pequeno" style="margin-right: 3px;">✏️</button>
                    <button onclick="eliminarCitaAdmin(${cita.id})" class="boton boton-peligro boton-pequeno">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Actualiza contador de total de citas
        const elem = document.getElementById('totalCitas');
        if (elem) elem.textContent = citas.length;
        console.log('✅ Tabla actualizada con', citas.length, 'citas');
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

// FUNCION GLOBAL: Ver detalle de una cita en modal
window.verDetalleCita = async (id) => {
    const response = await supabase.from('citas').select('*').eq('id', id).single();
    const {  cita, error } = response;
    
    if (error || !cita) {
        Swal.fire('Error', 'Cita no encontrada', 'error');
        return;
    }
    
    // Formatea fecha para mostrar
    const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-CR', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Muestra modal con informacion completa
    Swal.fire({
        title: '📋 Detalle de Cita #' + cita.id,
        html: `
            <div style="text-align: left;">
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Hora:</strong> ${cita.hora_cita}</p>
                <hr style="margin: 10px 0;">
                <p><strong>Cliente:</strong> ${cita.nombre}</p>
                <p><strong>Email:</strong> ${cita.email}</p>
                <p><strong>Telefono:</strong> ${cita.telefono}</p>
                <hr style="margin: 10px 0;">
                <p><strong>Vehiculo:</strong> ${cita.marca} ${cita.modelo}</p>
                <p><strong>Placa:</strong> ${cita.placa}</p>
                <p><strong>Tipo:</strong> ${cita.tipo_vehiculo}</p>
            </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#10CFC8'
    });
};

// FUNCION GLOBAL: Eliminar cita con confirmacion
window.eliminarCitaAdmin = async (id) => {
    // Pide confirmacion antes de eliminar
    const result = await Swal.fire({
        title: '¿Eliminar cita?',
        text: "Esta accion no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EB6763',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        // Elimina la cita en Supabase
        const { error } = await supabase.from('citas').delete().eq('id', id);
        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire('Eliminada', 'La cita ha sido eliminada', 'success');
            cargarTodasLasCitas();  // Recarga la tabla
            cargarEstadisticas();   // Actualiza estadisticas
        }
    }
};

// FUNCION GLOBAL: Modificar cita (editar fecha, hora, telefono)
window.modificarCitaAdmin = async (id) => {
    // Obtiene datos actuales de la cita
    const response = await supabase.from('citas').select('*').eq('id', id).single();
    const {  cita, error } = response;
    
    if (error || !cita) {
        Swal.fire('Error', 'Cita no encontrada', 'error');
        return;
    }
    
    // Muestra modal con formulario de edicion
    const { value: formValues } = await Swal.fire({
        title: '✏️ Modificar Cita #' + cita.id,
        html: `
            <div style="text-align: left;">
                <label style="display:block; margin-bottom:5px;"><strong>Fecha:</strong></label>
                <input id="swal-fecha" class="swal2-input" type="date" value="${cita.fecha_cita}">
                
                <label style="display:block; margin-bottom:5px;"><strong>Hora:</strong></label>
                <select id="swal-hora" class="swal2-input">
                    ${['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map(h => 
                        `<option value="${h}" ${cita.hora_cita === h ? 'selected' : ''}>${h}</option>`
                    ).join('')}
                </select>
                
                <label style="display:block; margin-bottom:5px;"><strong>Telefono:</strong></label>
                <input id="swal-telefono" class="swal2-input" type="tel" value="${cita.telefono || ''}">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '💾 Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10CFC8',
        preConfirm: () => ({
            fecha_cita: document.getElementById('swal-fecha').value,
            hora_cita: document.getElementById('swal-hora').value,
            telefono: document.getElementById('swal-telefono').value
        })
    });
    
    // Si confirmo, actualiza en Supabase
    if (formValues) {
        const { error } = await supabase
            .from('citas')
            .update({
                fecha_cita: formValues.fecha_cita,
                hora_cita: formValues.hora_cita,
                telefono: formValues.telefono
            })
            .eq('id', id);
        
        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire('Actualizada', 'La cita ha sido modificada', 'success');
            cargarTodasLasCitas();  // Recarga la tabla
            cargarEstadisticas();   // Actualiza estadisticas
        }
    }
};

console.log('✅ Dashboard listo');