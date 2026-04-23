import { supabase } from "./supabase.js";

console.log('✅ Dashboard cliente cargado');

let usuarioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Iniciando dashboard cliente...');
    
    const respuesta = await supabase.auth.getUser();
    const user = respuesta.data.user;
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    usuarioActual = user;
    console.log('✅ Usuario logueado:', user.email);
    
    await cargarInfoPerfil();
    console.log('✅ Dashboard listo');
});

async function cargarInfoPerfil() {
    const respuesta = await supabase
        .from('perfiles')
        .select('nombre_completo, email')
        .eq('id', usuarioActual.id)
        .single();
    
    const perfil = respuesta.data;
    
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) {
        userNameEl.textContent = perfil?.nombre_completo || 'Cliente';
    }
    if (userEmailEl) {
        userEmailEl.textContent = perfil?.email || usuarioActual.email;
    }
}

window.cargarMisCitas = async () => {
    console.log('📋 Cargando mis citas...');
    
    const seccionMisCitas = document.getElementById('seccionMisCitas');
    const tbody = document.getElementById('tbodyCitasCliente');
    
    if (!seccionMisCitas || !tbody) {
        console.error('❌ Elementos no encontrados');
        return;
    }
    
    const seccionFacturas = document.getElementById('seccionMisFacturas');
    if (seccionFacturas) {
        seccionFacturas.style.display = 'none';
    }
    
    seccionMisCitas.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">⏳ Cargando...</td></tr>';
    
    try {
        const respuesta = await supabase
            .from('citas')
            .select('*')
            .eq('id_usuario', usuarioActual?.id)
            .order('fecha_cita', { ascending: false });
        
        const citas = respuesta.data;
        const error = respuesta.error;
        
        if (error) throw error;
        
        if (!citas || citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">📭 No tienes citas agendadas</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        citas.forEach(cita => {
            const tr = document.createElement('tr');
            const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-CR');
            
            tr.innerHTML = `
                <td><strong>#${cita.id}</strong></td>
                <td>${fecha}</td>
                <td>${cita.hora_cita || 'N/A'}</td>
                <td>${cita.tipo_vehiculo || 'N/A'}</td>
                <td>${cita.marca || ''} ${cita.modelo || ''}</td>
                <td><span class="badge">${cita.placa || 'N/A'}</span></td>
                <td>Pendiente</td>
                <td>
                    <button onclick="verDetalleCita(${cita.id})" class="boton boton-secundario boton-pequeno" style="margin-right: 5px;">👁️</button>
                    <button onclick="eliminarCita(${cita.id})" class="boton boton-peligro boton-pequeno">🗑️</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        seccionMisCitas.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ Citas cargadas:', citas.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
};

window.cargarMisFacturas = async () => {
    console.log('💰 Cargando mis facturas...');
    
    const seccionFacturas = document.getElementById('seccionMisFacturas');
    const tbody = document.getElementById('tbodyFacturasCliente');
    
    if (!seccionFacturas || !tbody) {
        console.error('❌ Elementos no encontrados');
        return;
    }
    
    const seccionCitas = document.getElementById('seccionMisCitas');
    if (seccionCitas) {
        seccionCitas.style.display = 'none';
    }
    
    seccionFacturas.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">⏳ Cargando...</td></tr>';
    
    try {
        const respuesta = await supabase
            .from('facturas')
            .select(`
                *,
                citas (
                    fecha_cita,
                    hora_cita,
                    marca,
                    modelo,
                    placa
                )
            `)
            .eq('id_usuario', usuarioActual?.id)
            .order('fecha_emision', { ascending: false });
        
        const facturas = respuesta.data;
        const error = respuesta.error;
        
        if (error) throw error;
        
        if (!facturas || facturas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">📭 No tienes facturas</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        facturas.forEach(factura => {
            const tr = document.createElement('tr');
            const fecha = new Date(factura.fecha_emision).toLocaleDateString('es-CR');
            const cita = factura.citas;
            
            let estadoColor = factura.estado === 'pagada' ? '#28a745' : '#FFA500';
            let estadoIcon = factura.estado === 'pagada' ? '✅' : '⏳';
            
            tr.innerHTML = `
                <td><strong>#${factura.id}</strong></td>
                <td>${fecha}</td>
                <td>${factura.detalles?.tipo_servicio || 'N/A'}</td>
                <td>${cita?.marca || ''} ${cita?.modelo || ''}<br><small>${cita?.placa || ''}</small></td>
                <td><strong>₡${factura.monto_total.toLocaleString()}</strong></td>
                <td><span style="color: ${estadoColor}; font-weight: 700;">${estadoIcon} ${factura.estado}</span></td>
                <td>
                    <button onclick="verFactura(${factura.id})" class="boton boton-secundario boton-pequeno">👁️</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        seccionFacturas.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ Facturas cargadas:', facturas.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
};

window.verDetalleCita = async (id) => {
    const respuesta = await supabase
        .from('citas')
        .select('*')
        .eq('id', id)
        .eq('id_usuario', usuarioActual.id)
        .single();
    
    const cita = respuesta.data;
    
    if (!cita) {
        Swal.fire('Error', 'Cita no encontrada', 'error');
        return;
    }
    
    const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    Swal.fire({
        title: '📋 Detalle de Cita',
        html: `
            <div style="text-align: left;">
                <p><strong>ID:</strong> ${cita.id}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Hora:</strong> ${cita.hora_cita}</p>
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

window.eliminarCita = async (id) => {
    const result = await Swal.fire({
        title: '¿Eliminar cita?',
        text: "Esta accion no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EB6763',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'No'
    });
    
    if (result.isConfirmed) {
        const { error } = await supabase
            .from('citas')
            .delete()
            .eq('id', id);
        
        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire('Eliminada', 'La cita ha sido eliminada', 'success');
            cargarMisCitas();
        }
    }
};

window.verFactura = async (id) => {
    const respuesta = await supabase
        .from('facturas')
        .select(`
            *,
            citas (
                fecha_cita,
                hora_cita,
                marca,
                modelo,
                placa,
                tipo_vehiculo
            ),
            perfiles (
                nombre_completo,
                email,
                telefono
            )
        `)
        .eq('id', id)
        .single();
    
    const factura = respuesta.data;
    
    if (!factura) {
        Swal.fire('Error', 'Factura no encontrada', 'error');
        return;
    }
    
    const fecha = new Date(factura.fecha_emision).toLocaleDateString('es-CR');
    const cita = factura.citas;
    const cliente = factura.perfiles;
    
    Swal.fire({
        title: '📄 Factura #' + factura.id,
        html: `
            <div style="text-align: left; font-size: 14px;">
                <h3 style="margin-bottom: 15px; color: #10CFC8;">Revisión Técnica Vehicular</h3>
                <hr style="margin: 10px 0;">
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Estado:</strong> ${factura.estado}</p>
                <hr style="margin: 10px 0;">
                <h4>Cliente:</h4>
                <p>${cliente?.nombre_completo || 'N/A'}</p>
                <p>${cliente?.email || ''}</p>
                <p>${cliente?.telefono || ''}</p>
                <hr style="margin: 10px 0;">
                <h4>Vehiculo:</h4>
                <p>${cita?.marca || ''} ${cita?.modelo || ''}</p>
                <p>Placa: ${cita?.placa || ''}</p>
                <p>Cita: ${cita?.fecha_cita || ''} ${cita?.hora_cita || ''}</p>
                <hr style="margin: 10px 0;">
                <h4>Servicio:</h4>
                <p>${factura.detalles?.tipo_servicio || 'N/A'}</p>
                <hr style="margin: 10px 0;">
                <h2 style="text-align: right; color: #10CFC8;">Total: ₡${factura.monto_total.toLocaleString()}</h2>
            </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#10CFC8',
        width: 600
    });
};

window.editarPerfil = async () => {
    Swal.fire('Editar Perfil', 'Funcion en desarrollo', 'info');
};

console.log('✅ app-dashboard-cliente.js cargado completamente');