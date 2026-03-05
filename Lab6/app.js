// importamos el cliente de Supabase para interactuar con la base de datos
// este cliente ya está configurado con la URL y la clave de acceso a nuestra instancia de Supabase
import { supabase } from "./supabase.js";

// obtenemos referencias a los elementos del DOM que vamos a usar

//Referencias o elementos del DOM

const txsearch = document.getElementById("txsearch");
const btnLoad = document.getElementById("btnLoad");
const tbody = document.getElementById("tbodyStudents");

btnLoad.addEventListener("click", async () => consultarEstudiantes());

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

const consultarEstudiantes = async () => {
  // usamos el cliente de Supabase para hacer una consulta a la tabla "estudiantes"
  // json: { "data": [], "error": null }
  const search = txsearch.value.trim() || ""; // si el campo de búsqueda está vacío, usamos una cadena vacía para no filtrar por nombre
  const query = supabase.from("estudiantes").select("id,nombre,apellido,correo,carrera");

  if (search.length > 0) {
    query.ilike("apellido", `%${search}%`); // agregamos un filtro para buscar por nombre usando ilike, que es insensible a mayúsculas y minúsculas

  }
  const { data, error } = await query;


  if (error) {
    console.error(error);
    alert("Error cargando estudiantes");
    return;
  }

  tbody.innerHTML = "";

  // data es un arreglo de objetos, cada objeto representa un estudiante
  data.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${r.id ?? ""}</td>
        <td>${r.nombre ?? ""}</td>
        <td>${r.apellido ?? ""}</td>
        <td>${r.correo ?? ""}</td>
        <td>${r.carrera ?? ""}</td>
      `;

    tbody.appendChild(tr);
  });
}; 