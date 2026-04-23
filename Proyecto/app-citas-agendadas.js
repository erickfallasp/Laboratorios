/**
 * ==========================================
 * CITAS AGENDADAS - LÓGICA DE VISUALIZACIÓN
 * Archivo: app-citas-agendadas.js
 * ==========================================
 * 
 * 🎯 PROPÓSITO DEL ARCHIVO:
 * Este archivo maneja la página PÚBLICA donde se muestran
 * TODAS las citas agendadas (visible para cualquier visitante).
 * 
 * ⚠️ NOTA IMPORTANTE:
 * Esta página NO usa autenticación, por lo que muestra
 * datos públicos. En un entorno real, esto debería protegerse.
 * 
 * 🔧 FUNCIONALIDADES:
 * 1. 📥 Cargar todas las citas desde Supabase
 * 2. 📋 Mostrarlas en una tabla HTML con formato amigable
 * 3. 🗑️ Permitir eliminar citas (con confirmación)
 * 4. 📅 Formatear fechas de ISO a español legible
 * 
 * 🔗 CONEXIONES CON OTROS ARCHIVOS:
 * - Importa 'supabase' desde supabase.js para conectar con la BD
 * - Usa SweetAlert2 (CDN en HTML) para alertas bonitas
 * - Se conecta con la tabla pública: public.citas
 * 
 * 📊 ESTRUCTURA DE DATOS ESPERADA (tabla 'citas'):
 * {
 *   id: bigint,           // ID único de la cita
 *   nombre: text,         // Nombre del cliente
 *   email: text,          // Email del cliente
 *   telefono: text,       // Teléfono de contacto
 *   tipo_vehiculo: text,  // Tipo: menor_3_5_ton, motocicleta, etc.
 *   placa: text,          // Placa del vehículo
 *   marca: text,          // Marca: Toyota, Honda, etc.
 *   modelo: text,         // Modelo: Corolla, Civic, etc.
 *   anio: text,           // Año del vehículo
 *   fecha_cita: date,     // Fecha programada (YYYY-MM-DD)
 *   hora_cita: text,      // Hora programada (HH:MM)
 *   id_usuario: uuid      // [OPCIONAL] ID del usuario si está logueado
 * }
 */

// ==========================================
// IMPORTAR DEPENDENCIAS
// ==========================================
// Importamos el cliente de Supabase que ya está configurado
// en el archivo supabase.js (contiene URL y clave pública)
import { supabase } from "./supabase.js";

// Mensaje de confirmación en consola (útil para depuración)
// Aparece en F12 → Console cuando se carga el archivo
console.log('✅ Cargando app-citas-agendadas.js');

// ==========================================
// EVENTO PRINCIPAL: AL CARGAR LA PÁGINA
// ==========================================
// Este código se ejecuta automáticamente cuando:
// - El HTML está completamente cargado
// - Todos los elementos del DOM están disponibles
// - Es seguro manipular la página con JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM cargado, cargando citas...');
    
    // Llamamos a la función principal que carga y muestra las citas
    // Esta es la función "orquestadora" del archivo
    cargarCitas();
});

// ==========================================
// FUNCIÓN PRINCIPAL: CARGAR CITAS
// ==========================================
// Esta es la función MÁS IMPORTANTE del archivo
// Se encarga de TODO el proceso: consultar → procesar → mostrar
const cargarCitas = async () => {
    console.log('🔍 Iniciando carga de citas...');
    
    // ==========================================
    // PASO 1: OBTENER REFERENCIAS DEL HTML
    // ==========================================
    // Buscamos los elementos del DOM por sus IDs para manipularlos después
    const cuerpoTabla = document.getElementById('tbodyCitas');      // Donde van las filas
    const mensajeSinCitas = document.getElementById('sinCitas');    // Mensaje "No hay citas"
    const tabla = document.getElementById('tablaCitas');            // La tabla completa
    
    // ==========================================
    // VALIDACIÓN DE SEGURIDAD
    // ==========================================
    // Si no encontramos el cuerpo de la tabla, algo está mal en el HTML
    // Salimos temprano para evitar errores más graves
    if (!cuerpoTabla) {
        console.error('❌ No se encontró tbodyCitas');
        return;  // Detenemos la ejecución
    }
    
    // ==========================================
    // PASO 2: MOSTRAR ESTADO DE CARGA
    // ==========================================
    // Mientras consultamos a Supabase (que puede tardar),
    // mostramos un mensaje amigable al usuario
    cuerpoTabla.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>';
    
    // ==========================================
    // PASO 3: CONSULTAR A SUPABASE (TRY-CATCH)
    // ==========================================
    // Usamos try-catch porque las consultas a la nube pueden fallar:
    // - Sin conexión a internet
    // - Credenciales inválidas
    // - Tabla no existe
    // - Permisos insuficientes (RLS)
    try {
        console.log('📡 Consultando Supabase...');
        
        /**
         * ==========================================
         * CONSULTA SQL EQUIVALENTE:
         * ==========================================
         * SELECT * FROM citas 
         * ORDER BY fecha_cita ASC, hora_cita ASC;
         * 
         * EXPLICACIÓN DEL CÓDIGO:
         * .from('citas')           → Selecciona la tabla
         * .select('*')             → Trae todas las columnas
         * .order('fecha_cita')     → Ordena primero por fecha
         * .order('hora_cita')      → Luego por hora (sub-orden)
         * 
         * ¿Por qué dos .order()?
         * Para que las citas del mismo día se muestren
         * en orden cronológico de horas.
         */
        const {  citas, error } = await supabase
            .from('citas')                          // 📦 Tabla de origen
            .select('*')                            // 📋 Columnas a traer (* = todas)
            .order('fecha_cita', { ascending: true })  // 📅 Orden por fecha (más antigua primero)
            .order('hora_cita', { ascending: true });  // ⏰ Luego por hora
        
        // ==========================================
        // DEPURACIÓN: Ver respuesta en consola
        // ==========================================
        // Esto ayuda a entender qué está regresando Supabase
        console.log('📊 Respuesta:', { citas, error });
        
        // ==========================================
        // VALIDAR ERROR DE CONSULTA
        // ==========================================
        // Si Supabase regresó un error, lo lanzamos
        // para que lo capture el bloque catch más abajo
        if (error) {
            console.error('❌ Error en consulta:', error);
            throw error;  // "Lanzamos" el error para manejarlo centralizadamente
        }
        
        /**
         * ==========================================
         * CASO A: NO HAY CITAS REGISTRADAS
         * ==========================================
         * Si la consulta fue exitosa pero no hay datos,
         * mostramos un mensaje amigable en lugar de una tabla vacía
         */
        if (!citas || citas.length === 0) {
            console.log('ℹ️ No hay citas registradas');
            
            // Ocultamos la tabla (no tiene sentido mostrar tabla vacía)
            tabla.style.display = 'none';
            
            // Mostramos el mensaje alternativo "No hay citas"
            mensajeSinCitas.style.display = 'block';
            
            // Salimos porque no hay nada más que procesar
            return;
        }
        
        /**
         * ==========================================
         * CASO B: HAY CITAS PARA MOSTRAR
         * ==========================================
         * Si hay datos, preparamos la interfaz para mostrarlos
         */
        console.log('✅ Citas encontradas:', citas.length);
        
        // Mostramos la tabla (por si estaba oculta)
        tabla.style.display = 'table';
        
        // Ocultamos el mensaje de "sin citas" (por si estaba visible)
        mensajeSinCitas.style.display = 'none';
        
        // Limpiamos el cuerpo de la tabla antes de llenarlo
        // Esto es importante si el usuario recarga o filtra
        cuerpoTabla.innerHTML = '';
        
        /**
         * ==========================================
         * PASO 4: GENERAR FILAS DINÁMICAMENTE
         * ==========================================
         * Por cada cita que regresó Supabase, creamos
         * una fila HTML (<tr>) con los datos formateados
         */
        citas.forEach((cita, indice) => {
            console.log(`📝 Procesando cita ${indice + 1}:`, cita);
            
            // ==========================================
            // CREAR ELEMENTO <tr> NUEVO
            // ==========================================
            // document.createElement crea un elemento HTML desde JavaScript
            // Este <tr> aún no está en la página, solo en memoria
            const fila = document.createElement('tr');
            
            /**
             * ==========================================
             * FORMATEAR FECHA PARA EL USUARIO
             * ==========================================
             * Supabase guarda fechas como "2026-03-24" (ISO)
             * Pero los usuarios prefieren "24 de marzo de 2026"
             * 
             * Llamamos a una función auxiliar (más abajo)
             * que se encarga de esta transformación
             */
            const fechaFormateada = formatearFecha(cita.fecha_cita);
            
            /**
             * ==========================================
             * GENERAR HTML DE LA FILA (Template Literal)
             * ==========================================
             * Usamos comillas invertidas (` `) para crear HTML
             * con variables interpoladas (${variable})
             * 
             * ESTRUCTURA DE COLUMNAS:
             * 1. Fecha formateada
             * 2. Hora (tal cual viene de la BD)
             * 3. Nombre del cliente
             * 4. Teléfono de contacto
             * 5. Marca + Modelo del vehículo
             * 6. Placa (dentro de un <span class="badge"> para estilo)
             * 7. Botón de eliminar con evento onclick
             * 
             * ⚠️ NOTA DE SEGURIDAD:
             * En producción, deberíamos escapar los datos
             * para prevenir ataques XSS. Para este proyecto
             * educativo, asumimos datos confiables.
             */
            fila.innerHTML = `
                <td>${fechaFormateada}</td>
                <td>${cita.hora_cita}</td>
                <td>${cita.nombre}</td>
                <td>${cita.telefono}</td>
                <td>${cita.marca} ${cita.modelo}</td>
                <td><span class="badge">${cita.placa}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" 
                            onclick="eliminarCita(${cita.id})" 
                            title="Eliminar">
                        🗑️
                    </button>
                </td>
            `;
            
            /**
             * ==========================================
             * AGREGAR FILA A LA TABLA
             * ==========================================
             * appendChild() inserta el elemento <tr> que creamos
             * dentro del <tbody> de la tabla, haciéndolo visible
             * en la página para el usuario
             */
            cuerpoTabla.appendChild(fila);
        });
        
        // Mensaje final de éxito en consola
        console.log('✅ Tabla actualizada con', citas.length, 'citas');
        
    } catch (error) {
        /**
         * ==========================================
         * MANEJO DE ERRORES (BLOQUE CATCH)
         * ==========================================
         * Si algo falló en el try (red, BD, permisos, etc.),
         * llegamos aquí para manejar el error de forma amigable
         */
        console.error('❌ Error al cargar citas:', error);
        
        // ==========================================
        // MOSTRAR ERROR EN LA TABLA
        // ==========================================
        // En lugar de dejar la tabla vacía o congelada,
        // mostramos el mensaje de error dentro de ella
        cuerpoTabla.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        
        // ==========================================
        // ALERTA VISUAL PARA EL USUARIO
        // ==========================================
        // SweetAlert2 muestra una ventana modal bonita
        // en lugar del alert() nativo del navegador
        Swal.fire({
            icon: 'error',                    // Ícono rojo de error
            title: 'Error al cargar citas',   // Título de la alerta
            text: error.message,              // Mensaje técnico (en desarrollo)
            confirmButtonText: 'Aceptar'      // Texto del botón
        });
    }
};

// ==========================================
// FUNCIÓN AUXILIAR: FORMATEAR FECHA
// ==========================================
// Esta función es reutilizable y se encarga SOLO
// de convertir fechas de formato técnico a formato humano
const formatearFecha = (cadenaFecha) => {
    // ==========================================
    // VALIDACIÓN DE ENTRADA
    // ==========================================
    // Si recibimos null, undefined o string vacío,
    // retornamos vacío para no romper la interfaz
    if (!cadenaFecha) return '';
    
    /**
     * ==========================================
     * CONFIGURAR OPCIONES DE FORMATO
     * ==========================================
     * toLocaleDateString() acepta un objeto con opciones
     * para personalizar cómo se muestra la fecha
     * 
     * OPCIONES USADAS:
     * - year: 'numeric'   → "2026" (no "26")
     * - month: 'long'     → "marzo" (no "3" ni "mar")
     * - day: 'numeric'    → "24" (no "24th")
     */
    const opciones = { 
        year: 'numeric',    // Año completo: 2026
        month: 'long',      // Mes completo: marzo
        day: 'numeric'      // Día: 24
    };
    
    /**
     * ==========================================
     * CONVERTIR Y FORMATEAR
     * ==========================================
     * 1. new Date(cadenaFecha) → Convierte string ISO a objeto Date
     * 2. toLocaleDateString('es-ES', opciones) → Formatea en español
     * 
     * EJEMPLO:
     * Entrada:  "2026-03-24"
     * Salida:   "24 de marzo de 2026"
     * 
     * 🌍 NOTA: 'es-ES' es español de España. Para Costa Rica
     * podríamos usar 'es-CR' si queremos formato local específico.
     */
    return new Date(cadenaFecha).toLocaleDateString('es-ES', opciones);
};

// ==========================================
// FUNCIÓN GLOBAL: ELIMINAR CITA
// ==========================================
// Esta función se asigna a window para que el HTML
// pueda llamarla desde el atributo onclick del botón
// 
// 🔗 CONEXIÓN CON HTML:
// <button onclick="eliminarCita(15)">🗑️</button>
//                      ↑
//              Este número (15) es el 'identificador'
window.eliminarCita = async (identificador) => {
    /**
     * ==========================================
     * PASO 1: CONFIRMAR CON EL USUARIO
     * ==========================================
     * Antes de borrar datos importantes, siempre
     * pedimos confirmación para evitar accidentes
     * 
     * SweetAlert2 permite crear modales personalizados
     * con botones de confirmar/cancelar
     */
    const resultado = await Swal.fire({
        title: '¿Eliminar cita?',                    // Título de la alerta
        text: "No podrás revertir esta acción",      // Mensaje de advertencia
        icon: 'warning',                             // Ícono amarillo de precaución
        showCancelButton: true,                      // Mostrar botón "Cancelar"
        confirmButtonColor: '#EB6763',               // Color rojo para "Eliminar"
        confirmButtonText: 'Sí, eliminar',           // Texto del botón principal
        cancelButtonText: 'Cancelar'                 // Texto del botón secundario
    });
    
    /**
     * ==========================================
     * PASO 2: VERIFICAR DECISIÓN DEL USUARIO
     * ==========================================
     * isConfirmed es true SOLO si el usuario hizo clic
     * en el botón de confirmar (no en cancelar ni en la X)
     */
    if (resultado.isConfirmed) {
        try {
            console.log('🗑️ Eliminando cita ID:', identificador);
            
            /**
             * ==========================================
             * PASO 3: ELIMINAR EN SUPABASE
             * ==========================================
             * CONSULTA SQL EQUIVALENTE:
             * DELETE FROM citas WHERE id = identificador;
             * 
             * EXPLICACIÓN:
             * .from('citas')  → Tabla de donde borrar
             * .delete()       → Operación de eliminación
             * .eq('id', id)   → Condición: donde id sea igual al parámetro
             * 
             * ⚠️ IMPORTANTE:
             * Esta eliminación está sujeta a las políticas RLS
             * de Supabase. Si RLS está activo, solo se podrán
             * borrar citas que el usuario tenga permiso de modificar.
             */
            const { error } = await supabase
                .from('citas')           // 📦 Tabla objetivo
                .delete()                // 🗑️ Operación de borrado
                .eq('id', identificador); // 🔍 Condición: id = X
            
            // ==========================================
            // VALIDAR ERROR DE ELIMINACIÓN
            // ==========================================
            if (error) throw error;  // Si falló, manejar en catch
            
            console.log('✅ Cita eliminada');
            
            /**
             * ==========================================
             * PASO 4: FEEDBACK VISUAL DE ÉXITO
             * ==========================================
             * Mostramos una alerta de éxito que se cierra
             * automáticamente después de 2 segundos
             */
            Swal.fire({
                icon: 'success',              // Ícono verde de éxito
                title: '¡Eliminada!',         // Título corto
                timer: 2000,                  // Auto-cerrar en 2000ms (2 segundos)
                showConfirmButton: false      // No mostrar botón (se cierra solo)
            });
            
            /**
             * ==========================================
             * PASO 5: ACTUALIZAR LA INTERFAZ
             * ==========================================
             * Llamamos nuevamente a cargarCitas() para:
             * 1. Volver a consultar a Supabase
             * 2. Regenerar la tabla sin la cita eliminada
             * 3. Dar feedback inmediato al usuario
             * 
             * Esto se llama "refresco optimista" o "re-render"
             */
            cargarCitas();
            
        } catch (error) {
            /**
             * ==========================================
             * MANEJO DE ERRORES EN ELIMINACIÓN
             * ==========================================
             * Posibles causas de error:
             * - Sin conexión a internet
             * - Permisos RLS insuficientes
             * - El ID no existe (ya fue eliminado)
             * - Problemas en la base de datos
             */
            console.error('❌ Error al eliminar:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar la cita'
                // En producción, podríamos mostrar error.message
                // pero en desarrollo es útil para depurar
            });
        }
    }
    // Si el usuario canceló, simplemente no hacemos nada
    // y la cita permanece en la tabla
};

// ==========================================
// MENSAJE FINAL DE CARGA
// ==========================================
// Confirma en consola que el archivo se cargó completamente
// Útil para saber si hay problemas de importación o sintaxis
console.log('✅ app-citas-agendadas.js cargado');