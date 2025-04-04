import React, { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Función para formatear fecha a YYYY-MM-DD
const formatDateForGantt = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date encountered: ${dateString}`);
        return null;
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error(`Error formatting date ${dateString}:`, e);
    return null;
  }
};

// Función para transformar proyectos en tareas de Gantt
const transformProjectsToGanttTasks = (projects) => {
  if (!projects || projects.length === 0) {
    return [];
  }

  return projects
    .map(project => {
        console.log(`Transforming project: ${project.name} (ID: ${project.id}) - Raw Dates: Start=${project.startDate}, End=${project.endDate}`); // Log raw dates
        const startDate = formatDateForGantt(project.startDate);
        const endDate = formatDateForGantt(project.endDate);
        console.log(`Formatted Dates: Start=${startDate}, End=${endDate}`); // Log formatted dates

        // Si las fechas no son válidas, no incluir este proyecto en el Gantt
        if (!startDate || !endDate) {
            console.warn(`Skipping project "${project.name}" due to invalid dates.`);
            return null;
        }

        // Usar solo el nombre original del proyecto para la lista izquierda
        return {
            id: `proj_${project.id}`,
            name: project.name, // Nombre original
            start: startDate,
            end: endDate,
            // Guardar fechas originales para el popup
            originalStartDate: project.startDate,
            originalEndDate: project.endDate
        };
    })
    .filter(task => task !== null); // Filtrar los proyectos con fechas inválidas
};

function PortfolioGanttChart({ projects, onProjectSelect }) { // Recibir onProjectSelect
  const ganttContainerRef = useRef(null);
  const ganttInstanceRef = useRef(null);

  useEffect(() => {
    console.log("PortfolioGanttChart useEffect triggered. Projects:", projects);
    if (ganttContainerRef.current) { // Solo verificar si el contenedor existe
      // Usar la transformación real que ahora devuelve objetos Date
      const ganttTasks = transformProjectsToGanttTasks(projects);
      console.log("PortfolioGanttChart transformed tasks with Date objects:", ganttTasks);
      // Limpiar instancia anterior si existe
      if (ganttInstanceRef.current) {
         // No hay un método destroy oficial en frappe-gantt v0.6.1
         // Simplemente limpiamos el contenedor
         ganttContainerRef.current.innerHTML = '';
      }

      if (ganttTasks.length === 0) {
          console.warn("PortfolioGanttChart: No valid tasks generated from projects.");
          ganttContainerRef.current.innerHTML = '<p style="text-align: center; margin-top: 20px; font-style: italic;">No se pudieron generar barras de proyecto (verificar datos).</p>';
          return;
      }

      // Inicialización estándar con v0.6.1
      try {
        console.log("PortfolioGanttChart: Initializing Gantt instance..."); // Log corregido
        ganttInstanceRef.current = new Gantt(ganttContainerRef.current, ganttTasks, {
          header_height: 50,
          column_width: 30,
          step: 24,
          // view_modes: ['Day', 'Week', 'Month', 'Year'], // Formato antiguo (v0.6.1)
          // Posible formato nuevo para v1.x: array de objetos
          view_modes: [
            { name: 'Day', label: 'Día' }, // Usar objetos con 'name'
            { name: 'Week', label: 'Semana' },
            { name: 'Month', label: 'Mes' },
            { name: 'Year', label: 'Año' }
          ],
          bar_height: 20, // Ajustar si se prefiere
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 18,
          view_mode: 'Year',
          date_format: 'YYYY-MM-DD',
          language: 'es',
          // Definir popup personalizado para mostrar detalles al hacer hover
          custom_popup_html: function(task) {
              // Acceder a las fechas originales guardadas si es necesario, o usar las formateadas
              const startStr = formatDateForGantt(task.originalStartDate || task.start);
              const endStr = formatDateForGantt(task.originalEndDate || task.end);
              // El 'name' aquí ya no incluye las fechas, es el original
              return `
                <div class="details-container" style="padding: 5px; font-size: 12px; min-width: 150px;">
                  <strong>${task.name}</strong><br>
                  Inicio: ${startStr || 'N/A'}<br>
                  Fin: ${endStr || 'N/A'}
                </div>
              `;
          },
          on_click: (task) => { // Usar on_click para abrir proyecto
              if (task && task.id && task.id.startsWith('proj_') && onProjectSelect) {
                  const projectId = task.id.substring(5); // Extraer ID original
                  console.log(`Clicked on project bar: ${task.name}, calling onProjectSelect with ID: ${projectId}`);
                  onProjectSelect(projectId);
              } else {
                  console.warn("Click on non-project task or onProjectSelect not provided:", task);
              }
          },
          // on_dbl_click: null, // Ya no se usa doble click
          // on_date_change: null,
          // on_progress_change: null,
          // on_view_change: null
        });
        console.log("Portfolio Gantt initialized successfully (v0.6.1).");
      } catch (error) {
         console.error("Error initializing Portfolio Gantt:", error); // Log corregido
         ganttContainerRef.current.innerHTML = `<p style="text-align: center; margin-top: 20px; color: red;">Error al inicializar Gantt: ${error.message}</p>`; // Mensaje corregido
      }

    } else if (ganttContainerRef.current) {
        // Limpiar si no hay proyectos
        ganttContainerRef.current.innerHTML = '';
        ganttInstanceRef.current = null;
    }

    // No hay cleanup específico para la instancia de Gantt más allá de limpiar el DOM
  }, [projects]); // Re-renderizar si los proyectos cambian

  return (
    <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
       <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>Portafolio de Proyectos</Typography>
       {projects && projects.length > 0 ? (
         <Box ref={ganttContainerRef} sx={{ flexGrow: 1, width: '100%', height: 'calc(100% - 40px)', '& .grid-header': { fill: '#f5f5f5' }, '& .grid-row': { fill: '#ffffff' }, '& .grid-body': { strokeWidth: 0.5 } }}>
           {/* Gantt se renderizará aquí */}
         </Box>
       ) : (
         <Typography sx={{ fontStyle: 'italic', textAlign: 'center', mt: 4 }}>No hay proyectos cargados para mostrar en el portafolio.</Typography>
       )}
    </Box>
  );
}

export default PortfolioGanttChart;