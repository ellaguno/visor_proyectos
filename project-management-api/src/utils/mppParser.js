// src/utils/mppParser.js
const fs = require('fs').promises;
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid'); // Importar UUID

/**
 * Parsea un archivo XML de Microsoft Project.
 *
 * @param {string} filePath Ruta al archivo XML.
 * @returns {Promise<object|null>} Una promesa que resuelve a un objeto con la
 *   estructura de datos estandarizada del proyecto, o null si falla el parseo.
 */
async function parse(filePath) {
  console.log(`XML Parser: Attempting to read and parse file ${filePath}`);
  try {
    const xmlData = await fs.readFile(filePath, 'utf-8');
    console.log(`XML Parser: Read ${xmlData.length} characters from file.`); // Log file content length

    // Configuración simplificada del parser para depurar
    const parser = new xml2js.Parser({
      explicitArray: false, // Mantener esta opción útil
    });

    const result = await parser.parseStringPromise(xmlData);
    console.log("XML Parser Raw Result:", JSON.stringify(result, null, 2)); // Log para ver el resultado crudo

    if (!result || !result.Project) {
        console.error('XML Parser: Parsing resulted in an invalid object or <Project> root element not found.');
        throw new Error('Parsed XML result is invalid or missing <Project> root.');
    }

    // --- Mapeo de datos XML a estructura estandarizada ---
    const projectXml = result.Project; // Acceder al nodo raíz

    // Log si faltan propiedades esperadas
    if (!projectXml.Name && !projectXml.Title) {
        console.warn('XML Parser: Project Name and Title not found in parsed result. Project keys:', Object.keys(projectXml));
    }

    const projectData = {
        mppUid: uuidv4(), // Siempre generar un nuevo UID para el proyecto en nuestra BD
        name: projectXml.Name || projectXml.Title || 'Proyecto Importado Sin Nombre',
        startDate: projectXml.StartDate ? new Date(projectXml.StartDate) : null,
        finishDate: projectXml.FinishDate ? new Date(projectXml.FinishDate) : null,
        tasks: [],
        resources: [],
        assignments: [],
        dependencies: []
    };

    const taskMapByMppId = new Map(); // Mapa para buscar tareas por su ID original del XML
    const resourceMapByMppId = new Map(); // Mapa para buscar recursos por su ID original del XML

    // Mapeo de Tareas (Ajustar acceso)
    if (projectXml.Tasks && projectXml.Tasks.Task) {
      const tasksArray = Array.isArray(projectXml.Tasks.Task) ? projectXml.Tasks.Task : [projectXml.Tasks.Task];
      projectData.tasks = tasksArray.map(t => {
        const durationValue = parseFloat(t.Duration); // Ejemplo XML usa número (días?)
        const durationHours = isNaN(durationValue) ? 0 : durationValue * 8; // Asumir 8h/día si es número

        const task = {
          mppUid: t.UID || uuidv4(), // Generar UID si no existe
          mppId: parseInt(t.ID, 10), // ID original del XML
          name: t.Name || '',
          startDate: t.Start ? new Date(t.Start) : null,
          finishDate: t.Finish ? new Date(t.Finish) : null,
          durationHours: durationHours, // Almacenar como horas
          percentComplete: parseInt(t.PercentComplete, 10) || 0,
          outlineLevel: parseInt(t.OutlineLevel, 10) || 1,
          outlineNumber: t.OutlineNumber, // Añadido
          summary: t.Summary || false,
          milestone: t.Milestone || false,
          wbs: t.WBS,
          notes: t.Notes,
          priority: parseInt(t.Priority, 10) || 500, // Prioridad numérica
          constraintType: parseInt(t.ConstraintType, 10), // Tipo de restricción numérico
          constraintDate: t.ConstraintDate ? new Date(t.ConstraintDate) : null,
          parentTaskMppUid: null // Se podría calcular basado en OutlineLevel/OutlineNumber
        };
        if (!isNaN(task.mppId)) {
             taskMapByMppId.set(task.mppId, task); // Usar mppId como clave para referencias internas
        } else {
            console.warn(`XML Parser: Task found without a valid ID: ${t.Name}`);
        }
        return task;
      });
      // TODO: Calcular parentTaskMppUid si es necesario
    }

    // Mapeo de Recursos (Ajustar acceso)
    if (projectXml.Resources && projectXml.Resources.Resource) {
       const resourcesArray = Array.isArray(projectXml.Resources.Resource) ? projectXml.Resources.Resource : [projectXml.Resources.Resource];
       projectData.resources = resourcesArray.map(r => {
         const resource = {
           mppUid: r.UID || uuidv4(), // Generar UID si no existe
           mppId: parseInt(r.ID, 10), // ID original del XML
           name: r.Name || '',
           type: mapResourceType(r.Type),
           initials: r.Initials,
           group: r.Group,
           maxUnits: parseFloat(r.MaxUnits) || 100, // XML usa 100 para 100%
           standardRate: parseFloat(r.StandardRate) || 0,
           overtimeRate: parseFloat(r.OvertimeRate) || 0,
           email: r.EmailAddress
         };
         if (!isNaN(resource.mppId)) {
            resourceMapByMppId.set(resource.mppId, resource); // Usar mppId como clave
         } else {
             console.warn(`XML Parser: Resource found without a valid ID: ${r.Name}`);
         }
         return resource;
       });
    }

    // Mapeo de Asignaciones (Ajustar acceso)
    if (projectXml.Assignments && projectXml.Assignments.Assignment) {
       const assignmentsArray = Array.isArray(projectXml.Assignments.Assignment) ? projectXml.Assignments.Assignment : [projectXml.Assignments.Assignment];
       projectData.assignments = assignmentsArray.map(a => {
         const taskMppId = parseInt(a.TaskUID, 10); // XML usa ID aquí
         const resourceMppId = parseInt(a.ResourceUID, 10); // XML usa ID aquí
         const task = taskMapByMppId.get(taskMppId);
         const resource = resourceMapByMppId.get(resourceMppId);
         const workValue = parseFloat(a.Work); // XML usa número (horas?)
         const workHours = isNaN(workValue) ? 0 : workValue; // Asumir horas

         return {
           mppUid: a.UID || uuidv4(), // Generar UID si no existe
           taskMppUid: task ? task.mppUid : null, // Usar UID generado de la tarea
           resourceMppUid: resource ? resource.mppUid : null, // Usar UID generado del recurso
           units: parseFloat(a.Units) || 100, // XML usa 100 para 100%
           workHours: workHours, // Almacenar como horas
           start: a.Start ? new Date(a.Start) : null,
           finish: a.Finish ? new Date(a.Finish) : null,
           cost: parseFloat(a.Cost) || 0
         };
       }).filter(a => a.taskMppUid && a.resourceMppUid); // Filtrar asignaciones inválidas
    }

     // Mapeo de Dependencias (TaskLinks) (Ajustar acceso)
     const dependencies = [];
     if (projectXml.Tasks && projectXml.Tasks.Task) {
        const tasksArray = Array.isArray(projectXml.Tasks.Task) ? projectXml.Tasks.Task : [projectXml.Tasks.Task];
        tasksArray.forEach(t => {
            const successorTask = taskMapByMppId.get(parseInt(t.ID, 10));
            if (!successorTask) return; // Saltar si la tarea sucesora no se encontró

            if (t.PredecessorLink) {
                const links = Array.isArray(t.PredecessorLink) ? t.PredecessorLink : [t.PredecessorLink];
                links.forEach(link => {
                    const predecessorMppId = parseInt(link.PredecessorUID, 10); // XML usa ID aquí
                    const predecessorTask = taskMapByMppId.get(predecessorMppId);

                    if (predecessorTask) {
                        dependencies.push({
                            predecessorMppUid: predecessorTask.mppUid, // Usar UID generado
                            successorMppUid: successorTask.mppUid,   // Usar UID generado
                            type: mapDependencyType(link.Type), // Mapear tipo numérico a string 'FS', 'FF', etc.
                            lagHours: parseLagToHours(link.LinkLag, link.LagFormat) // Parsear lag a horas
                        });
                    } else {
                         console.warn(`XML Parser: Could not find predecessor task with ID ${predecessorMppId} for successor task ${successorTask.mppId} (${successorTask.name})`);
                    }
                });
            }
        });
     }
     projectData.dependencies = dependencies;


    console.log(`XML Parser: Successfully parsed ${filePath}. Found ${projectData.tasks.length} tasks, ${projectData.resources.length} resources, ${projectData.assignments.length} assignments, ${projectData.dependencies.length} dependencies.`);
    return projectData; // Devolver el objeto mapeado

  } catch (error) {
    console.error(`XML Parser: Error parsing file ${filePath}:`, error);
    return null; // Devolver null para indicar fallo
  }
}

// --- Funciones Auxiliares ---

function mapResourceType(xmlType) {
  // 0=Material, 1=Work, 2=Cost (confirmar estos valores)
  const typeInt = parseInt(xmlType, 10);
  if (typeInt === 0) return 'material';
  if (typeInt === 2) return 'cost';
  return 'work'; // Por defecto o si es 1
}

function mapDependencyType(xmlType) {
  // Mapeo según documentación MS Project XML: 0=FF, 1=FS, 2=SF, 3=SS
  const typeInt = parseInt(xmlType, 10);
  switch (typeInt) {
    case 0: return 'FF';
    case 1: return 'FS';
    case 2: return 'SF';
    case 3: return 'SS';
    default: return 'FS'; // Default a Finish-to-Start
  }
}

// Parsea el formato de 'lag' del XML a horas (INTEGER) como espera el modelo TaskDependency
function parseLagToHours(lagValue, lagFormat) {
    const lag = parseInt(lagValue, 10);
    if (isNaN(lag) || lag === 0) {
        return 0; // Sin lag
    }

    const format = parseInt(lagFormat, 10);
    let hours = 0;

    // Mapeo basado en documentación MS Project XML LagFormat
    // Asumiendo 8 horas por día, 60 minutos por hora
    switch (format) {
        case 3: // d (días)
        case 4: // ed (días elásticos)
            hours = lag * 8;
            break;
        case 5: // h (horas)
        case 6: // eh (horas elásticas)
            hours = lag;
            break;
        case 7: // m (minutos)
        case 8: // em (minutos elásticos - default?)
        case 10: // m?
        case 11: // em?
        default: // Asumir minutos si no hay formato o es desconocido
            hours = lag / 60;
            break;
        // Formato 9 (%) no se traduce directamente a horas
    }

    // Devolver como entero (redondeando o truncando según prefieras)
    return Math.round(hours);
}


module.exports = {
  parse,
};