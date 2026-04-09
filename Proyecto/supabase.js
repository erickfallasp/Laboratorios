/**
 * ==========================================
 * CONFIGURACIÓN DE SUPABASE
 * ==========================================
 * Este archivo configura el cliente de Supabase
 * que permite conectar con la base de datos PostgreSQL
 * en la nube.
 */

// Importamos la función crearCliente desde la librería Supabase

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/**
 * URL del proyecto en Supabase
 * Esta es la dirección de tu base de datos en la nube
 */
const urlSupabase = "https://nqnvzngwsrqcprfefjnm.supabase.co";

/**
 * Clave pública anon (public anon key)
 */
const claveSupabase = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbnZ6bmd3c3JxY3ByZmVmam5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc5ODEsImV4cCI6MjA4NzA0Mzk4MX0.yF4mLF_pKf9xlBQ3pescg8sadkN0poWqxbJVCj_kMq4';


export const supabase = createClient(urlSupabase, claveSupabase);

// Mensaje de confirmación en consola
console.log('✅ Supabase inicializado correctamente');
console.log('🔗 URL:', urlSupabase);