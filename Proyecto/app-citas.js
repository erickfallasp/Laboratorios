/**
 * ==========================================
 * SISTEMA DE CITAS - LÓGICA PRINCIPAL
 * ==========================================
 * Este archivo maneja:
 * 1. Validación de horas disponibles
 * 2. Envío del formulario
 * 3. Guardado en Supabase
 * 4. Alertas con SweetAlert2
 */

// Importamos el cliente de Supabase desde nuestro módulo
import { supabase } from "./supabase.js";

// Mensaje de confirmación de carga
console.log('✅ Cargando app-citas.js');
console.log('🔗 Supabase:', supabase);

/**
 * ==========================================
 * ESPERAR A QUE EL DOM ESTÉ LISTO
 * ==========================================
 * Este evento se dispara cuando el HTML
 * está completamente cargado
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded disparado');
    
    // Obtenemos referencias a los elementos del formulario
    const formulario = document.getElementById('citaForm');
    const entradaFecha = document.getElementById('fechaCita');
    const selectorHora = document.getElementById('horaCita');
    
    // Verificamos que los elementos existan
    console.log('📝 Elementos:', {
        formulario: !!formulario,
        entradaFecha: !!entradaFecha,
        selectorHora: !!selectorHora
    });
    
    // Si no existe el formulario, mostramos error
    if (!formulario) {
        console.error('❌ ERROR: No se encontró el formulario #citaForm');
        return;
    }
    
    /**
     * ==========================================
     * VALIDAR HORAS DISPONIBLES
     * ==========================================
     * Cuando el usuario cambia la fecha, consultamos
     * a Supabase qué horas ya están ocupadas
     */
    if (entradaFecha && selectorHora) {
        console.log('✅ Agregando listener para cambio de fecha');
        
        // Evento que se dispara al cambiar la fecha
        entradaFecha.addEventListener('change', async () => {
            const fecha = entradaFecha.value;
            console.log('📅 Fecha seleccionada:', fecha);
            
            // Si no hay fecha, salimos
            if (!fecha) return;
            
            // Deshabilitamos el selector mientras cargamos
            selectorHora.disabled = true;
            selectorHora.innerHTML = '<option>⏳ Cargando...</option>';
            
            try {
                console.log('🔍 Consultando Supabase...');
                
                /**
                 * CONSULTA A SUPABASE
                 * Buscamos todas las citas para la fecha seleccionada
                 * y solo traemos el campo 'hora_cita'
                 */
                const { data: citas, error } = await supabase
                    .from('citas')           // Tabla a consultar
                    .select('hora_cita')     // Campos a traer
                    .eq('fecha_cita', fecha); // Filtro: fecha = fecha seleccionada
                
                console.log('📊 Respuesta:', { citas, error });
                
                // Si hay error en la consulta, lo lanzamos
                if (error) {
                    console.error('❌ Error en consulta:', error);
                    throw error;
                }
                
                /**
                 * EXTRAER HORAS OCUPADAS
                 * Convertimos el array de objetos a un array
                 * simple con solo las horas
                 * Ej: [{hora_cita: "08:00"}, {hora_cita: "10:00"}]
                 *     => ["08:00", "10:00"]
                 */
                const horasOcupadas = citas?.map(c => c.hora_cita) || [];
                console.log('🚫 Horas ocupadas:', horasOcupadas);
                
                // Lista completa de horas disponibles (8 AM - 4 PM)
                const horasDisponibles = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
                
                // Limpiamos el selector
                selectorHora.innerHTML = '<option value="">-- Seleccione --</option>';
                
                /**
                 * GENERAR OPCIONES DEL SELECTOR
                 * Por cada hora, creamos una opción que puede ser:
                 * - Disponible (habilitada)
                 * - Ocupada (deshabilitada y con texto "OCUPADA")
                 */
                horasDisponibles.forEach(hora => {
                    const opcion = document.createElement('option');
                    opcion.value = hora;
                    
                    if (horasOcupadas.includes(hora)) {
                        // Hora ocupada: deshabilitar y marcar
                        opcion.disabled = true;
                        opcion.textContent = `❌ ${hora} - OCUPADA`;
                    } else {
                        // Hora disponible: habilitada
                        opcion.textContent = `${hora} - DISPONIBLE`;
                    }
                    
                    selectorHora.appendChild(opcion);
                });
                
                // Habilitamos el selector nuevamente
                selectorHora.disabled = false;
                console.log('✅ Selector de horas actualizado');
                
            } catch (error) {
                // Manejo de errores en la consulta
                console.error('❌ Error en cambio:', error);
                selectorHora.innerHTML = '<option>Error</option>';
                selectorHora.disabled = false;
            }
        });
    }
    
    /**
     * ==========================================
     * ENVÍO DEL FORMULARIO
     * ==========================================
     * Cuando el usuario hace clic en "Agendar Cita",
     * validamos y guardamos en Supabase
     */
    console.log('✅ Agregando listener para enviar formulario');
    
    formulario.addEventListener('submit', async (evento) => {
        // Prevenir comportamiento por defecto (recarga de página)
        evento.preventDefault();
        console.log('📝 Formulario enviado');
        
        /**
         * VALIDAR TIPO DE VEHÍCULO
         * Buscamos el radio button seleccionado
         */
        const tipoVehiculo = document.querySelector('input[name="tipoVehiculo"]:checked');
        
        if (!tipoVehiculo) {
            console.warn('⚠️ No se seleccionó tipo de vehículo');
            Swal.fire({
                icon: 'warning',
                title: 'Campo incompleto',
                text: 'Seleccione tipo de vehículo'
            });
            return; // Detenemos el proceso
        }
        
        /**
         * RECOPILAR DATOS DEL FORMULARIO
         * Obtenemos todos los valores de los inputs
         */
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
        
        console.log('📋 Datos:', datosCita);
        
        try {
            console.log('⏳ Mostrando loading...');
            
            /**
             * MOSTRAR LOADING
             * SweetAlert2 con animación de carga
             */
            Swal.fire({
                titulo: '⏳ Agendando...',
                texto: 'Espere...',
                allowOutsideClick: false, // No se puede cerrar haciendo clic fuera
                didOpen: () => {
                    console.log('🔄 Loading mostrado');
                    Swal.showLoading(); // Mostrar animación
                }
            });
            
            console.log('🚀 Insertando en Supabase...');
            
            /**
             * INSERTAR EN SUPABASE
             * Guardamos los datos en la tabla 'citas'
             */
            const resultado = await supabase
                .from('citas')      // Tabla
                .insert([datosCita]);   // Datos a insertar (array de objetos)
            
            console.log('📥 Respuesta de Supabase:', resultado);
            
            // Extraemos datos y error de la respuesta
            const { data, error } = resultado;
            
            // Si hay error, lo lanzamos para que lo capture el catch
            if (error) {
                console.error('❌ Error de Supabase:', error);
                console.error('❌ Detalles:', error.details);
                console.error('❌ Pista:', error.hint);
                throw error;
            }
            
            console.log('✅ Cita guardada:', data);
            
            // Cerramos el loading
            Swal.close();
            
            /**
             * MOSTRAR ÉXITO
             * Alerta bonita con los datos de la cita
             */
            await Swal.fire({
                icon: 'success',
                title: '✅ ¡Cita Agendada!',
                text: `${datosCita.nombre} - ${datosCita.placa}`,
                confirmButtonText: 'Ver citas'
            });
            
            /**
             * LIMPIAR FORMULARIO
             * Reseteamos todos los campos
             */
            formulario.reset();
            selectorHora.innerHTML = '<option value="">-- Seleccione --</option>';
            entradaFecha.value = '';
            
            /**
             * REDIRECCIONAR
             * Después de 1 segundo, vamos a la página de citas agendadas
             */
            setTimeout(() => {
                console.log('🔄 Redirigiendo...');
                window.location.href = 'citas-agendadas.html';
            }, 1000);
            
        } catch (error) {
            /**
             * MANEJO DE ERRORES
             * Si algo falla, mostramos el error al usuario
             */
            console.error('❌ ERROR EN ENVÍO:', error);
            console.error('❌ Mensaje:', error.message);
            
            // Cerramos loading si está abierto
            Swal.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonText: 'Aceptar'
            });
        }
    });
    
    console.log('✅ Configuración completada');
});