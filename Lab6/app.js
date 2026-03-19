// importamos el cliente de Supabase para interactuar con la base de datos
// este cliente ya está configurado con la URL y la clave de acceso a nuestra instancia de Supabase
import { supabase } from "./supabase.js";

//****************************************
// Referencias a elementos del DOM
//****************************************
// Botones
const btnClear = document.getElementById("btnClear");
const btnAdd = document.getElementById("btnAdd");
const btnCancel = document.getElementById("btnCancel");
const btnLoad = document.getElementById("btnLoad");
// Campo de búsqueda
const txtSearch = document.getElementById("txtSearch");
//Formulario
const txtId = document.getElementById("txtId");
const txtNombre = document.getElementById("txtNombre");
const txtApellido = document.getElementById("txtApellido");
const txtCorreo = document.getElementById("txtCorreo");
const txtCarrera = document.getElementById("txtCarrera");
// Tabla
const tbody = document.getElementById("tbodyStudents");
const tituloForm = document.getElementById("tituloForm");

//Consultar estudiantes al cargar la página
window.onload = () => {
  consultarEstudiantes();
};
//****************************************
//Eventos
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

// Editar - consulto por el id -
// lleno el formulario con los datos del estudiante -
// cambio el botón de agregar a actualizar -
// al hacer click en actualizar, actualizo el estudiante en la base de datos
tbody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!target.classList.contains("btnEditar")) return;

  const id = target.getAttribute("data-id");

  // 1. Consultar el estudiante por su id
  const { data, error } = await supabase.from("estudiantes").select("id,nombre,apellido,correo,carrera").eq("id", id).single();

  if (error) {
    console.error(error);
    alert("Error al cargar estudiante");
    return;
  }
  // 2. Llenar el formulario con los datos del estudiante
  txtId.value = data.id;
  txtNombre.value = data.nombre;
  txtApellido.value = data.apellido;
  txtCorreo.value = data.correo;
  txtCarrera.value = data.carrera;
  // 3. Cambiar el botón de agregar a actualizar
  btnAdd.textContent = "Actualizar";
  tituloForm.textContent = "Editar Estudiante";
});

/*
// funcion de flecha
// const consultarEstudiantes = async () => {};
// funcion tradicional
// function consultarEstudiantes() {}

// let y const
// let x = 10;
// x = 20;
// const y = 30;
// y = 40; // error, no se puede reasignar una constante
// var z = 50;
// var z = 60; // no error, var permite redeclarar la misma variable
*/

//****************************************
//Funciones
//****************************************
const consultarEstudiantes = async () => {
  // usamos el cliente de Supabase para hacer una consulta a la tabla "estudiantes"
  // json: { "data": [], "error": null }
  const search = txtSearch.value.trim() || ""; // si el valor es vacío, se asigna una cadena vacía
  const query = supabase.from("estudiantes").select("id,nombre,apellido,correo,carrera");

  // filtros
  if (search.length > 0) {
    // query.ilike("nombre", `%${search}%`);
    query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`);
  }
  const { data, error } = await query;

  if (error) {
    console.error(error);
    alert("Error cargando estudiantes");
    return;
  }

  // Limpiando y llenando la tabla con los datos obtenidos
  tbody.innerHTML = "";

  // data es un arreglo de objetos, cada objeto representa un estudiante
  data.forEach((r) => {
    const tr = document.createElement("tr"); //<tr></tr>
    tr.setAttribute("data-id", r.id);
    //<td>${r.id ?? ""}</td>
    tr.innerHTML = `
        <td>${r.nombre ?? ""}</td>
        <td>${r.apellido ?? ""}</td>
        <td>${r.correo ?? ""}</td>
        <td>${r.carrera ?? ""}</td>
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
  };

  if (!estudiante.nombre || !estudiante.apellido || !estudiante.correo || !estudiante.carrera) {
    alert("Por favor, complete todos los campos");
    return;
  }

  if (txtId.value) {
    // Actualizar estudiante existente
    const { error } = await supabase.from("estudiantes").update([estudiante]).eq("id", txtId.value);

    if (error) {
      console.error(error);
      alert("Error actualizando estudiante");
      return;
    }
  } else {
    // Agregar nuevo estudiante
    const { error } = await supabase.from("estudiantes").insert([estudiante]);

    if (error) {
      console.error(error);
      alert("Error guardando estudiante");
      return;
    }
  }

  alert("Estudiante guardado exitosamente");
  limpiarFormulario();
  consultarEstudiantes();
};

const eliminarEstudiante = async (id) => {
  if (!confirm("¿Está seguro de eliminar este estudiante?")) return;
  const { error } = await supabase.from("estudiantes").delete().eq("id", id);

  if (error) {
    console.error(error);
    alert("Error al eliminar");
  } else {
    consultarEstudiantes();
  }
};

const limpiarFormulario = () => {
  txtId.value = "";
  txtNombre.value = "";
  txtApellido.value = "";
  txtCorreo.value = "";
  txtCarrera.value = "";
  btnAdd.textContent = "Agregar";
  tituloForm.textContent = "Agregar Estudiantes";
};
 