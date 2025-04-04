import React, { useState, useEffect, useRef } from 'react'; // Añadir useState
import Gantt from 'frappe-gantt';
// CSS se importará globalmente en main.jsx

// Helper para formatear fecha a YYYY-MM-DD
const formatDateForGantt = (dateString) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        // Asegurarse de que la fecha es válida
        if (isNaN(date.getTime())) return null;
        // Obtener año, mes y día (ajustando mes y día a dos dígitos)
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date for Gantt:", dateString, e);
        return null;
    }
};

// Helper para convertir duración en horas a días (aproximado)
const convertDurationHoursToDays = (hours) => {
    if (typeof hours !== 'number' || isNaN(hours) || hours <= 0) {
        return 1; // Duración mínima de 1 día para visualización
    }
    // Asumiendo 8 horas por día laboral
    return Math.max(1, Math.ceil(hours / 8));
};


// Añadir prop hoveredTaskId
const GanttChart = ({ tasks, dependencies, setGanttInstance, hoveredTaskId, initialViewMode = 'Week', onViewChange }) => { // Recibir onViewChange de nuevo
    const ganttRef = useRef(null);
    const ganttInstance = useRef(null); // Reintroducir la ref para la instancia local
    const currentHoveredBar = useRef(null); // Ref para la barra actualmente resaltada

    useEffect(() => {
        console.log("GanttChart: useEffect triggered. Tasks:", tasks, "Dependencies:", dependencies);

        // Limpiar SIEMPRE el contenedor antes de cualquier otra cosa
        if (ganttRef.current) {
            ganttRef.current.innerHTML = '';
        }
        // Resetear la referencia de la instancia local y notificar al padre
        ganttInstance.current = null;
        if (setGanttInstance) {
            setGanttInstance(null);
        }

        // Proceder solo si hay contenedor y tareas válidas
        if (ganttRef.current && tasks && tasks.length > 0) {
            // 1. Formatear tareas
            const formattedTasks = tasks
                .map(task => {
                    const startDate = formatDateForGantt(task.startDate);
                    let endDate = formatDateForGantt(task.endDate);
                    let durationDays = convertDurationHoursToDays(task.duration);

                    if (!startDate) {
                        console.warn(`Gantt: Task "${task.name}" (${task.id}) has invalid start date.`);
                        return null;
                    }
                    if (!endDate && startDate && durationDays > 0) {
                        try {
                            const start = new Date(startDate);
                            const end = new Date(start.setDate(start.getDate() + durationDays));
                            endDate = formatDateForGantt(end);
                        } catch (e) {
                            console.error(`Gantt: Error calculating end date for task "${task.name}"`);
                            endDate = startDate;
                        }
                    }
                    if (!endDate) {
                        endDate = startDate;
                        console.warn(`Gantt: Task "${task.name}" (${task.id}) has no end date or calculable duration. Setting end=start.`);
                    }

                    return {
                        id: task.id,
                        name: task.name,
                        start: startDate,
                        end: endDate,
                        progress: task.progress || 0,
                        dependencies: dependencies
                            ?.filter(dep => dep.successor_id === task.id && dep.predecessor_id)
                            .map(dep => dep.predecessor_id)
                            .join(', ') || '',
                        custom_class: getTaskStatusClass(task) // Usar helper para clase de estado
                    };
                })
                .filter(task => task !== null && task.start);

            console.log("GanttChart: Formatted Tasks for Frappe:", formattedTasks);

            // 2. Crear nueva instancia de Gantt si hay tareas formateadas válidas
            if (formattedTasks.length > 0) {
                 // Solo intentar crear si el contenedor está listo (ya verificado arriba)
                 try {
                     const gantt = new Gantt(ganttRef.current, formattedTasks, {
                         header_height: 50,
                         column_width: 30,
                         step: 24,
                         view_modes: ['Day', 'Week', 'Month', 'Year'], // Habilitar modos de vista explícitamente
                         bar_height: 20,
                         bar_corner_radius: 3,
                         arrow_curve: 5,
                         padding: 18,
                         view_mode: initialViewMode, // Usar la prop para el modo inicial
                         date_format: 'YYYY-MM-DD',
                         language: 'es',
                         animate: false, // <-- Añadir esta línea para desactivar animación inicial
                         custom_popup_html: function(task) {
                           return `
                             <div class="details-container" style="padding: 10px; font-size: 12px;">
                               <h5>${task.name}</h5>
                               <p>Inicio: ${task.start}</p>
                               <p>Fin: ${task.end}</p>
                               <p>Progreso: ${task.progress}%</p>
                             </div>
                           `;
                         },
                         on_view_change: (mode) => { // Restaurar on_view_change
                             if (onViewChange) onViewChange(mode);
                         }
                     });
                     console.log("GanttChart: Frappe Gantt instance created.");
                     ganttInstance.current = gantt; // Guardar instancia localmente primero
                     if (setGanttInstance) setGanttInstance(gantt); // Notificar al padre

                     // --- Código scroll_to eliminado ya que no existe en v0.6.1 ---
                 } catch (error) {
                     console.error("GanttChart: Error creating Gantt instance:", error);
                     if (ganttRef.current) {
                          ganttRef.current.innerHTML = '<p style="color: red; padding: 10px;">Error al crear el diagrama Gantt.</p>';
                     }
                 }
            } else {
                 ganttRef.current.innerHTML = '<p style="color: orange; padding: 10px;">No hay tareas válidas con fecha de inicio para mostrar en el Gantt.</p>';
                 console.log("GanttChart: No valid tasks to render.");
            }

        } else {
             console.log("GanttChart: No tasks or container ref found, clearing.");
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, dependencies, setGanttInstance]); // Quitar initialViewMode de las dependencias

    // Efecto para resaltar la barra cuando hoveredTaskId cambia
    useEffect(() => {
        if (!ganttInstance.current || !ganttInstance.current.$svg) return;

        // Quitar resaltado anterior
        if (currentHoveredBar.current) {
            currentHoveredBar.current.classList.remove('bar-hovered');
            currentHoveredBar.current = null;
        }

        // Aplicar nuevo resaltado si hay un ID
        if (hoveredTaskId) {
            // Encontrar el grupo de la barra por el ID de la tarea (frappe-gantt usa data-id)
            const barGroup = ganttInstance.current.$svg.querySelector(`.bar-wrapper[data-id="${hoveredTaskId}"]`);
            if (barGroup) {
                 // Encontrar el elemento .bar dentro del grupo
                 const barElement = barGroup.querySelector('.bar');
                 if(barElement) {
                    barElement.classList.add('bar-hovered');
                    currentHoveredBar.current = barElement;
                 }
            }
        }
    }, [hoveredTaskId]);

    const [todayMarkerPos, setTodayMarkerPos] = useState(null);

    // Efecto para calcular y actualizar la posición del marcador "Hoy"
    useEffect(() => {
       if (ganttInstance.current && ganttInstance.current.options) {
           const updateMarker = () => {
               try {
                   const pos = ganttInstance.current.get_snap_position(new Date());
                   setTodayMarkerPos(pos);
               } catch (e) {
                   // Puede fallar si la fecha está fuera del rango visible
                   console.warn("Could not calculate 'Today' marker position.", e);
                   setTodayMarkerPos(null);
               }
           };
           // Calcular al montar/actualizar y al cambiar de vista
           updateMarker();
           // Escuchar cambios de vista internos de la librería si es posible (requiere investigar API)
           // Por ahora, recalculamos si las tareas cambian (lo que fuerza re-render)
       } else {
           setTodayMarkerPos(null);
       }
    }, [tasks]); // Solo recalcular si cambian las tareas

    // Asegurar que el div contenedor ocupe el ancho y alto disponible y sea relativo
    return (
       <div style={{ position: 'relative', width: '100%', height: '100%' }}>
           <div ref={ganttRef} style={{ width: '100%', height: '100%', overflow: 'auto' }} className="gantt-container"></div>
           {/* Marcador "Hoy" */}
           {todayMarkerPos !== null && (
               <div style={{
                   position: 'absolute',
                   top: `${ganttInstance.current?.options?.header_height || 50}px`, // Alinear con inicio de barras
                   bottom: '0', // O ajustar a la altura del área de barras
                   left: `${todayMarkerPos}px`,
                   width: '2px',
                   backgroundColor: 'red',
                   zIndex: 1, // Asegurar que esté sobre las barras
                   pointerEvents: 'none' // Para no interferir con clics en barras
               }}></div>
           )}
       </div>
    );
};

export default GanttChart;

// --- Helper para determinar la clase CSS basada en el estado de la tarea ---
function getTaskStatusClass(task) {
   const today = new Date();
   today.setHours(0, 0, 0, 0); // Comparar solo fechas

   const startDate = task.startDate ? new Date(task.startDate) : null;
   const endDate = task.endDate ? new Date(task.endDate) : null;
   const progress = task.progress || 0;

   let statusClass = 'bar-not-started'; // Default

   if (progress >= 100) {
       statusClass = 'bar-completed';
   } else if (endDate && endDate < today) {
       statusClass = 'bar-overdue';
   } else if (startDate && startDate <= today && progress >= 0) {
        // Considerar en progreso si ha iniciado y no está completa ni vencida
        statusClass = 'bar-in-progress';
   }
   // Añadir clases adicionales si es hito o resumen
   if (task.milestone) statusClass += ' milestone';
   if (task.summary) statusClass += ' summary'; // Puede necesitar estilos específicos

   return statusClass.trim();
}

// Eliminar la segunda declaración duplicada de getTaskStatusClass