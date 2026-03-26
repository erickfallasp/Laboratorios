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
    const form = document.getElementById('citaForm');
    const fechaInput = document.getElementById('fechaCita');
    const horaSelect = document.getElementById('horaCita');
    
    // Verificamos que los elementos existan
    console.log('📝 Elementos:', {
        form: !!form,
        fechaInput: !!fechaInput,
        horaSelect: !!horaSelect
    });
    
    // Si no existe el formulario, mostramos error
    if (!form) {
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
    if (fechaInput && horaSelect) {
        console.log('✅ Agregando listener para cambio de fecha');
        
        // Evento que se dispara al cambiar la fecha
        fechaInput.addEventListener('change', async () => {
            const fecha = fechaInput.value;
            console.log('📅 Fecha seleccionada:', fecha);
            
            // Si no hay fecha, salimos
            if (!fecha) return;
            
            // Deshabilitamos el select mientras cargamos
            horaSelect.disabled = true;
            horaSelect.innerHTML = '<option>⏳ Cargando...</option>';
            
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
                const ocupadas = citas?.map(c => c.hora_cita) || [];
                console.log('🚫 Horas ocupadas:', ocupadas);
                
                // Lista completa de horas disponibles (8 AM - 4 PM)
                const horas = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
                
                // Limpiamos el select
                horaSelect.innerHTML = '<option value="">-- Seleccione --</option>';
                
                /**
                 * GENERAR OPCIONES DEL SELECT
                 * Por cada hora, creamos una opción que puede ser:
                 * - Disponible (habilitada)
                 * - Ocupada (deshabilitada y con texto "OCUPADA")
                 */
                horas.forEach(hora => {
                    const option = document.createElement('option');
                    option.value = hora;
                    
                    if (ocupadas.includes(hora)) {
                        // Hora ocupada: deshabilitar y marcar
                        option.disabled = true;
                        option.textContent = `❌ ${hora} - OCUPADA`;
                    } else {
                        // Hora disponible: habilitada
                        option.textContent = `${hora} - DISPONIBLE`;
                    }
                    
                    horaSelect.appendChild(option);
                });
                
                // Habilitamos el select nuevamente
                horaSelect.disabled = false;
                console.log('✅ Select de horas actualizado');
                
            } catch (err) {
                // Manejo de errores en la consulta
                console.error('❌ Error en change:', err);
                horaSelect.innerHTML = '<option>Error</option>';
                horaSelect.disabled = false;
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
    console.log('✅ Agregando listener para submit');
    
    form.addEventListener('submit', async (e) => {
        // Prevenir comportamiento por defecto (recarga de página)
        e.preventDefault();
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
        const datos = {
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
        
        console.log('📋 Datos:', datos);
        
        try {
            console.log('⏳ Mostrando loading...');
            
            /**
             * MOSTRAR LOADING
             * SweetAlert2 con animación de carga
             */
            Swal.fire({
                title: '⏳ Agendando...',
                text: 'Espere...',
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
            const result = await supabase
                .from('citas')      // Tabla
                .insert([datos]);   // Datos a insertar (array de objetos)
            
            console.log('📥 Respuesta de Supabase:', result);
            
            // Extraemos data y error de la respuesta
            const { data, error } = result;
            
            // Si hay error, lo lanzamos para que lo capture el catch
            if (error) {
                console.error('❌ Error de Supabase:', error);
                console.error('❌ Detalles:', error.details);
                console.error('❌ Hint:', error.hint);
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
                text: `${datos.nombre} - ${datos.placa}`,
                confirmButtonText: 'Ver citas'
            });
            
            /**
             * LIMPIAR FORMULARIO
             * Reseteamos todos los campos
             */
            form.reset();
            horaSelect.innerHTML = '<option value="">-- Seleccione --</option>';
            fechaInput.value = '';
            
            /**
             * REDIRECCIONAR
             * Después de 1 segundo, vamos a la página de citas agendadas
             */
            setTimeout(() => {
                console.log('🔄 Redirigiendo...');
                window.location.href = 'citas-agendadas.html';
            }, 1000);
            
        } catch (err) {
            /**
             * MANEJO DE ERRORES
             * Si algo falla, mostramos el error al usuario
             */
            console.error('❌ ERROR EN SUBMIT:', err);
            console.error('❌ Mensaje:', err.message);
            
            // Cerramos loading si está abierto
            Swal.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message,
                confirmButtonText: 'Aceptar'
            });
        }
    });
    
    console.log('✅ Setup completado');
});