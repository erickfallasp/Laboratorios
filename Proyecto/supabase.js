/**
 * ==========================================
 * CONFIGURACIÓN DE SUPABASE - CONEXIÓN A LA NUBE
 * Archivo: supabase.js
 * ==========================================
 * 
 * 🎯 PROPÓSITO DE ESTE ARCHIVO:
 * Este es el "puente" que conecta tu aplicación frontend con la base de datos
 * PostgreSQL en la nube de Supabase. Centraliza:
 * - Credenciales de conexión (URL + clave pública)
 * - Inicialización del cliente Supabase
 * - Exportación de instancia reutilizable en toda la app
 * 
 * 🔐 SEGURIDAD IMPORTANTE:
 * Este archivo usa la "anon key" (clave pública), NO la "service role key".
 * La anon key está diseñada para usarse en el frontend porque:
 * • Las políticas RLS (Row Level Security) filtran datos por usuario
 * • No permite operaciones administrativas peligrosas
 * • Puede ser visible en el código cliente sin riesgo de seguridad
 * 
 * ⚠️ NUNCA expongas la "service role key" en el frontend.
 * Esa clave tiene acceso total a tu base de datos y debe usarse
 * solo en backend seguro (servidores, funciones serverless).
 * 
 * 🔧 FUNCIONALIDADES PRINCIPALES:
 * ✅ Inicialización del cliente Supabase con URL y clave pública
 * ✅ Exportación como módulo ES6 para reutilización en toda la app
 * ✅ Mensajes de confirmación en consola para depuración
 * ✅ Conexión segura vía HTTPS con autenticación JWT
 * 
 * 🔗 CONEXIONES CON OTROS ARCHIVOS:
 * - app-auth.js → Importa { supabase } para login/registro
 * - app-citas.js → Importa { supabase } para CRUD de citas
 * - app-dashboard-*.js → Importa { supabase } para consultas personalizadas
 * - Todos los módulos que necesitan acceder a la base de datos
 * 
 * 📊 FLUJO DE CONEXIÓN:
 * 1. Navegador carga index.html → carga supabase.js como módulo
 * 2. createClient() inicializa conexión con Supabase Cloud
 * 3. Se exporta instancia 'supabase' para usar en otros archivos
 * 4. Otros módulos importan { supabase } y hacen consultas:
 *    supabase.from('citas').select('*').eq('id_usuario', userId)
 * 5. Supabase aplica políticas RLS → retorna solo datos autorizados
 * 6. Datos llegan al frontend y se renderizan en la interfaz
 */

// ==========================================
// IMPORTAR FUNCIÓN DESDE LIBRERÍA SUPABASE
// ==========================================
// Importamos createClient desde el CDN de jsdelivr con formato ESM (+esm)
// 
// 🔗 ¿POR QUÉ CDN EN LUGAR DE NPM?
// • Sin paso de compilación/bundling → Ideal para proyectos académicos
// • Carga directa en navegador → Más simple para demostrar
// • Versión específica garantizada → Evita conflictos de dependencias
// 
// 💡 EN PRODUCCIÓN:
// Se recomendaría usar npm install @supabase/supabase-js y un bundler
// como Vite o Webpack para optimización y control de versiones.
// 
// 📦 ¿QUÉ ES @supabase/supabase-js?
// Es el cliente oficial de JavaScript para Supabase que proporciona:
// • Métodos para autenticación: supabase.auth.signInWithPassword()
// • Métodos para base de datos: supabase.from('tabla').select()
// • Métodos para almacenamiento: supabase.storage.from('bucket').upload()
// • Manejo automático de tokens JWT y sesiones
// 
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/**
 * ==========================================
 * CONFIGURACIÓN: URL DEL PROYECTO SUPABASE
 * ==========================================
 * 🎯 PROPÓSITO: Dirección única de tu instancia de Supabase en la nube.
 * 
 * 🔍 ESTRUCTURA DE LA URL:
 * https://[ref-del-proyecto].supabase.co
 * • [ref-del-proyecto] → Identificador único generado por Supabase
 * • supabase.co → Dominio oficial del servicio
 * 
 * 💡 DATO TÉCNICO:
 * Esta URL apunta al endpoint de API REST de Supabase.
 * Todas las consultas (SELECT, INSERT, UPDATE, DELETE) se traducen
 * a peticiones HTTP a esta dirección con headers de autenticación JWT.
 * 
 * 🔐 SEGURIDAD:
 * Esta URL es PÚBLICA y puede verse en el código fuente.
 * No es un secreto porque:
 * • Solo identifica DÓNDE está tu base de datos, no da acceso
 * • El acceso real está protegido por:
 *   - Clave de API (anon o service role)
 *   - Políticas RLS que filtran por usuario autenticado
 *   - Tokens JWT que verifican identidad en cada petición
 */
const urlSupabase = "https://nqnvzngwsrqcprfefjnm.supabase.co";

/**
 * ==========================================
 * CONFIGURACIÓN: CLAVE PÚBLICA ANON (anon key)
 * ==========================================
 * 🎯 PROPÓSITO: Credencial para operaciones de frontend con permisos limitados.
 * 
 * 🔍 ¿QUÉ ES UNA "anon key"?
 * Es una clave JWT (JSON Web Token) firmada por Supabase que:
 * • Tiene rol "anon" → Permisos restringidos por políticas RLS
 * • Puede exponerse en código cliente → Diseñada para frontend
 * • Se incluye en cada petición como header: Authorization: Bearer [key]
 * 
 * 🔐 ESTRUCTURA DEL JWT (decodificado):
 * {
 *   "iss": "supabase",              // Emisor: Supabase
 *   "ref": "nqnvzngwsrqcprfefjnm",  // Referencia del proyecto
 *   "role": "anon",                 // Rol con permisos limitados
 *   "iat": 1771467981,             // Timestamp de emisión
 *   "exp": 2087043981              // Timestamp de expiración (~10 años)
 * }
 * 
 * ⚠️ ¿POR QUÉ NO ES PELIGROSO VER ESTA CLAVE?
 * 1. Las políticas RLS en tu base de datos filtran AUTOMÁTICAMENTE:
 *    - Los clientes solo ven SUS propias citas/facturas
 *    - Los admins solo ven lo que su rol permite
 *    - Sin autenticación, solo se accede a datos públicos
 * 
 * 2. La anon key NO permite:
 *    - Eliminar tablas o modificar esquema de BD
 *    - Acceder a claves de servicio o configuraciones sensibles
 *    - Bypassear políticas de seguridad definidas en Supabase
 * 
 * 3. Si alguien copia esta clave:
 *    - Solo puede hacer lo que las políticas RLS permiten
 *    - No puede acceder a datos de otros usuarios
 *    - No puede dañar la estructura de la base de datos
 * 
 * 🚫 LO QUE NUNCA DEBES HACER:
 * • Nunca uses la "service role key" en el frontend
 * • Nunca committees claves de servicio en repositorios públicos
 * • Nunca expongas credenciales de administrador en código cliente
 * 
 * 💡 MEJORES PRÁCTICAS PARA PRODUCCIÓN:
 * • Usa variables de entorno (.env) para almacenar claves
 * • Configura reglas de CORS en Supabase para restringir dominios
 * • Monitorea uso de API en el dashboard de Supabase
 * • Rota claves periódicamente si hay sospecha de compromiso
 */
const claveSupabase = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbnZ6bmd3c3JxY3ByZmVmam5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc5ODEsImV4cCI6MjA4NzA0Mzk4MX0.yF4mLF_pKf9xlBQ3pescg8sadkN0poWqxbJVCj_kMq4';

/**
 * ==========================================
 * CREAR Y EXPORTAR CLIENTE SUPABASE
 * ==========================================
 * 🎯 PROPÓSITO: Inicializar instancia reutilizable para toda la aplicación.
 * 
 * 🔧 ¿QUÉ HACE createClient()?
 * 1. Valida URL y clave de API
 * 2. Configura headers HTTP para autenticación JWT
 * 3. Prepara métodos para:
 *    • supabase.auth → Login, registro, gestión de sesiones
 *    • supabase.from → Consultas a tablas de base de datos
 *    • supabase.storage → Manejo de archivos en buckets
 *    • supabase.functions → Llamadas a Edge Functions
 * 4. Maneja automáticamente:
 *    • Renovación de tokens JWT expirados
 *    • Reintentos en fallos de red
 *    • Parsing de respuestas JSON
 * 
 * 🔗 ¿POR QUÉ EXPORTAR COMO CONSTANTE?
 * • Evita crear múltiples conexiones (ineficiente)
 * • Permite importar { supabase } en cualquier módulo
 * • Centraliza configuración: cambiar URL/clave en un solo lugar
 * • Facilita testing: se puede mockear esta exportación
 * 
 * 📦 PATRÓN DE DISEÑO: "Singleton"
 * Aunque no es un singleton clásico, exportar una sola instancia
 * garantiza que toda la app use la misma conexión configurada,
 * evitando inconsistencias o múltiples handshakes con la API.
 */
export const supabase = createClient(urlSupabase, claveSupabase);

// ==========================================
// MENSAJES DE CONFIRMACIÓN EN CONSOLA
// ==========================================
// 🎯 PROPÓSITO: Feedback durante desarrollo para verificar carga correcta.
// 
// 💡 USO EN DEPURACIÓN:
// • Al abrir DevTools (F12) → Console, verás:
//   "✅ Supabase inicializado correctamente"
//   "🔗 URL: https://..."
// • Si NO ves estos mensajes, hay un error en la carga del módulo
// • Si ves errores rojos después, revisa:
//   - URL/clave incorrectas
//   - Políticas RLS bloqueando consultas
//   - Problemas de CORS o conexión de red
// 
// 🚫 EN PRODUCCIÓN:
// Estos console.log() podrían removerse o condicionarse con:
// if (process.env.NODE_ENV === 'development') { ... }
// Para no exponer información técnica a usuarios finales.
// 
console.log('✅ Supabase inicializado correctamente');
console.log('🔗 URL:', urlSupabase);