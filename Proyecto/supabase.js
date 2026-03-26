/**
 * ==========================================
 * CONFIGURACIÓN DE SUPABASE
 * ==========================================
 * Este archivo configura el cliente de Supabase
 * que permite conectar con la base de datos PostgreSQL
 * en la nube.
 */

// Importamos la función createClient desde la librería Supabase
// Usamos CDN con importación ES modules (+esm)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/**
 * URL del proyecto en Supabase
 * Esta es la dirección de tu base de datos en la nube
 */
const supabaseUrl = "https://nqnvzngwsrqcprfefjnm.supabase.co";

/**
 * Clave pública anon (public anon key)
 * Permite acceso público a la base de datos
 * NOTA: En producción, usar políticas de seguridad RLS
 */
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbnZ6bmd3c3JxY3ByZmVmam5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc5ODEsImV4cCI6MjA4NzA0Mzk4MX0.yF4mLF_pKf9xlBQ3pescg8sadkN0poWqxbJVCj_kMq4';

/**
 * Creamos y exportamos el cliente de Supabase
 * Este objeto se usará en todos los archivos JS
 * para interactuar con la base de datos
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

// Mensaje de confirmación en consola
console.log('✅ Supabase inicializado correctamente');
console.log('🔗 URL:', supabaseUrl);