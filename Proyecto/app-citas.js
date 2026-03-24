import { supabase } from "./supabase.js";

console.log('✅ Cargando app-citas.js');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('citaForm');
    const fechaInput = document.getElementById('fechaCita');
    const horaSelect = document.getElementById('horaCita');
    
    // Validar horas
    if (fechaInput && horaSelect) {
        fechaInput.addEventListener('change', async () => {
            const fecha = fechaInput.value;
            console.log('📅 Fecha:', fecha);
            
            if (!fecha) return;
            
            horaSelect.disabled = true;
            horaSelect.innerHTML = '<option>⏳ Cargando...</option>';
            
            try {
                const {  data: citas, error } = await supabase
                    .from('citas')
                    .select('hora_cita')
                    .eq('fecha_cita', fecha);
                
                console.log('📊 Respuesta:', { citas, error });
                
                if (error) throw error;
                
                const ocupadas = citas?.map(c => c.hora_cita) || [];
                console.log('🚫 Ocupadas:', ocupadas);
                
                const horas = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
                
                horaSelect.innerHTML = '<option value="">-- Seleccione --</option>';
                
                horas.forEach(hora => {
                    const option = document.createElement('option');
                    option.value = hora;
                    
                    if (ocupadas.includes(hora)) {
                        option.disabled = true;
                        option.textContent = `❌ ${hora} - OCUPADA`;
                    } else {
                        option.textContent = `${hora} - DISPONIBLE`;
                    }
                    
                    horaSelect.appendChild(option);
                });
                
                horaSelect.disabled = false;
                
            } catch (err) {
                console.error('❌ Error:', err);
                horaSelect.innerHTML = '<option>Error</option>';
                horaSelect.disabled = false;
            }
        });
    }
    
    // Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const tipoVehiculo = document.querySelector('input[name="tipoVehiculo"]:checked');
            if (!tipoVehiculo) {
                alert('Seleccione tipo de vehículo');
                return;
            }
            
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
            
            try {
                await Swal.fire({
                    title: '⏳ Agendando...',
                    text: 'Espere...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });
                
                const { error } = await supabase.from('citas').insert([datos]);
                
                if (error) throw error;
                
                await Swal.fire({
                    icon: 'success',
                    title: '✅ ¡Cita Agendada!',
                    text: `${datos.nombre} - ${datos.placa}`,
                    confirmButtonText: 'Ver citas'
                });
                
                form.reset();
                horaSelect.innerHTML = '<option value="">-- Seleccione --</option>';
                fechaInput.value = '';
                
                setTimeout(() => window.location.href = 'citas-agendadas.html', 1000);
                
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        });
    }
});