/**
 * ==========================================
 * DASHBOARD DE ADMINISTRADOR - PANEL DE CONTROL
 * Archivo: app-dashboard-admin.js
 * ==========================================
 * 
 * 🎯 PROPÓSITO DEL ARCHIVO:
 * Este archivo maneja el panel de control exclusivo para el 
 * ADMINISTRADOR del sistema. Desde aquí puede:
 * 1. Ver estadísticas generales del negocio en tiempo real
 * 2. Consultar TODAS las citas de TODOS los clientes
 * 3. Ver detalles completos de cualquier cita
 * 4. Eliminar citas cuando sea necesario
 * 
 * 🔐 SEGURIDAD IMPORTANTE:
 * Este archivo NO verifica permisos aquí porque esa validación
 * ya se hizo en app-auth.js al cargar la página. Si alguien
 * intenta acceder sin ser admin, fue redirigido antes de llegar aquí.
 * 
 * 🔧 FUNCIONALIDADES PRINCIPALES:
 * ✅ Cargar y mostrar estadísticas (total citas, clientes, citas hoy)
 * ✅ Listar todas las citas en tabla con formato amigable
 * ✅ Ver detalle completo de una cita específica
 * ✅ Eliminar citas con confirmación y refresco automático
 * 
 * 🔗 CONEXIONES CON OTROS ARCHIVOS:
 * - Importa 'supabase' desde supabase.js para conectar con la BD
 * - Usa SweetAlert2 (CDN en HTML) para alertas y confirmaciones
 * - Se conecta con tablas: public.citas, public.perfiles
 * - Complementa a app-auth.js que valida el rol de administrador
 * 
 * 📊 ESTRUCTURA DE DATOS ESPERADA (tabla 'citas'):
 * {
 *   id: bigint,           // ID único de la cita
 *   nombre: text,         // Nombre del cliente
 *   email: text,          // Email de contacto
 *   telefono: text,       // Teléfono
 *   tipo_vehiculo: text,  // Categoría del vehículo
 *   placa: text,          // Placa del vehículo
 *   marca: text,          // Marca del vehículo
 *   modelo: text,         // Modelo del vehículo
 *   anio: text,           // Año del vehículo
 *   fecha_cita: date,     // Fecha programada
 *   hora_cita: text,      // Hora programada
 *   id_usuario: uuid      // ID del usuario si está logueado
 * }
 */

// ==========================================
// IMPORTAR DEPENDENCIAS
// ==========================================
// Importamos el cliente de Supabase configurado en supabase.js
// Esto nos permite hacer consultas a la base de datos en la nube
import { supabase } from "./supabase.js";

// Mensaje de confirmación en consola (útil para depuración)
console.log('✅ Dashboard admin cargado');

// ==========================================
// EVENTO PRINCIPAL: AL CARGAR LA PÁGINA
// ==========================================
// Este código se ejecuta automáticamente cuando:
// - El HTML del dashboard está completamente cargado
// - Los elementos de estadísticas y tabla están disponibles
// - Es seguro manipular el DOM con JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Iniciando dashboard...');
    
    // ==========================================
    // CARGAR DATOS INICIALES DEL DASHBOARD
    // ==========================================
    // Ejecutamos dos funciones en paralelo para:
    // 1. cargarEstadisticas() → Muestra números resumen (KPIs)
    // 2. cargarTodasLasCitas() → Muestra la tabla detallada
    // 
    // Al ser asíncronas, no bloquean la interfaz mientras cargan
    cargarTodasLasCitas();
    cargarEstadisticas();
});

// ==========================================
// FUNCIÓN: CARGAR ESTADÍSTICAS (KPIs)
// ==========================================
// Muestra los números clave del negocio en las tarjetas superiores
// del dashboard: total de citas, clientes registrados y citas del día
async function cargarEstadisticas() {
    try {
        /**
         * ==========================================
         * CONSULTA 1: TOTAL DE CITAS REGISTRADAS
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * SELECT COUNT(*) FROM citas;
         * 
         * DETALLES TÉCNICOS:
         * .select('*', { count: 'exact', head: true })
         * - count: 'exact' → Pide el conteo exacto (no estimado)
         * - head: true → Solo quiere el COUNT, no los datos completos
         * 
         * BENEFICIO: Es más eficiente que traer todas las filas
         * y contarlas en JavaScript, especialmente con muchos datos.
         */
        const { count: totalCitas } = await supabase
            .from('citas')                    // 📦 Tabla de citas
            .select('*', {                    // 📋 Seleccionamos (pero no traemos datos)
                count: 'exact',               // 🔢 Conteo exacto
                head: true                    // ⚡ Solo metadata, sin filas
            });
        
        /**
         * ==========================================
         * CONSULTA 2: TOTAL DE CLIENTES REGISTRADOS
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * SELECT COUNT(*) FROM perfiles WHERE rol = 'cliente';
         * 
         * PROPÓSITO:
         * Saber cuántos usuarios reales (no administradores)
         * tienen cuenta en el sistema para medir crecimiento.
         */
        const { count: totalClientes } = await supabase
            .from('perfiles')                 // 📦 Tabla de perfiles de usuario
            .select('*', { 
                count: 'exact', 
                head: true 
            })
            .eq('rol', 'cliente');            // 🔍 Filtrar solo clientes (no admins)
        
        /**
         * ==========================================
         * CONSULTA 3: CITAS PROGRAMADAS PARA HOY
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * SELECT COUNT(*) FROM citas 
         * WHERE fecha_cita = CURRENT_DATE;
         * 
         * DETALLES DE LA FECHA:
         * new Date().toISOString() → "2026-04-25T14:30:00.000Z"
         * .split('T')[0] → "2026-04-25" (solo la parte de fecha)
         * 
         * Esto asegura que comparamos en el mismo formato que
         * Supabase guarda en la columna fecha_cita.
         */
        const hoy = new Date().toISOString().split('T')[0];  // Ej: "2026-04-25"
        
        const { count: citasHoy } = await supabase
            .from('citas')
            .select('*', { 
                count: 'exact', 
                head: true 
            })
            .eq('fecha_cita', hoy);           // 🔍 Filtrar por fecha de hoy
        
        /**
         * ==========================================
         * ACTUALIZAR EL DOM CON LOS VALORES
         * ==========================================
         * Buscamos los elementos HTML por sus IDs y actualizamos
         * su texto con los números obtenidos de la base de datos.
         * 
         * VALIDACIÓN DE SEGURIDAD:
         * if (elem) → Verificamos que el elemento existe antes
         * de manipularlo, evitando errores si el HTML cambia.
         * 
         * OPERADOR NULLISH (|| 0):
         * Si count retorna null (sin datos), mostramos 0 en su lugar.
         */
        const elemCitas = document.getElementById('totalCitas');
        const elemClientes = document.getElementById('totalClientes');
        const elemHoy = document.getElementById('citasHoy');
        
        if (elemCitas) elemCitas.textContent = totalCitas || 0;
        if (elemClientes) elemClientes.textContent = totalClientes || 0;
        if (elemHoy) elemHoy.textContent = citasHoy || 0;
        
        // Mensaje de depuración en consola
        console.log('📊 Estadísticas:', { totalCitas, totalClientes, citasHoy });
        
    } catch (error) {
        /**
         * ==========================================
         * MANEJO DE ERRORES EN ESTADÍSTICAS
         * ==========================================
         * Si falla alguna consulta de conteo:
         * - Registramos el error en consola para el desarrollador
         * - No mostramos alerta al usuario (no es crítico)
         * - Las tarjetas pueden quedar en 0 o vacío, pero el dashboard sigue funcionando
         */
        console.error('❌ Error estadísticas:', error);
    }
}

// ==========================================
// FUNCIÓN PRINCIPAL: CARGAR TODAS LAS CITAS
// ==========================================
// Esta función consulta, procesa y muestra en tabla
// TODAS las citas del sistema (sin filtrar por usuario)
async function cargarTodasLasCitas() {
    console.log('🔍 Cargando citas...');
    
    // ==========================================
    // OBTENER REFERENCIA DEL CUERPO DE TABLA
    // ==========================================
    const tbody = document.getElementById('tbodyCitasAdmin');
    
    // Validación de seguridad: si no existe el elemento, salimos
    if (!tbody) {
        console.error('❌ No existe tbodyCitasAdmin');
        return;
    }
    
    // ==========================================
    // MOSTRAR ESTADO DE CARGA
    // ==========================================
    // Mientras consultamos a Supabase, mostramos un mensaje
    // amigable en la tabla para que el admin sepa que está cargando
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">⏳ Cargando...</td></tr>';
    
    try {
        /**
         * ==========================================
         * CONSULTA: TRAER TODAS LAS CITAS
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * SELECT * FROM citas ORDER BY fecha_cita DESC;
         * 
         * DECISIÓN DE DISEÑO:
         * Usamos .select('*') en lugar de hacer JOIN con perfiles
         * porque:
         * 1. Citas antiguas pueden no tener id_usuario vinculado
         * 2. Los datos del cliente ya están en la tabla citas (nombre, email, etc.)
         * 3. Es más simple y rápido para este caso de uso
         * 
         * ORDENAMIENTO:
         * .order('fecha_cita', { ascending: false })
         * → Las citas más recientes aparecen primero (más útil para el admin)
         */
        const {  citas, error } = await supabase
            .from('citas')                    // 📦 Tabla de citas
            .select('*')                      // 📋 Todas las columnas
            .order('fecha_cita', { ascending: false });  // 📅 Más reciente primero
        
        console.log('📊 Citas encontradas:', citas?.length);
        
        // ==========================================
        // VALIDAR ERROR DE CONSULTA
        // ==========================================
        if (error) {
            console.error('❌ Error:', error);
            throw error;  // Lanzamos para manejar en el catch
        }
        
        /**
         * ==========================================
         * CASO A: NO HAY CITAS REGISTRADAS
         * ==========================================
         * Si la consulta fue exitosa pero no hay datos,
         * mostramos un mensaje amigable en lugar de tabla vacía
         */
        if (!citas || citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">📭 No hay citas</td></tr>';
            
            // Actualizamos también la estadística para que coincida
            const elem = document.getElementById('totalCitas');
            if (elem) elem.textContent = '0';
            return;
        }
        
        /**
         * ==========================================
         * CASO B: HAY CITAS PARA MOSTRAR
         * ==========================================
         * Preparamos la tabla para llenarla con los datos
         */
        
        // Limpiamos el cuerpo de tabla antes de llenarlo
        tbody.innerHTML = '';
        
        /**
         * ==========================================
         * GENERAR FILAS DINÁMICAMENTE
         * ==========================================
         * Por cada cita que regresó Supabase, creamos
         * una fila HTML (<tr>) con los datos formateados
         */
        citas.forEach(cita => {
            // Creamos un nuevo elemento <tr> en memoria
            const tr = document.createElement('tr');
            
            /**
             * ==========================================
             * FORMATEAR FECHA PARA VISUALIZACIÓN
             * ==========================================
             * toLocaleDateString('es-CR') convierte:
             * "2026-04-25" → "25/4/2026" (formato Costa Rica)
             * 
             * Esto hace la fecha más legible para el usuario final.
             */
            const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-CR');
            
            /**
             * ==========================================
             * GENERAR HTML DE LA FILA (Template Literal)
             * ==========================================
             * Usamos comillas invertidas (` `) para crear HTML
             * con variables interpoladas (${variable})
             * 
             * COLUMNAS DE LA TABLA:
             * 1. ID de cita (con # para énfasis)
             * 2. Fecha formateada
             * 3. Hora (o 'N/A' si está vacío)
             * 4. Nombre del cliente (o 'Cliente' por defecto)
             * 5. Email de contacto
             * 6. Teléfono de contacto
             * 7. Marca + Modelo del vehículo
             * 8. Placa (dentro de <span class="badge"> para estilo)
             * 9. Botones de acción: 👁️ (ver) y 🗑️ (eliminar)
             * 
             * OPERADOR NULLISH (||):
             * cita.hora_cita || 'N/A' → Si está vacío, muestra 'N/A'
             * Esto evita celdas vacías confusas en la tabla.
             */
            tr.innerHTML = `
                <td><strong>#${cita.id}</strong></td>
                <td>${fecha}</td>
                <td>${cita.hora_cita || 'N/A'}</td>
                <td>${cita.nombre || 'Cliente'}</td>
                <td>${cita.email || 'Sin email'}</td>
                <td>${cita.telefono || 'Sin teléfono'}</td>
                <td>${cita.marca || ''} ${cita.modelo || ''}</td>
                <td><span class="badge">${cita.placa || 'N/A'}</span></td>
                <td>
                    <button onclick="verDetalleCita(${cita.id})" 
                            class="boton boton-secundario boton-pequeno">👁️</button>
                    <button onclick="eliminarCitaAdmin(${cita.id})" 
                            class="boton boton-peligro boton-pequeno">🗑️</button>
                </td>
            `;
            
            // Agregamos la fila al cuerpo de la tabla
            tbody.appendChild(tr);
        });
        
        // ==========================================
        // ACTUALIZAR ESTADÍSTICA DE TOTAL DE CITAS
        // ==========================================
        // Sincronizamos el número de la tarjeta con la tabla
        const elem = document.getElementById('totalCitas');
        if (elem) elem.textContent = citas.length;
        
        console.log('✅ Tabla actualizada con', citas.length, 'citas');
        
    } catch (error) {
        /**
         * ==========================================
         * MANEJO DE ERRORES EN CARGA DE CITAS
         * ==========================================
         * Si algo falla (red, BD, permisos), mostramos
         * el error dentro de la tabla para que el admin lo vea
         */
        console.error('❌ Error:', error);
        
        // Mostramos mensaje de error en la tabla
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

// ==========================================
// FUNCIÓN GLOBAL: VER DETALLE DE CITA
// ==========================================
// Muestra un modal con toda la información de una cita específica
// Se llama desde el botón 👁️ en cada fila de la tabla
// 
// 🔗 CONEXIÓN CON HTML:
// <button onclick="verDetalleCita(15)">👁️</button>
//                      ↑
//              Este número (15) es el 'id' que recibe la función
window.verDetalleCita = async (id) => {
    /**
     * ==========================================
     * CONSULTAR DETALLE COMPLETO DE LA CITA
     * ==========================================
     * CONSULTA SQL EQUIVALENTE:
     * SELECT * FROM citas WHERE id = 15 LIMIT 1;
     * 
     * .single() → Esperamos exactamente un resultado
     * Si no existe la cita con ese ID, retorna null
     */
    const {  cita } = await supabase
        .from('citas')      // 📦 Tabla de citas
        .select('*')        // 📋 Todas las columnas
        .eq('id', id)       // 🔍 Filtrar por ID específico
        .single();          // ✅ Esperar un solo resultado
    
    // Si no se encontró la cita, salimos silenciosamente
    if (!cita) return;
    
    /**
     * ==========================================
     * MOSTRAR MODAL CON SweetAlert2
     * ==========================================
     * Creamos una ventana modal con la información completa
     * de la cita, formateada para fácil lectura.
     * 
     * html: → Permite usar HTML dentro del contenido
     * para dar formato (negritas, saltos de línea, etc.)
     */
    Swal.fire({
        title: 'Detalle de Cita',  // Título del modal
        html: `                    // Contenido con formato HTML
            <p><strong>ID:</strong> ${cita.id}</p>
            <p><strong>Fecha:</strong> ${cita.fecha_cita}</p>
            <p><strong>Hora:</strong> ${cita.hora_cita}</p>
            <p><strong>Cliente:</strong> ${cita.nombre}</p>
            <p><strong>Placa:</strong> ${cita.placa}</p>
            <p><strong>Vehículo:</strong> ${cita.marca} ${cita.modelo}</p>
        `,
        confirmButtonText: 'Cerrar'  // Texto del botón de cierre
    });
};

// ==========================================
// FUNCIÓN GLOBAL: ELIMINAR CITA (ADMIN)
// ==========================================
// Permite al administrador eliminar cualquier cita del sistema
// Incluye confirmación para evitar eliminaciones accidentales
// 
// 🔗 CONEXIÓN CON HTML:
// <button onclick="eliminarCitaAdmin(15)">🗑️</button>
window.eliminarCitaAdmin = async (id) => {
    /**
     * ==========================================
     * PASO 1: CONFIRMAR CON EL ADMINISTRADOR
     * ==========================================
     * Antes de eliminar datos importantes, siempre
     * pedimos confirmación explícita para prevenir errores
     * 
     * isConfirmed → true solo si hizo clic en "Sí"
     * (no si canceló o cerró el modal)
     */
    const result = await Swal.fire({
        title: '¿Eliminar?',              // Título de confirmación
        icon: 'warning',                  // Ícono amarillo de precaución
        showCancelButton: true,           // Mostrar botón "Cancelar"
        confirmButtonText: 'Sí',          // Texto botón principal
        cancelButtonText: 'No'            // Texto botón secundario
    });
    
    // Si el administrador confirmó la eliminación
    if (result.isConfirmed) {
        try {
            /**
             * ==========================================
             * PASO 2: ELIMINAR DE SUPABASE
             * ==========================================
             * CONSULTA SQL EQUIVALENTE:
             * DELETE FROM citas WHERE id = 15;
             * 
             * .delete() → Operación de eliminación
             * .eq('id', id) → Condición: donde id sea igual al parámetro
             * 
             * ⚠️ NOTA DE SEGURIDAD:
             * Esta eliminación está sujeta a políticas RLS de Supabase.
             * Como es admin, debería tener permisos para eliminar.
             */
            const { error } = await supabase
                .from('citas')    // 📦 Tabla objetivo
                .delete()         // 🗑️ Operación de borrado
                .eq('id', id);    // 🔍 Condición: id = X
            
            // ==========================================
            // VALIDAR ERROR DE ELIMINACIÓN
            // ==========================================
            if (error) {
                Swal.fire('Error', error.message, 'error');
            } else {
                /**
                 * ==========================================
                 * PASO 3: FEEDBACK Y REFRESCO DE INTERFAZ
                 * ==========================================
                 * 1. Mostrar mensaje de éxito al admin
                 * 2. Recargar la tabla para reflejar el cambio
                 * 3. Recargar estadísticas para actualizar contadores
                 * 
                 * Esto se llama "refresco optimista": la interfaz
                 * se actualiza inmediatamente después de la acción.
                 */
                Swal.fire('Eliminada', '', 'success');
                
                // Recargar datos para reflejar los cambios
                cargarTodasLasCitas();    // Actualizar tabla
                cargarEstadisticas();     // Actualizar KPIs
            }
        } catch (error) {
            // Manejo de errores inesperados
            console.error('❌ Error al eliminar:', error);
            Swal.fire('Error', 'No se pudo eliminar la cita', 'error');
        }
    }
    // Si canceló, no hacemos nada y la cita permanece
};

// ==========================================
// MENSAJE FINAL DE CARGA
// ==========================================
// Confirma en consola que el archivo se cargó completamente
console.log('✅ Dashboard listo');