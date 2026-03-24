import { supabase } from "./supabase.js";

console.log('✅ Cargando app-citas-agendadas.js');

document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM cargado');
    cargarCitas();
});

const cargarCitas = async () => {
    console.log('🔍 Cargando citas...');
    
    const tbody = document.getElementById('tbodyCitas');
    const sinCitas = document.getElementById('sinCitas');
    const tabla = document.getElementById('tablaCitas');
    
    try {
        const {  data, error } = await supabase
            .from('citas')
            .select('*')
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true });
        
        console.log('📊 Respuesta:', { data, error });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.log('ℹ️ No hay citas');
            tabla.style.display = 'none';
            sinCitas.style.display = 'block';
            return;
        }
        
        console.log('✅ Citas encontradas:', data.length);
        
        tabla.style.display = 'table';
        sinCitas.style.display = 'none';
        tbody.innerHTML = '';
        
        data.forEach(cita => {
            const tr = document.createElement('tr');
            const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            
            tr.innerHTML = `
                <td>${fecha}</td>
                <td>${cita.hora_cita}</td>
                <td>${cita.nombre}</td>
                <td>${cita.telefono}</td>
                <td>${cita.marca} ${cita.modelo}</td>
                <td><span class="badge">${cita.placa}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarCita(${cita.id})">🗑️</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
};

window.eliminarCita = async (id) => {
    if (confirm('¿Eliminar cita?')) {
        const { error } = await supabase.from('citas').delete().eq('id', id);
        if (!error) cargarCitas();
    }
};