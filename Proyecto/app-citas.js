/**
 * ==========================================
 * SISTEMA DE CITAS - CON FACTURACIÓN AUTOMÁTICA
 * Archivo: app-citas.js
 * ==========================================
 * 
 * 🎯 PROPÓSITO DEL ARCHIVO:
 * Este es el "corazón" del sistema de agendamiento. Se encarga de:
 * 1. Mostrar disponibilidad de horas en tiempo real
 * 2. Validar y procesar el formulario de cita
 * 3. Guardar la cita en la base de datos (Supabase)
 * 4. Generar AUTOMÁTICAMENTE una factura con precio según vehículo
 * 5. Redirigir al usuario según si está logueado o no
 * 
 * 🔧 FUNCIONALIDADES CLAVE:
 * ✅ Validación en tiempo real de horas disponibles
 * ✅ Cálculo dinámico de precios según tipo de vehículo
 * ✅ Vinculación automática cita → factura
 * ✅ Experiencia de usuario con loading y alertas
 * 
 * 🔗 CONEXIONES CON OTROS ARCHIVOS:
 * - Importa 'supabase' desde supabase.js (configuración BD)
 * - Usa SweetAlert2 (CDN en HTML) para alertas profesionales
 * - Se conecta con tablas: public.citas y public.facturas
 * - Interactúa con app-auth.js para detectar usuario logueado
 * 
 * 📊 ESTRUCTURA DE DATOS - TABLA 'citas':
 * {
 *   id: bigint,           // ID único autoincremental
 *   nombre: text,         // Nombre del cliente
 *   email: text,          // Email de contacto
 *   telefono: text,       // Teléfono
 *   tipo_vehiculo: text,  // Categoría: menor_3_5_ton, motocicleta, etc.
 *   placa: text,          // Placa del vehículo (ej: ABC123)
 *   marca: text,          // Marca: Toyota, Honda, etc.
 *   modelo: text,         // Modelo: Corolla, Civic, etc.
 *   anio: text,           // Año del vehículo
 *   fecha_cita: date,     // Fecha programada (YYYY-MM-DD)
 *   hora_cita: text,      // Hora programada (HH:MM)
 *   id_usuario: uuid      // [OPCIONAL] ID si el cliente está logueado
 * }
 * 
 * 📊 ESTRUCTURA DE DATOS - TABLA 'facturas':
 * {
 *   id: bigint,           // ID único de factura
 *   id_cita: bigint,      // Relación con la cita (FOREIGN KEY)
 *   id_usuario: uuid,     // Cliente asociado
 *   monto_total: numeric, // Precio calculado (ej: 7500)
 *   estado: text,         // 'pendiente' o 'pagada'
 *   detalles: jsonb,      // Info extra: {tipo_servicio, placa, marca, modelo}
 *   fecha_emision: timestamp // Fecha/hora de creación
 * }
 */

// ==========================================
// IMPORTAR DEPENDENCIAS
// ==========================================
// Importamos el cliente de Supabase configurado en supabase.js
// Esto nos permite hacer consultas a la base de datos en la nube
import { supabase } from "./supabase.js";

// Mensaje de confirmación en consola (útil para depuración durante desarrollo)
console.log('✅ Cargando app-citas.js');

// ==========================================
// VARIABLE GLOBAL: USUARIO ACTUAL
// ==========================================
// Almacena la información del usuario si está logueado
// Se usa para: vincular citas al usuario y generar facturas personales
let usuarioActual = null;

// ==========================================
// EVENTO PRINCIPAL: AL CARGAR LA PÁGINA
// ==========================================
// Este código se ejecuta cuando el HTML está completamente cargado
// y es seguro manipular los elementos del formulario
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado');
    
    // ==========================================
    // PASO 1: VERIFICAR SI HAY USUARIO LOGUEADO
    // ==========================================
    // Preguntamos a Supabase: "¿Hay alguna sesión activa?"
    // Esto nos permite personalizar la experiencia:
    // - Si está logueado: vinculamos la cita a su cuenta
    // - Si es invitado: guardamos solo los datos del formulario
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // ✅ Usuario autenticado: guardamos su información
        usuarioActual = session.user;
        console.log('✅ Usuario logueado:', usuarioActual.email);
    } else {
        // ⚠️ Usuario invitado: modo público
        console.log('⚠️ No hay usuario logueado, modo invitado');
    }
    
    // ==========================================
    // PASO 2: OBTENER REFERENCIAS DEL FORMULARIO
    // ==========================================
    // Buscamos los elementos HTML por sus IDs para manipularlos
    const formulario = document.getElementById('citaForm');        // Formulario completo
    const entradaFecha = document.getElementById('fechaCita');     // Input de fecha
    const selectorHora = document.getElementById('horaCita');      // Select de horas
    
    // ==========================================
    // PASO 3: VALIDACIÓN DINÁMICA DE HORAS
    // ==========================================
    // Si existen los elementos de fecha y hora, configuramos la lógica
    // que actualiza las horas disponibles cuando el usuario cambia la fecha
    if (entradaFecha && selectorHora) {
        console.log('✅ Agregando listener para cambio de fecha');
        
        // "Escuchador" de eventos: se activa cada vez que el usuario
        // selecciona una fecha diferente en el calendario
        entradaFecha.addEventListener('change', async () => {
            const fecha = entradaFecha.value;  // Ej: "2026-04-25"
            console.log('📅 Fecha seleccionada:', fecha);
            
            // Si no hay fecha válida, salimos
            if (!fecha) return;
            
            // ==========================================
            // MOSTRAR ESTADO DE CARGA EN EL SELECT
            // ==========================================
            // Deshabilitamos el selector y mostramos "Cargando..."
            // para que el usuario sepa que estamos consultando disponibilidad
            selectorHora.disabled = true;
            selectorHora.innerHTML = '<option>⏳ Cargando...</option>';
            
            try {
                console.log('🔍 Consultando Supabase...');
                
                /**
                 * ==========================================
                 * CONSULTA: ¿QUÉ HORAS YA ESTÁN OCUPADAS?
                 * ==========================================
                 * CONSULTA SQL EQUIVALENTE:
                 * SELECT hora_cita FROM citas WHERE fecha_cita = '2026-04-25';
                 * 
                 * PROPÓSITO:
                 * Evitar que dos clientes agenden la misma hora en el mismo día
                 * (previene doble reserva / overbooking)
                 */
                const { data: citas, error } = await supabase
                    .from('citas')                    // 📦 Tabla de citas
                    .select('hora_cita')              // 📋 Solo necesitamos la columna de hora
                    .eq('fecha_cita', fecha);         // 🔍 Filtrar por la fecha seleccionada
                
                console.log('📊 Respuesta:', { citas, error });
                
                // Si hay error en la consulta, lo manejamos
                if (error) {
                    console.error('❌ Error en consulta:', error);
                    throw error;
                }
                
                /**
                 * ==========================================
                 * PROCESAR HORAS OCUPADAS
                 * ==========================================
                 * .map() transforma el array de objetos en un array simple de strings
                 * Ej: [{hora_cita: "08:00"}, {hora_cita: "10:00"}] → ["08:00", "10:00"]
                 * 
                 * El operador ?? [] asegura que si citas es null, usamos array vacío
                 */
                const horasOcupadas = citas?.map(c => c.hora_cita) || [];
                console.log('🚫 Horas ocupadas:', horasOcupadas);
                
                /**
                 * ==========================================
                 * HORAS DISPONIBLES DEL NEGOCIO
                 * ==========================================
                 * Definimos el horario de atención del taller
                 * (podría venir de una tabla de configuración en producción)
                 */
                const horasDisponibles = [
                    '08:00', '09:00', '10:00', '11:00',   // Mañana
                    '13:00', '14:00', '15:00', '16:00'    // Tarde (con pausa de 12-13)
                ];
                
                // ==========================================
                // REGENERAR EL SELECT DE HORAS
                // ==========================================
                // Limpiamos el selector antes de llenarlo de nuevo
                selectorHora.innerHTML = '<option value="">-- Seleccione --</option>';
                
                // Por cada hora disponible en el horario del negocio...
                horasDisponibles.forEach(hora => {
                    // Creamos una nueva opción <option>
                    const opcion = document.createElement('option');
                    opcion.value = hora;  // Valor que se enviará al servidor
                    
                    // ==========================================
                    // MARCAR HORAS OCUPADAS COMO NO SELECCIONABLES
                    // ==========================================
                    if (horasOcupadas.includes(hora)) {
                        // Si la hora ya está reservada:
                        opcion.disabled = true;  // No se puede seleccionar
                        opcion.textContent = `❌ ${hora} - OCUPADA`;  // Texto informativo
                    } else {
                        // Si está libre:
                        opcion.textContent = `${hora} - DISPONIBLE`;  // Texto positivo
                    }
                    
                    // Agregamos la opción al selector
                    selectorHora.appendChild(opcion);
                });
                
                // Habilitamos el selector para que el usuario pueda elegir
                selectorHora.disabled = false;
                console.log('✅ Selector de horas actualizado');
                
            } catch (error) {
                // ==========================================
                // MANEJO DE ERRORES EN LA CONSULTA
                // ==========================================
                console.error('❌ Error en cambio:', error);
                
                // Mostramos un mensaje de error en el selector
                selectorHora.innerHTML = '<option>Error</option>';
                
                // Habilitamos el selector para que el usuario pueda intentar de nuevo
                selectorHora.disabled = false;
            }
        });
    }
    
    // ==========================================
    // PASO 4: CONFIGURAR ENVÍO DEL FORMULARIO
    // ==========================================
    console.log('✅ Agregando listener para enviar formulario');
    
    // "Escuchador" que se activa cuando el usuario hace clic en "Agendar Cita"
    formulario.addEventListener('submit', async (evento) => {
        // ==========================================
        // PREVENIR COMPORTAMIENTO POR DEFECTO
        // ==========================================
        // Por defecto, los formularios recargan la página al enviarse
        // preventDefault() evita eso para que JavaScript controle el proceso
        evento.preventDefault();
        console.log('📝 Formulario enviado');
        
        // ==========================================
        // VALIDACIÓN 1: TIPO DE VEHÍCULO SELECCIONADO
        // ==========================================
        // Buscamos el radio button marcado del grupo "tipoVehiculo"
        const tipoVehiculo = document.querySelector('input[name="tipoVehiculo"]:checked');
        
        // Si no seleccionaron tipo de vehículo, mostramos alerta y detenemos
        if (!tipoVehiculo) {
            console.warn('⚠️ No se seleccionó tipo de vehículo');
            Swal.fire({
                icon: 'warning',
                title: 'Campo incompleto',
                text: 'Seleccione tipo de vehículo'
            });
            return;  // Detenemos el envío
        }
        
        /**
         * ==========================================
         * CAPTURAR TODOS LOS DATOS DEL FORMULARIO
         * ==========================================
         * Creamos un objeto con toda la información que el usuario ingresó
         * .value → Obtiene el texto escrito
         * .trim() → Elimina espacios en blanco al inicio/final
         * .toUpperCase() → Convierte placa a mayúsculas (estándar)
         */
        const datosCita = {
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            tipo_vehiculo: tipoVehiculo.value,  // Ej: "menor_3_5_ton"
            placa: document.getElementById('placa').value.trim().toUpperCase(),  // ABC123
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            anio: document.getElementById('anio').value.trim(),
            fecha_cita: document.getElementById('fechaCita').value,  // 2026-04-25
            hora_cita: document.getElementById('horaCita').value     // 10:00
        };
        
        // ==========================================
        // VINCULAR CON USUARIO LOGUEADO (si aplica)
        // ==========================================
        // Si el cliente inició sesión, agregamos su ID para:
        // - Que vea sus citas en el dashboard personal
        // - Que las facturas se asocien a su cuenta
        // - Aplicar políticas de seguridad RLS de Supabase
        if (usuarioActual) {
            datosCita.id_usuario = usuarioActual.id;
            console.log('🔗 ID de usuario agregado:', usuarioActual.id);
        }
        
        console.log('📋 Datos a guardar:', datosCita);
        
        // ==========================================
        // PROCESO PRINCIPAL: GUARDAR CITA + FACTURA
        // ==========================================
        // Todo lo que puede fallar va dentro de try-catch
        try {
            console.log('⏳ Mostrando loading...');
            
            // ==========================================
            // MOSTRAR INDICADOR DE PROCESO
            // ==========================================
            // SweetAlert2 muestra una alerta con animación de carga
            // allowOutsideClick: false → El usuario debe esperar a que termine
            Swal.fire({
                title: '⏳ Agendando...',
                text: 'Espere...',
                allowOutsideClick: false,
                didOpen: () => {
                    console.log('🔄 Loading mostrado');
                    Swal.showLoading();  // Activa la animación de spinner
                }
            });
            
            console.log('🚀 Insertando en Supabase...');
            
            /**
             * ==========================================
             * GUARDAR CITA EN SUPABASE
             * ==========================================
             * CONSULTA SQL EQUIVALENTE:
             * INSERT INTO citas (nombre, email, ..., fecha_cita, hora_cita)
             * VALUES (...)
             * RETURNING id;
             * 
             * DETALLES TÉCNICOS:
             * .insert([datosCita]) → Inserta el objeto como nueva fila
             * .select('id') → IMPORTANTE: Pide que Supabase retorne el ID generado
             * 
             * ¿Por qué .select('id') es CRÍTICO?
             * Porque necesitamos ese ID para crear la factura relacionada.
             * Sin esto, data sería null y no podríamos vincular cita→factura.
             */
            const resultado = await supabase
                .from('citas')           // 📦 Tabla destino
                .insert([datosCita])     // 📝 Datos a insertar (en array)
                .select('id');           // 🔑 Retornar el ID generado (CLAVE PARA FACTURA)
            
            console.log('📥 Respuesta de Supabase:', resultado);
            
            // Extraemos data y error de la respuesta
            const { data, error } = resultado;
            
            // Si hubo error (validación, red, permisos, etc.)
            if (error) {
                console.error('❌ Error de Supabase:', error);
                console.error('❌ Detalles:', error.details);
                throw error;  // Lanzamos para manejar en catch
            }
            
            console.log('✅ Cita guardada:', data);
            
            /**
             * ==========================================
             * 🎯 GENERACIÓN AUTOMÁTICA DE FACTURA
             * ==========================================
             * Esta es la funcionalidad ESTRELLA del sistema:
             * Al crear una cita, automáticamente se genera su factura
             * con el precio calculado según el tipo de vehículo.
             */
            if (data && data.length > 0 && data[0].id) {
                console.log('💰 Generando factura...');
                
                // Obtenemos el ID de la cita que acabamos de crear
                const citaId = data[0].id;
                console.log('🔗 ID de cita creada:', citaId);
                
                /**
                 * ==========================================
                 * CALCULAR MONTO SEGÚN TIPO DE VEHÍCULO
                 * ==========================================
                 * Tabla de precios del taller (podría estar en BD en producción):
                 * 
                 * | Tipo de vehículo      | Precio  |
                 * |----------------------|---------|
                 * | menor_3_5_ton        | ₡6,000  |
                 * | mayor_3_5_ton        | ₡7,500  |
                 * | motocicleta          | ₡7,000  |
                 * | servicio_publico     | ₡9,000  |
                 * | equipo_especial      | ₡5,000  |
                 * | autobus              | ₡7,000  |
                 * 
                 * Usamos switch porque es más legible que múltiples if-else
                 * cuando hay muchas opciones discretas.
                 */
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
                        // Precio por defecto si hay un valor no esperado
                        montoTotal = 6000;
                }
                
                console.log('💵 Monto calculado: ₡' + montoTotal);
                
                /**
                 * ==========================================
                 * CREAR REGISTRO EN TABLA 'facturas'
                 * ==========================================
                 * CONSULTA SQL EQUIVALENTE:
                 * INSERT INTO facturas (id_cita, id_usuario, monto_total, estado, detalles)
                 * VALUES (15, 'uuid...', 7500, 'pendiente', '{"tipo_servicio": "..."}');
                 * 
                 * CAMPOS CLAVE:
                 * - id_cita: Vincula esta factura con la cita creada (relación 1:1)
                 * - id_usuario: Para que el cliente vea SUS facturas (RLS)
                 * - monto_total: El precio calculado arriba
                 * - estado: 'pendiente' → luego puede cambiar a 'pagada'
                 * - detalles: JSON con info extra del servicio (flexible para futuros cambios)
                 */
                const { error: errorFactura } = await supabase
                    .from('facturas')  // 📦 Tabla de facturación
                    .insert([{         // 📝 Array con el objeto a insertar
                        id_cita: citaId,                          // 🔗 Relación con cita
                        id_usuario: usuarioActual ? usuarioActual.id : null,  // 👤 Cliente
                        monto_total: montoTotal,                  // 💰 Precio calculado
                        estado: 'pendiente',                      // 📊 Estado inicial
                        detalles: {                               // 📋 Info adicional en JSON
                            tipo_servicio: datosCita.tipo_vehiculo,
                            placa: datosCita.placa,
                            marca: datosCita.marca,
                            modelo: datosCita.modelo
                        }
                    }]);
                
                // Manejo de error específico para la factura
                if (errorFactura) {
                    console.error('❌ Error al crear factura:', errorFactura);
                    // Nota: La cita SÍ se guardó, solo falló la factura
                    // En producción, podríamos implementar reintento o alerta al admin
                } else {
                    console.log('✅ Factura generada exitosamente por ₡' + montoTotal);
                }
            } else {
                // Caso edge: no pudimos obtener el ID de la cita
                console.warn('⚠️ No se pudo obtener el ID de la cita');
            }
            
            // ==========================================
            // FINALIZAR PROCESO: FEEDBACK Y REDIRECCIÓN
            // ==========================================
            
            // Cerrar la alerta de loading
            Swal.close();
            
            // ==========================================
            // MOSTRAR MENSAJE DE ÉXITO AL USUARIO
            // ==========================================
            await Swal.fire({
                icon: 'success',
                title: '✅ ¡Cita Agendada!',
                text: `${datosCita.nombre} - ${datosCita.placa}`,  // Personalizado
                confirmButtonText: 'Ver citas'
            });
            
            // ==========================================
            // LIMPIAR FORMULARIO PARA NUEVO USO
            // ==========================================
            formulario.reset();  // Limpia todos los campos
            selectorHora.innerHTML = '<option value="">-- Seleccione --</option>';  // Reset select
            entradaFecha.value = '';  // Limpia fecha
            
            // ==========================================
            // REDIRECCIÓN INTELIGENTE
            // ==========================================
            // Según si el usuario está logueado o no, lo mandamos a un lugar diferente:
            if (usuarioActual) {
                // ✅ Logueado: va a su dashboard personal para ver sus citas/facturas
                console.log('🔄 Redirigiendo a dashboard cliente...');
                setTimeout(() => {
                    window.location.href = 'dashboard-cliente.html';
                }, 1000);  // Pequeña pausa para que vea el mensaje de éxito
            } else {
                // ⚠️ Invitado: va a login para que pueda crear cuenta y ver su cita
                console.log('🔄 Redirigiendo a login...');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
            
        } catch (error) {
            // ==========================================
            // MANEJO DE ERRORES CENTRALIZADO
            // ==========================================
            // Si algo falló en todo el proceso (red, BD, validación)
            console.error('❌ ERROR EN ENVÍO:', error);
            console.error('❌ Mensaje:', error.message);
            
            // Aseguramos cerrar el loading por si quedó abierto
            Swal.close();
            
            // Mostramos mensaje amigable al usuario (no técnico)
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,  // En desarrollo mostramos el error real
                confirmButtonText: 'Aceptar'
            });
        }
    });
    
    console.log('✅ Configuración completada');
});