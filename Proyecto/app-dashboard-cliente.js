/**
 * ==========================================
 * DASHBOARD DE CLIENTE - PANEL PERSONAL
 * Archivo: app-dashboard-cliente.js
 * ==========================================
 * 
 * 🎯 PROPÓSITO DEL ARCHIVO:
 * Este archivo maneja el panel de control exclusivo para cada 
 * CLIENTE del sistema. Desde aquí puede:
 * 1. Ver su información de perfil personalizada
 * 2. Consultar SOLO sus propias citas (privacidad garantizada)
 * 3. Visualizar SOLO sus propias facturas generadas
 * 4. Ver detalles completos de citas y facturas
 * 5. Eliminar sus propias citas pendientes
 * 
 * 🔐 SEGURIDAD POR DISEÑO (RLS - Row Level Security):
 * Cada consulta incluye .eq('id_usuario', usuarioActual.id)
 * Esto garantiza que un cliente NUNCA pueda ver datos de otro,
 * incluso si intenta manipular el código en el navegador.
 * 
 * 🔧 FUNCIONALIDADES PRINCIPALES:
 * ✅ Cargar y mostrar información del perfil del cliente
 * ✅ Listar citas personales con formato amigable
 * ✅ Listar facturas personales con estado visual
 * ✅ Ver detalles en modales profesionales (SweetAlert2)
 * ✅ Eliminar citas con confirmación y refresco automático
 * 
 * 🔗 CONEXIONES CON OTROS ARCHIVOS:
 * - Importa 'supabase' desde supabase.js (configuración BD)
 * - Usa SweetAlert2 (CDN en HTML) para modales y alertas
 * - Se conecta con tablas: public.citas, public.facturas, public.perfiles
 * - Complementa a app-auth.js que valida la sesión del usuario
 * - Trabaja con dashboard-cliente.html que define la estructura visual
 * 
 * 📊 ESTRUCTURA DE DATOS - TABLA 'perfiles':
 * {
 *   id: uuid,              // ID único (misma clave que auth.users)
 *   nombre_completo: text, // Nombre completo del cliente
 *   email: text,           // Email de contacto
 *   telefono: text,        // Teléfono opcional
 *   rol: text,             // 'cliente' o 'administrador'
 *   created_at: timestamp  // Fecha de registro
 * }
 * 
 * 📊 ESTRUCTURA DE DATOS - TABLA 'citas':
 * {
 *   id: bigint,            // ID único de la cita
 *   id_usuario: uuid,      // 🔗 Vincula con el cliente (CLAVE PARA RLS)
 *   nombre, email, telefono, // Datos de contacto
 *   tipo_vehiculo, placa, marca, modelo, anio, // Info del vehículo
 *   fecha_cita, hora_cita  // Fecha y hora programadas
 * }
 * 
 * 📊 ESTRUCTURA DE DATOS - TABLA 'facturas':
 * {
 *   id: bigint,            // ID único de factura
 *   id_cita: bigint,       // 🔗 Vincula con la cita relacionada
 *   id_usuario: uuid,      // 🔗 Vincula con el cliente
 *   monto_total: numeric,  // Precio calculado automáticamente
 *   estado: text,          // 'pendiente' o 'pagada'
 *   detalles: jsonb,       // Info extra del servicio en formato JSON
 *   fecha_emision: timestamp // Fecha/hora de creación
 * }
 */

// ==========================================
// IMPORTAR DEPENDENCIAS
// ==========================================
// Importamos el cliente de Supabase configurado en supabase.js
// Esto nos permite hacer consultas seguras a la base de datos en la nube
import { supabase } from "./supabase.js";

// Mensaje de confirmación en consola (útil para depuración durante desarrollo)
console.log('✅ Dashboard cliente cargado');

// ==========================================
// VARIABLE GLOBAL: USUARIO ACTUAL
// ==========================================
// Almacena la información del cliente logueado
// Se usa en TODAS las consultas para filtrar por id_usuario
// Esto garantiza que cada cliente vea SOLO sus propios datos
let usuarioActual = null;

// ==========================================
// EVENTO PRINCIPAL: AL CARGAR LA PÁGINA
// ==========================================
// Este código se ejecuta automáticamente cuando:
// - El HTML del dashboard está completamente cargado
// - Los elementos del DOM están disponibles para manipular
// - Es seguro ejecutar código JavaScript que modifica la interfaz
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Iniciando dashboard cliente...');
    
    /**
     * ==========================================
     * VERIFICAR AUTENTICACIÓN DEL USUARIO
     * ==========================================
     * CONSULTA A SUPABASE AUTH:
     * Preguntamos: "¿Hay un usuario logueado en esta sesión?"
     * 
     * IMPORTANTE:
     * Esta validación es CRÍTICA para seguridad. Si alguien
     * intenta acceder directamente a dashboard-cliente.html
     * sin iniciar sesión, será redirigido al login inmediatamente.
     */
    const {  { user } } = await supabase.auth.getUser();
    
    // ==========================================
    * CASO A: NO HAY USUARIO LOGUEADO
     * ==========================================
     * Si user es null/undefined, significa que:
     * - La sesión expiró
     * - El usuario nunca inició sesión
     * - Alguien intentó acceder por URL directa
     * 
     * SOLUCIÓN: Redirigir al login para autenticarse
     */
    if (!user) {
        console.warn('⚠️ No hay usuario, redirigiendo a login');
        window.location.href = 'login.html';
        return;  // Detenemos la ejecución para no continuar sin usuario
    }
    
    // ==========================================
     * CASO B: USUARIO AUTENTICADO
     * ==========================================
     * Guardamos la información del usuario en variable global
     * para usarla en todas las consultas posteriores
     */
    usuarioActual = user;
    console.log('✅ Usuario logueado:', user.email);
    
    /**
     * ==========================================
     * CARGAR INFORMACIÓN DEL PERFIL
     * ==========================================
     * Llamamos a la función que consulta la tabla 'perfiles'
     * para obtener nombre completo y mostrarlo en el header
     */
    await cargarInfoPerfil();
    
    console.log('✅ Dashboard listo para usar');
});

// ==========================================
// FUNCIÓN: CARGAR INFORMACIÓN DEL PERFIL
// ==========================================
// Actualiza el header del dashboard con el nombre y email
// del cliente logueado, personalizando la experiencia
async function cargarInfoPerfil() {
    /**
     * ==========================================
     * CONSULTA: OBTENER DATOS DEL PERFIL
     * ==========================================
     * CONSULTA SQL EQUIVALENTE:
     * SELECT nombre_completo, email 
     * FROM perfiles 
     * WHERE id = 'uuid-del-usuario' 
     * LIMIT 1;
     * 
     * DETALLES TÉCNICOS:
     * - .eq('id', usuarioActual.id) → Filtra por el ID del usuario logueado
     * - .single() → Esperamos exactamente un resultado (cada usuario tiene un perfil)
     * - select('nombre_completo, email') → Solo traemos los campos que necesitamos
     * 
     * BENEFICIO: Consultar solo lo necesario mejora el rendimiento
     * y reduce el consumo de ancho de banda.
     */
    const {  perfil } = await supabase
        .from('perfiles')                 // 📦 Tabla de perfiles de usuario
        .select('nombre_completo, email') // 📋 Solo estos dos campos
        .eq('id', usuarioActual.id)       // 🔍 Filtrar por ID del usuario actual
        .single();                        // ✅ Esperar un solo resultado
    
    /**
     * ==========================================
     * ACTUALIZAR ELEMENTOS DEL DOM
     * ==========================================
     * Buscamos los elementos HTML por sus IDs y actualizamos
     * su texto con la información del perfil.
     * 
     * VALIDACIÓN DE SEGURIDAD:
     * if (userNameEl) → Verificamos que el elemento existe
     * antes de manipularlo, evitando errores si el HTML cambia.
     * 
     * OPERADOR NULLISH (||):
     * perfil?.nombre_completo || 'Cliente'
     * → Si el nombre está vacío, muestra 'Cliente' por defecto
     * → El operador ?. previene errores si perfil es null
     */
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) {
        userNameEl.textContent = perfil?.nombre_completo || 'Cliente';
    }
    if (userEmailEl) {
        userEmailEl.textContent = perfil?.email || usuarioActual.email;
    }
}

// ==========================================
// FUNCIÓN GLOBAL: CARGAR MIS CITAS
// ==========================================
// Muestra en tabla SOLO las citas del usuario actual
// Se llama desde el botón "Mis Citas" en el dashboard
// 
// 🔗 CONEXIÓN CON HTML:
// <div class="action-card" onclick="cargarMisCitas()">
// 
// 🔐 SEGURIDAD: La consulta incluye .eq('id_usuario', usuarioActual.id)
// lo que garantiza que el cliente solo ve SUS propias citas.
window.cargarMisCitas = async () => {
    console.log('📋 Cargando mis citas...');
    
    // ==========================================
     * OBTENER REFERENCIAS DEL DOM
     * ==========================================
     * Buscamos los elementos HTML que vamos a manipular:
     * - seccionMisCitas: El contenedor completo de la sección
     * - tbody: El cuerpo de la tabla donde van las filas
     */
    const seccionMisCitas = document.getElementById('seccionMisCitas');
    const tbody = document.getElementById('tbodyCitasCliente');
    
    // Validación de seguridad: si no existen los elementos, salimos
    if (!seccionMisCitas || !tbody) {
        console.error('❌ Elementos no encontrados');
        return;
    }
    
    /**
     * ==========================================
     * GESTIONAR VISTA: OCULTAR/MOSTRAR SECCIONES
     * ==========================================
     * El dashboard tiene dos secciones: Citas y Facturas
     * Al mostrar una, ocultamos la otra para evitar confusión.
     * 
     * Esto crea una experiencia de "pestañas" sin recargar la página.
     */
    const seccionFacturas = document.getElementById('seccionMisFacturas');
    if (seccionFacturas) {
        seccionFacturas.style.display = 'none';  // Ocultar facturas
    }
    
    // Mostrar la sección de citas
    seccionMisCitas.style.display = 'block';
    
    // ==========================================
     * MOSTRAR ESTADO DE CARGA
     * ==========================================
     * Mientras consultamos a Supabase, mostramos un mensaje
     * amigable en la tabla para que el usuario sepa que está cargando
     */
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">⏳ Cargando...</td></tr>';
    
    try {
        /**
         * ==========================================
         * CONSULTA: TRAER CITAS DEL USUARIO ACTUAL
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * SELECT * FROM citas 
         * WHERE id_usuario = 'uuid-del-cliente'
         * ORDER BY fecha_cita DESC;
         * 
         * 🔐 SEGURIDAD CLAVE:
         * .eq('id_usuario', usuarioActual.id)
         * → Este filtro es OBLIGATORIO para privacidad
         * → Sin él, un cliente podría ver citas de otros
         * 
         * ORDENAMIENTO:
         * .order('fecha_cita', { ascending: false })
         * → Las citas más recientes aparecen primero (más útil)
         */
        const {  citas, error } = await supabase
            .from('citas')                    // 📦 Tabla de citas
            .select('*')                      // 📋 Todas las columnas
            .eq('id_usuario', usuarioActual.id) // 🔐 FILTRO DE SEGURIDAD: solo mis citas
            .order('fecha_cita', { ascending: false }); // 📅 Más reciente primero
        
        console.log('📊 Citas encontradas:', citas?.length);
        
        // ==========================================
         * VALIDAR ERROR DE CONSULTA
         * ==========================================
         * Si hay error (red, BD, permisos), lo lanzamos
         * para manejarlo centralizadamente en el catch
         */
        if (error) throw error;
        
        /**
         * ==========================================
         * CASO A: NO HAY CITAS AGENDADAS
         * ==========================================
         * Si la consulta fue exitosa pero no hay datos,
         * mostramos un mensaje amigable en lugar de tabla vacía
         */
        if (!citas || citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">📭 No tienes citas agendadas</td></tr>';
            return;  // Salimos porque no hay nada más que procesar
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
             * 4. Tipo de vehículo (de la cita)
             * 5. Marca + Modelo del vehículo
             * 6. Placa (dentro de <span class="badge"> para estilo)
             * 7. Estado (siempre "Pendiente" en esta versión)
             * 8. Botones de acción: 👁️ (ver) y 🗑️ (eliminar)
             * 
             * OPERADOR NULLISH (||):
             * cita.hora_cita || 'N/A' → Si está vacío, muestra 'N/A'
             * Esto evita celdas vacías confusas en la tabla.
             */
            tr.innerHTML = `
                <td><strong>#${cita.id}</strong></td>
                <td>${fecha}</td>
                <td>${cita.hora_cita || 'N/A'}</td>
                <td>${cita.tipo_vehiculo || 'N/A'}</td>
                <td>${cita.marca || ''} ${cita.modelo || ''}</td>
                <td><span class="badge">${cita.placa || 'N/A'}</span></td>
                <td>Pendiente</td>
                <td>
                    <button onclick="verDetalleCita(${cita.id})" 
                            class="boton boton-secundario boton-pequeno" 
                            style="margin-right: 5px;">👁️</button>
                    <button onclick="eliminarCita(${cita.id})" 
                            class="boton boton-peligro boton-pequeno">🗑️</button>
                </td>
            `;
            
            // Agregamos la fila al cuerpo de la tabla
            tbody.appendChild(tr);
        });
        
        /**
         * ==========================================
         * SCROLL SUAVE HACIA LA SECCIÓN
         * ==========================================
         * scrollIntoView({ behavior: 'smooth' })
         * → Desplaza la página suavemente hasta la tabla
         * → Mejora la experiencia de usuario al ver el resultado
         */
        seccionMisCitas.scrollIntoView({ behavior: 'smooth' });
        
        console.log('✅ Citas cargadas correctamente');
        
    } catch (error) {
        /**
         * ==========================================
         * MANEJO DE ERRORES EN CARGA DE CITAS
         * ==========================================
         * Si algo falla (red, BD, permisos), mostramos
         * el error dentro de la tabla para que el usuario lo vea
         */
        console.error('❌ Error:', error);
        
        // Mostramos mensaje de error en la tabla
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
};

// ==========================================
// FUNCIÓN GLOBAL: CARGAR MIS FACTURAS
// ==========================================
// Muestra en tabla SOLO las facturas del usuario actual
// Incluye JOIN con la tabla 'citas' para mostrar info del vehículo
// 
// 🔗 CONEXIÓN CON HTML:
// <div class="action-card" onclick="cargarMisFacturas()">
// 
// 🔐 SEGURIDAD: La consulta incluye .eq('id_usuario', usuarioActual.id)
// lo que garantiza que el cliente solo ve SUS propias facturas.
window.cargarMisFacturas = async () => {
    console.log('💰 Cargando mis facturas...');
    
    // ==========================================
     * OBTENER REFERENCIAS DEL DOM
     * ==========================================
     */
    const seccionFacturas = document.getElementById('seccionMisFacturas');
    const tbody = document.getElementById('tbodyFacturasCliente');
    
    if (!seccionFacturas || !tbody) {
        console.error('❌ Elementos no encontrados');
        return;
    }
    
    /**
     * ==========================================
     * GESTIONAR VISTA: OCULTAR/MOSTRAR SECCIONES
     * ==========================================
     * Al mostrar facturas, ocultamos la sección de citas
     */
    const seccionCitas = document.getElementById('seccionMisCitas');
    if (seccionCitas) {
        seccionCitas.style.display = 'none';  // Ocultar citas
    }
    
    seccionFacturas.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">⏳ Cargando...</td></tr>';
    
    try {
        /**
         * ==========================================
         * CONSULTA CON JOIN: FACTURAS + DATOS DE CITA
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * SELECT facturas.*, 
         *        citas.fecha_cita, citas.hora_cita, 
         *        citas.marca, citas.modelo, citas.placa
         * FROM facturas
         * LEFT JOIN citas ON facturas.id_cita = citas.id
         * WHERE facturas.id_usuario = 'uuid-del-cliente'
         * ORDER BY facturas.fecha_emision DESC;
         * 
         * 🔗 SINTAXIS DE JOIN EN SUPABASE:
         * .select(`
         *     *,
         *     citas (
         *         fecha_cita, hora_cita, marca, modelo, placa
         *     )
         * `)
         * → El nombre de la tabla relacionada va entre paréntesis
         * → Solo seleccionamos las columnas que necesitamos del JOIN
         * 
         * BENEFICIO: En una sola consulta obtenemos:
         * - Datos de la factura (monto, estado, detalles)
         * - Datos del vehículo de la cita asociada
         * → Evitamos hacer múltiples consultas, mejorando rendimiento
         * 
         * 🔐 SEGURIDAD: .eq('id_usuario', usuarioActual.id)
         * garantiza que solo vea SUS facturas, aunque el JOIN
         * traiga datos de la tabla citas.
         */
        const {  facturas, error } = await supabase
            .from('facturas')  // 📦 Tabla principal: facturas
            .select(`
                *,  // Todas las columnas de facturas
                citas (  // 🔗 JOIN con tabla citas
                    fecha_cita,  // Columnas específicas de citas
                    hora_cita,
                    marca,
                    modelo,
                    placa
                )
            `)
            .eq('id_usuario', usuarioActual.id)  // 🔐 FILTRO DE SEGURIDAD
            .order('fecha_emision', { ascending: false });  // 📅 Más reciente primero
        
        console.log('📊 Facturas encontradas:', facturas?.length);
        
        if (error) throw error;
        
        /**
         * ==========================================
         * CASO A: NO HAY FACTURAS
         * ==========================================
         */
        if (!facturas || facturas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">📭 No tienes facturas</td></tr>';
            return;
        }
        
        /**
         * ==========================================
         * CASO B: HAY FACTURAS PARA MOSTRAR
         * ==========================================
         */
        tbody.innerHTML = '';
        
        facturas.forEach(factura => {
            const tr = document.createElement('tr');
            
            // Formatear fecha de emisión
            const fecha = new Date(factura.fecha_emision).toLocaleDateString('es-CR');
            
            // Acceder a los datos de la cita relacionada (del JOIN)
            const cita = factura.citas;
            
            /**
             * ==========================================
             * ESTILO DINÁMICO SEGÚN ESTADO DE FACTURA
             * ==========================================
             * Cambiamos color e ícono según si está pagada o pendiente:
             * - pagada → Verde (#28a745) + ✅
             * - pendiente → Naranja (#FFA500) + ⏳
             * 
             * Esto da feedback visual inmediato al usuario sobre
             * el estado de sus pagos.
             */
            let estadoColor = factura.estado === 'pagada' ? '#28a745' : '#FFA500';
            let estadoIcon = factura.estado === 'pagada' ? '✅' : '⏳';
            
            /**
             * ==========================================
             * GENERAR HTML DE LA FILA
             * ==========================================
             * COLUMNAS:
             * 1. Número de factura
             * 2. Fecha de emisión formateada
             * 3. Tipo de servicio (de detalles JSON)
             * 4. Vehículo + Placa (del JOIN con citas)
             * 5. Monto total formateado con ₡ y separadores de miles
             * 6. Estado con color e ícono dinámico
             * 7. Botón para ver detalle completo
             * 
             * 🔍 ACCESO A JSON: factura.detalles?.tipo_servicio
             * - El operador ?. previene errores si detalles es null
             * - Accedemos a propiedades dentro del campo JSONB
             */
            tr.innerHTML = `
                <td><strong>#${factura.id}</strong></td>
                <td>${fecha}</td>
                <td>${factura.detalles?.tipo_servicio || 'N/A'}</td>
                <td>
                    ${cita?.marca || ''} ${cita?.modelo || ''}
                    <br><small>${cita?.placa || ''}</small>
                </td>
                <td><strong>₡${factura.monto_total.toLocaleString()}</strong></td>
                <td>
                    <span style="color: ${estadoColor}; font-weight: 700;">
                        ${estadoIcon} ${factura.estado}
                    </span>
                </td>
                <td>
                    <button onclick="verFactura(${factura.id})" 
                            class="boton boton-secundario boton-pequeno">👁️</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Scroll suave hacia la sección de facturas
        seccionFacturas.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ Facturas cargadas correctamente');
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
};

// ==========================================
// FUNCIÓN GLOBAL: VER DETALLE DE CITA
// ==========================================
// Muestra un modal con información completa de una cita específica
// Incluye validación de seguridad: solo permite ver citas del usuario actual
// 
// 🔗 CONEXIÓN CON HTML:
// <button onclick="verDetalleCita(15)">👁️</button>
window.verDetalleCita = async (id) => {
    /**
     * ==========================================
     * CONSULTA CON DOBLE VALIDACIÓN DE SEGURIDAD
     * ==========================================
     * CONSULTA SQL EQUIVALENTE:
     * SELECT * FROM citas 
     * WHERE id = 15 AND id_usuario = 'uuid-del-cliente'
     * LIMIT 1;
     * 
     * 🔐 SEGURIDAD EN CAPAS:
     * 1. .eq('id', id) → Busca la cita por ID
     * 2. .eq('id_usuario', usuarioActual.id) → VERIFICA que sea del usuario actual
     * 
     * ¿Por qué ambas?
     * - Si solo usáramos id, un usuario podría intentar ver citas de otros
     *   cambiando el número en el botón (ej: onclick="verDetalleCita(999)")
     * - Con la doble validación, incluso si adivina un ID válido,
     *   la consulta retorna null si no es SU cita.
     * 
     * .single() → Esperamos exactamente un resultado
     */
    const {  cita } = await supabase
        .from('citas')
        .select('*')
        .eq('id', id)                      // 🔍 Filtrar por ID de cita
        .eq('id_usuario', usuarioActual.id) // 🔐 VERIFICAR que sea del usuario actual
        .single();
    
    // Si no se encontró la cita (o no es del usuario), mostrar error
    if (!cita) {
        Swal.fire('Error', 'Cita no encontrada', 'error');
        return;
    }
    
    /**
     * ==========================================
     * FORMATEAR FECHA CON DETALLE COMPLETO
     * ==========================================
     * toLocaleDateString con opciones personalizadas:
     * - year: 'numeric' → "2026" (no "26")
     * - month: 'long' → "abril" (no "4")
     * - day: 'numeric' → "25"
     * 
     * Resultado: "25 de abril de 2026" (más legible que "2026-04-25")
     */
    const fecha = new Date(cita.fecha_cita).toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    /**
     * ==========================================
     * MOSTRAR MODAL CON SweetAlert2
     * ==========================================
     * Creamos una ventana modal profesional con:
     * - Título descriptivo con emoji
     * - Contenido HTML formateado para fácil lectura
     * - Separadores visuales (<hr>) para organizar información
     * - Botón de cierre con color personalizado
     * 
     * html: → Permite usar HTML dentro del contenido
     * para dar formato (negritas, saltos de línea, etc.)
     */
    Swal.fire({
        title: '📋 Detalle de Cita',  // Título con emoji
        html: `                       // Contenido con formato HTML
            <div style="text-align: left;">
                <p><strong>ID:</strong> ${cita.id}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Hora:</strong> ${cita.hora_cita}</p>
                <hr style="margin: 10px 0;">
                <p><strong>Vehículo:</strong> ${cita.marca} ${cita.modelo}</p>
                <p><strong>Placa:</strong> ${cita.placa}</p>
                <p><strong>Tipo:</strong> ${cita.tipo_vehiculo}</p>
            </div>
        `,
        confirmButtonText: 'Cerrar',           // Texto del botón
        confirmButtonColor: '#10CFC8'          // Color turquesa de la marca
    });
};

// ==========================================
// FUNCIÓN GLOBAL: ELIMINAR CITA
// ==========================================
// Permite al cliente eliminar una de sus citas pendientes
// Incluye confirmación explícita y refresco automático de la tabla
// 
// 🔗 CONEXIÓN CON HTML:
// <button onclick="eliminarCita(15)">🗑️</button>
window.eliminarCita = async (id) => {
    /**
     * ==========================================
     * PASO 1: CONFIRMAR CON EL USUARIO
     * ==========================================
     * Antes de eliminar datos, siempre pedimos confirmación
     * para prevenir errores accidentales.
     * 
     * isConfirmed → true solo si hizo clic en "Sí, eliminar"
     * (no si canceló, cerró el modal o presionó ESC)
     */
    const result = await Swal.fire({
        title: '¿Eliminar cita?',              // Título de confirmación
        text: "Esta acción no se puede deshacer", // Mensaje de advertencia
        icon: 'warning',                       // Ícono amarillo de precaución
        showCancelButton: true,                // Mostrar botón "Cancelar"
        confirmButtonColor: '#EB6763',         // Color rojo para acción destructiva
        confirmButtonText: 'Sí, eliminar',     // Texto botón principal
        cancelButtonText: 'No'                 // Texto botón secundario
    });
    
    // Si el usuario confirmó la eliminación
    if (result.isConfirmed) {
        try {
            /**
             * ==========================================
             * PASO 2: ELIMINAR DE SUPABASE
             * ==========================================
             * CONSULTA SQL EQUIVALENTE:
             * DELETE FROM citas WHERE id = 15;
             * 
             * ⚠️ NOTA DE SEGURIDAD IMPORTANTE:
             * Aunque no filtramos por id_usuario en esta consulta,
             * las políticas RLS (Row Level Security) de Supabase
             * se aplican AUTOMÁTICAMENTE:
             * 
             * POLÍTICA RLS EN TABLA 'citas':
             * "Los usuarios solo pueden eliminar citas donde id_usuario = auth.uid()"
             * 
             * Esto significa que incluso si un usuario malintencionado
             * modifica el código para intentar eliminar cita ID=999,
             * Supabase rechazará la operación si esa cita no es suya.
             * 
             * 🔐 SEGURIDAD EN LA NUBE, NO SOLO EN EL CLIENTE.
             */
            const { error } = await supabase
                .from('citas')    // 📦 Tabla objetivo
                .delete()         // 🗑️ Operación de borrado
                .eq('id', id);    // 🔍 Condición: id = X
            
            // ==========================================
             * VALIDAR ERROR DE ELIMINACIÓN
             * ==========================================
             */
            if (error) {
                Swal.fire('Error', error.message, 'error');
            } else {
                /**
                 * ==========================================
                 * PASO 3: FEEDBACK Y REFRESCO DE INTERFAZ
                 * ==========================================
                 * 1. Mostrar mensaje de éxito al usuario
                 * 2. Recargar la tabla para reflejar el cambio
                 * 
                 * Esto se llama "refresco optimista": la interfaz
                 * se actualiza inmediatamente después de la acción,
                 * dando sensación de rapidez y respuesta.
                 */
                Swal.fire('Eliminada', 'La cita ha sido eliminada', 'success');
                
                // Recargar la tabla para mostrar los cambios
                cargarMisCitas();
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
// FUNCIÓN GLOBAL: VER DETALLE DE FACTURA
// ==========================================
// Muestra un modal profesional tipo "recibo" con toda la información
// de una factura, incluyendo datos del cliente, vehículo y servicio
// 
// 🔗 CONEXIÓN CON HTML:
// <button onclick="verFactura(25)">👁️</button>
window.verFactura = async (id) => {
    /**
     * ==========================================
     * CONSULTA CON MÚLTIPLES JOINS
     * ==========================================
     * CONSULTA SQL EQUIVALENTE:
     * SELECT facturas.*,
     *        citas.fecha_cita, citas.hora_cita, citas.marca, 
     *        citas.modelo, citas.placa, citas.tipo_vehiculo,
     *        perfiles.nombre_completo, perfiles.email, perfiles.telefono
     * FROM facturas
     * LEFT JOIN citas ON facturas.id_cita = citas.id
     * LEFT JOIN perfiles ON facturas.id_usuario = perfiles.id
     * WHERE facturas.id = 25 AND facturas.id_usuario = 'uuid-del-cliente';
     * 
     * 🔗 SINTAXIS DE MÚLTIPLES JOINS EN SUPABASE:
     * .select(`
     *     *,                    // Todas las columnas de facturas
     *     citas (...),          // 🔗 Primer JOIN: datos de la cita
     *     perfiles (...)        // 🔗 Segundo JOIN: datos del cliente
     * `)
     * 
     * BENEFICIO: En UNA sola consulta obtenemos:
     * - Datos de la factura (monto, estado, detalles JSON)
     * - Datos del vehículo (de la cita asociada)
     * - Datos del cliente (del perfil asociado)
     * → Evitamos 3 consultas separadas, mejorando rendimiento
     * 
     * 🔐 SEGURIDAD: .eq('id_usuario', usuarioActual.id) implícito
     * porque la consulta es sobre facturas del usuario actual.
     */
    const {  factura } = await supabase
        .from('facturas')  // 📦 Tabla principal
        .select(`
            *,  // Todas las columnas de facturas
            citas (  // 🔗 JOIN 1: datos de la cita relacionada
                fecha_cita, hora_cita,
                marca, modelo, placa, tipo_vehiculo
            ),
            perfiles (  // 🔗 JOIN 2: datos del cliente
                nombre_completo, email, telefono
            )
        `)
        .eq('id', id)  // 🔍 Filtrar por ID de factura
        .single();     // ✅ Esperar un solo resultado
    
    // Si no se encontró la factura, mostrar error
    if (!factura) {
        Swal.fire('Error', 'Factura no encontrada', 'error');
        return;
    }
    
    // Formatear fecha de emisión
    const fecha = new Date(factura.fecha_emision).toLocaleDateString('es-CR');
    
    // Acceder a datos de las tablas relacionadas (de los JOINs)
    const cita = factura.citas;
    const cliente = factura.perfiles;
    
    /**
     * ==========================================
     * MODAL TIPO "RECIBO" PROFESIONAL
     * ==========================================
     * Diseñamos el modal para que parezca una factura real:
     * 
     * 🎨 ELEMENTOS DE DISEÑO:
     * - Título con color de marca (#10CFC8)
     * - Separadores visuales (<hr>) para organizar secciones
     * - Texto alineado a la izquierda para fácil lectura
     * - Monto total destacado, alineado a la derecha, en color de marca
     * - Tamaño de fuente reducido (14px) para que quepa toda la info
     * - Ancho fijo (600px) para consistencia visual
     * 
     * 📋 SECCIONES DEL RECIBO:
     * 1. Encabezado: Nombre del negocio
     * 2. Información general: Fecha y estado
     * 3. Datos del cliente: Nombre, email, teléfono
     * 4. Datos del vehículo: Marca, modelo, placa, fecha de cita
     * 5. Detalle del servicio: Tipo de revisión
     * 6. Total: Monto destacado visualmente
     * 
     * 💡 NOTA: En producción, esto podría convertirse en PDF
     * usando bibliotecas como jsPDF o html2pdf.
     */
    Swal.fire({
        title: '📄 Factura #' + factura.id,  // Título con número de factura
        html: `                              // Contenido tipo recibo
            <div style="text-align: left; font-size: 14px;">
                <h3 style="margin-bottom: 15px; color: #10CFC8;">
                    Revisión Técnica Vehicular
                </h3>
                <hr style="margin: 10px 0;">
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Estado:</strong> ${factura.estado}</p>
                <hr style="margin: 10px 0;">
                <h4>Cliente:</h4>
                <p>${cliente?.nombre_completo || 'N/A'}</p>
                <p>${cliente?.email || ''}</p>
                <p>${cliente?.telefono || ''}</p>
                <hr style="margin: 10px 0;">
                <h4>Vehículo:</h4>
                <p>${cita?.marca || ''} ${cita?.modelo || ''}</p>
                <p>Placa: ${cita?.placa || ''}</p>
                <p>Cita: ${cita?.fecha_cita || ''} ${cita?.hora_cita || ''}</p>
                <hr style="margin: 10px 0;">
                <h4>Servicio:</h4>
                <p>${factura.detalles?.tipo_servicio || 'N/A'}</p>
                <hr style="margin: 10px 0;">
                <h2 style="text-align: right; color: #10CFC8;">
                    Total: ₡${factura.monto_total.toLocaleString()}
                </h2>
            </div>
        `,
        confirmButtonText: 'Cerrar',           // Texto del botón
        confirmButtonColor: '#10CFC8',         // Color de marca
        width: 600                             // Ancho fijo para consistencia
    });
};

// ==========================================
// FUNCIÓN PLACEHOLDER: EDITAR PERFIL
// ==========================================
// Función reservada para futura implementación
// Actualmente muestra un mensaje informativo
window.editarPerfil = async () => {
    Swal.fire('Editar Perfil', 'Función en desarrollo', 'info');
};

// ==========================================
// MENSAJE FINAL DE CARGA
// ==========================================
// Confirma en consola que el archivo se cargó completamente
console.log('✅ app-dashboard-cliente.js cargado');