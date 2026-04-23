/**
 * SISTEMA DE CITAS - CON FACTURACION AUTOMATICA
 * Proposito: Agendar citas, validar horas y generar facturas automaticamente
 */

import { supabase } from "./supabase.js"; // Importa cliente de Supabase

console.log('✅ Cargando app-citas.js');

let usuarioActual = null; // Almacena datos del usuario si esta logueado

// Se ejecuta cuando la pagina carga completamente
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado');
    
    // Verifica si hay usuario logueado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        usuarioActual = session.user; // Guarda datos del usuario
        console.log('✅ Usuario logueado:', usuarioActual.email);
    } else {
        console.log('⚠️ No hay usuario logueado, modo invitado');
    }
    
    // Obtiene referencias del formulario
    const formulario = document.getElementById('citaForm');
    const entradaFecha = document.getElementById('fechaCita');
    const selectorHora = document.getElementById('horaCita');
    
    // Configura validacion dinamica de horas disponibles
    if (entradaFecha && selectorHora) {
        console.log('✅ Agregando listener para cambio de fecha');
        
        // Se activa cuando el usuario cambia la fecha
        entradaFecha.addEventListener('change', async () => {
            const fecha = entradaFecha.value;
            console.log('📅 Fecha seleccionada:', fecha);
            
            if (!fecha) return;
            
            // Muestra estado de carga en el selector
            selectorHora.disabled = true;
            selectorHora.innerHTML = '<option>⏳ Cargando...</option>';
            
            try {
                console.log('🔍 Consultando Supabase...');
                
                // Consulta horas ya ocupadas para esa fecha
                const { data: citas, error } = await supabase
                    .from('citas')
                    .select('hora_cita')
                    .eq('fecha_cita', fecha);
                
                console.log('📊 Respuesta:', { citas, error });
                
                if (error) {
                    console.error('❌ Error en consulta:', error);
                    throw error;
                }
                
                // Extrae array de horas ocupadas
                const horasOcupadas = citas?.map(c => c.hora_cita) || [];
                console.log('🚫 Horas ocupadas:', horasOcupadas);
                
                // Horas disponibles del negocio
                const horasDisponibles = [
                    '08:00', '09:00', '10:00', '11:00',
                    '13:00', '14:00', '15:00', '16:00'
                ];
                
                // Regenera el selector de horas
                selectorHora.innerHTML = '<option value="">-- Seleccione --</option>';
                
                horasDisponibles.forEach(hora => {
                    const opcion = document.createElement('option');
                    opcion.value = hora;
                    
                    // Marca horas ocupadas como no seleccionables
                    if (horasOcupadas.includes(hora)) {
                        opcion.disabled = true;
                        opcion.textContent = `❌ ${hora} - OCUPADA`;
                    } else {
                        opcion.textContent = `${hora} - DISPONIBLE`;
                    }
                    
                    selectorHora.appendChild(opcion);
                });
                
                selectorHora.disabled = false;
                console.log('✅ Selector de horas actualizado');
                
            } catch (error) {
                console.error('❌ Error en cambio:', error);
                selectorHora.innerHTML = '<option>Error</option>';
                selectorHora.disabled = false;
            }
        });
    }
    
    // Configura envio del formulario
    console.log('✅ Agregando listener para enviar formulario');
    
    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault(); // Evita recarga tradicional
        console.log('📝 Formulario enviado');
        
        // Valida que se selecciono tipo de vehiculo
        const tipoVehiculo = document.querySelector('input[name="tipoVehiculo"]:checked');
        
        if (!tipoVehiculo) {
            console.warn('⚠️ No se selecciono tipo de vehiculo');
            Swal.fire({
                icon: 'warning',
                title: 'Campo incompleto',
                text: 'Seleccione tipo de vehiculo'
            });
            return;
        }
        
        // Captura datos del formulario
        const datosCita = {
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            tipo_vehiculo: tipoVehiculo.value,
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            anio: document.getElementById('anio').value.trim(),
            fecha_cita: document.getElementById('fechaCita').value,
            hora_cita: document.getElementById('horaCita').value
        };
        
        // Vincula con usuario logueado si aplica
        if (usuarioActual) {
            datosCita.id_usuario = usuarioActual.id;
            console.log('🔗 ID de usuario agregado:', usuarioActual.id);
        }
        
        console.log('📋 Datos a guardar:', datosCita);
        
        try {
            // Muestra indicador de carga
            Swal.fire({
                title: '⏳ Agendando...',
                text: 'Espere...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            console.log('🚀 Insertando en Supabase...');
            
            // Guarda cita en Supabase y retorna el ID generado
            const resultado = await supabase
                .from('citas')
                .insert([datosCita])
                .select('id');
            
            console.log('📥 Respuesta de Supabase:', resultado);
            
            const { data, error } = resultado;
            
            if (error) {
                console.error('❌ Error de Supabase:', error);
                throw error;
            }
            
            console.log('✅ Cita guardada:', data);
            
            // Genera factura automaticamente si se obtuvo el ID
            if (data && data.length > 0 && data[0].id) {
                console.log('💰 Generando factura...');
                
                const citaId = data[0].id;
                console.log('🔗 ID de cita creada:', citaId);
                
                // Calcula precio segun tipo de vehiculo
                let montoTotal = 0;
                switch(datosCita.tipo_vehiculo) {
                    case 'menor_3_5_ton':
                        montoTotal = 6000;
                        break;
                    case 'mayor_3_5_ton':
                        montoTotal = 7500;
                        break;
                    case 'motocicleta':
                        montoTotal = 7000;
                        break;
                    case 'servicio_publico':
                        montoTotal = 9000;
                        break;
                    case 'equipo_especial':
                        montoTotal = 5000;
                        break;
                    case 'autobus':
                        montoTotal = 7000;
                        break;
                    default:
                        montoTotal = 6000;
                }
                
                console.log('💵 Monto calculado: ₡' + montoTotal);
                
                // Crea registro en tabla de facturas
                const { error: errorFactura } = await supabase
                    .from('facturas')
                    .insert([{
                        id_cita: citaId,
                        id_usuario: usuarioActual ? usuarioActual.id : null,
                        monto_total: montoTotal,
                        estado: 'pendiente',
                        detalles: {
                            tipo_servicio: datosCita.tipo_vehiculo,
                            placa: datosCita.placa,
                            marca: datosCita.marca,
                            modelo: datosCita.modelo
                        }
                    }]);
                
                if (errorFactura) {
                    console.error('❌ Error al crear factura:', errorFactura);
                } else {
                    console.log('✅ Factura generada exitosamente por ₡' + montoTotal);
                }
            }
            
            // Finaliza proceso: feedback y redireccion
            Swal.close();
            
            // Muestra mensaje de exito
            await Swal.fire({
                icon: 'success',
                title: '✅ ¡Cita Agendada!',
                text: `${datosCita.nombre} - ${datosCita.placa}`,
                confirmButtonText: 'Ver citas'
            });
            
            // Limpia formulario
            formulario.reset();
            selectorHora.innerHTML = '<option value="">-- Seleccione --</option>';
            entradaFecha.value = '';
            
            // Redireccion segun estado de autenticacion
            if (usuarioActual) {
                console.log('🔄 Redirigiendo a dashboard cliente...');
                setTimeout(() => {
                    window.location.href = 'dashboard-cliente.html';
                }, 1000);
            } else {
                console.log('🔄 Redirigiendo a login...');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
            
        } catch (error) {
            // Manejo centralizado de errores
            console.error('❌ ERROR EN ENVIO:', error);
            console.error('❌ Mensaje:', error.message);
            
            Swal.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonText: 'Aceptar'
            });
        }
    });
    
    console.log('✅ Configuracion completada');
});