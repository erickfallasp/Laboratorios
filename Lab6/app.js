import { supabase } from "./supabase.js";

//****************************************
// Referencias a elementos del DOM
//****************************************
const btnClear = document.getElementById("btnClear");
const btnAdd = document.getElementById("btnAdd");
const btnCancel = document.getElementById("btnCancel");
const btnLoad = document.getElementById("btnLoad");
const txtSearch = document.getElementById("txtSearch");
const txtId = document.getElementById("txtId");
const txtNombre = document.getElementById("txtNombre");
const txtApellido = document.getElementById("txtApellido");
const txtCorreo = document.getElementById("txtCorreo");
const txtCarrera = document.getElementById("txtCarrera");
const txtFechaNac = document.getElementById("txtFechaNac");
const tbody = document.getElementById("tbodyStudents");
const tituloForm = document.getElementById("tituloForm");

window.onload = () => {
  consultarEstudiantes();
};

//****************************************
// Eventos
//****************************************
btnLoad.addEventListener("click", async () => consultarEstudiantes());
btnAdd.addEventListener("click", async () => guardarEstudiante());
btnClear.addEventListener("click", async () => {
  txtSearch.value = "";
  await consultarEstudiantes();
});
btnCancel.addEventListener("click", async () => limpiarFormulario());

tbody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!target.classList.contains("btnEliminar")) return;
  const id = target.getAttribute("data-id");
  await eliminarEstudiante(id);
});

tbody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!target.classList.contains("btnEditar")) return;
  const id = target.getAttribute("data-id");

  const { data, error } = await supabase
    .from("estudiantes")
    .select("id,nombre,apellido,correo,carrera,FechaNacimiento")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    // ❌ Error al cargar estudiante
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cargar la información del estudiante',
      confirmButtonText: 'Aceptar'
    });
    return;
  }
  
  txtId.value = data.id;
  txtNombre.value = data.nombre;
  txtApellido.value = data.apellido;
  txtCorreo.value = data.correo;
  txtCarrera.value = data.carrera;
  txtFechaNac.value = data.FechaNacimiento || "";
  
  btnAdd.textContent = "Actualizar";
  tituloForm.textContent = "Editar Estudiante";
});

//****************************************
// Funciones auxiliares
//****************************************
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return adjustedDate.toLocaleDateString('es-ES');
};

//****************************************
// Funciones principales
//****************************************
const consultarEstudiantes = async () => {
  const search = txtSearch.value.trim() || "";
  
  const query = supabase
    .from("estudiantes")
    .select("id,nombre,apellido,correo,carrera,FechaNacimiento");

  if (search.length > 0) {
    query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error(error);
    // ❌ Error al cargar estudiantes
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cargar la lista de estudiantes',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  tbody.innerHTML = "";

  if (data.length === 0) {
    // ℹ️ Sin resultados
    Swal.fire({
      icon: 'info',
      title: 'Sin resultados',
      text: 'No se encontraron estudiantes',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  }

  data.forEach((r) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", r.id);
    
    const fechaNac = formatDate(r.FechaNacimiento);
    
    tr.innerHTML = `
      <td>${r.nombre ?? ""}</td>
      <td>${r.apellido ?? ""}</td>
      <td>${r.correo ?? ""}</td>
      <td>${r.carrera ?? ""}</td>
      <td>${fechaNac}</td>
      <td>
        <button class="btnEditar" data-id="${r.id}">Editar</button>
        <button class="btnEliminar" data-id="${r.id}">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
};

const guardarEstudiante = async () => {
  const estudiante = {
    nombre: txtNombre.value.trim(),
    apellido: txtApellido.value.trim(),
    correo: txtCorreo.value.trim(),
    carrera: txtCarrera.value.trim(),
    FechaNacimiento: txtFechaNac.value.trim() || null,
  };

  if (!estudiante.nombre || !estudiante.apellido) {
    // ⚠️ Validación de campos
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor, complete al menos nombre y apellido',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  let error;
  
  if (txtId.value) {
    // 🔄 Actualizar estudiante existente
    const result = await supabase
      .from("estudiantes")
      .update(estudiante)
      .eq("id", txtId.value);
    error = result.error;
  } else {
    // ➕ Agregar nuevo estudiante
    const result = await supabase
      .from("estudiantes")
      .insert([estudiante]);
    error = result.error;
  }

  if (error) {
    console.error(error);
    // ❌ Error al guardar
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo guardar el estudiante. Intente nuevamente.',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // ✅ Éxito al guardar
  Swal.fire({
    icon: 'success',
    title: '¡Guardado!',
    text: 'El estudiante ha sido guardado exitosamente',
    timer: 2000,
    showConfirmButton: false
  });
  
  limpiarFormulario();
  consultarEstudiantes();
};

const eliminarEstudiante = async (id) => {
  // ❓ Confirmación de eliminación con SweetAlert2
  const result = await Swal.fire({
    title: '¿Está seguro?',
    text: "No podrá revertir esta acción",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EB6763',
    cancelButtonColor: '#10CFC8',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;
  
  const { error } = await supabase
    .from("estudiantes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    // ❌ Error al eliminar
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo eliminar el estudiante',
      confirmButtonText: 'Aceptar'
    });
  } else {
    // ✅ Éxito al eliminar
    Swal.fire({
      icon: 'success',
      title: '¡Eliminado!',
      text: 'El estudiante ha sido eliminado',
      timer: 2000,
      showConfirmButton: false
    });
    consultarEstudiantes();
  }
};

const limpiarFormulario = () => {
  txtId.value = "";
  txtNombre.value = "";
  txtApellido.value = "";
  txtCorreo.value = "";
  txtCarrera.value = "";
  txtFechaNac.value = "";
  btnAdd.textContent = "Agregar";
  tituloForm.textContent = "Agregar Estudiantes";
};