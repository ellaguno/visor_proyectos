const path = require('path'); // Importar path
const { parse: parseXml } = require('../utils/mppParser');
const Project = require('../models/project');
const Task = require('../models/task');
const Resource = require('../models/resource');
const TaskDependency = require('../models/taskDependency');
const ResourceAssignment = require('../models/resourceAssignment');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid'); // Importar uuid

// Import from XML (MS Project exported as XML)
const importFromXML = async (filePath) => {
  try {
    // Construir la ruta absoluta al archivo subido
    // filePath viene de multer y es relativo al root del proyecto api (ej: 'uploads/...')
    // __dirname es el directorio actual del servicio (src/services)
    const absoluteFilePath = path.join(__dirname, '../../', filePath);
    console.log(`Import Service: Attempting to parse absolute path: ${absoluteFilePath}`); // Log para depurar

    // 1. Parsear el archivo XML usando mppParser con la ruta absoluta
    const parsedData = await parseXml(absoluteFilePath);

    if (!parsedData) {
      throw new Error('Failed to parse XML file or file is empty.');
    }

    // Start transaction for database operations
    const transaction = await sequelize.transaction();
    
    try {
      // 2. Crear registros en la BD usando los datos parseados
      const project = await Project.create({
        id: parsedData.mppUid, // Usar el UID generado por el parser
        name: parsedData.name,
        // description: parsedData.notes || '', // El parser no extrae notas del proyecto aún
        startDate: parsedData.startDate,
        endDate: parsedData.finishDate, // El parser usa finishDate
        status: 'planned' // Estado inicial
      }, { transaction });
      
      // Extract and create resources
      // Mapas para buscar entidades por su mppUid generado
      const resourceMapByMppUid = new Map();
      const taskOriginalIdToUuidMap = new Map(); // Mapa para IDs originales -> UUIDs
      const taskUuidMap = new Map(); // Mapa para UUIDs -> { task, outlineLevel, outlineNumber }

      // 3. Crear Recursos
      for (const resourceData of parsedData.resources) {
        let resource;
        // Verificar si el recurso ya existe (especialmente el ID '0')
        const existingResource = await Resource.findByPk(resourceData.mppUid, { transaction });

        if (existingResource) {
            console.log(`Import Service: Resource with ID ${resourceData.mppUid} already exists. Using existing.`);
            resource = existingResource;
        } else {
            console.log(`Import Service: Creating new resource with ID ${resourceData.mppUid}.`);
            resource = await Resource.create({
                id: resourceData.mppUid, // Usar UID generado
                name: resourceData.name,
                type: resourceData.type,
                capacity: resourceData.maxUnits,
                costPerHour: resourceData.standardRate,
                email: resourceData.email
            }, { transaction });
        }
        resourceMapByMppUid.set(resource.id, resource); // Guardar por mppUid (que es el id de la BD)
      }
      
      // 4. Crear Tareas (Primera pasada: sin relaciones)
      for (const taskData of parsedData.tasks) {
        // Mapear prioridad numérica a ENUM
        let priorityEnum = 'medium';
        if (taskData.priority <= 300) priorityEnum = 'low'; // Ajustar rangos si es necesario
        if (taskData.priority >= 700) priorityEnum = 'high';

        const taskUuid = uuidv4(); // Generar UUID para la tarea
        taskOriginalIdToUuidMap.set(taskData.mppUid, taskUuid); // Guardar mapeo ID original -> UUID

        const task = await Task.create({
          id: taskUuid, // Usar el nuevo UUID como ID de la BD
          project_id: project.id,
          name: taskData.name,
          description: taskData.notes || '', // Usar notas si existen
          startDate: taskData.startDate,
          endDate: taskData.finishDate, // El parser usa finishDate
          duration: taskData.durationHours, // Usar horas calculadas por el parser
          progress: taskData.percentComplete, // El parser ya obtiene el número
          priority: priorityEnum,
          status: 'not-started', // Estado inicial
          // parent_task_id se establecerá después si es necesario
        }, { transaction });
        taskUuidMap.set(taskUuid, { // Guardar por UUID
            task,
            outlineLevel: taskData.outlineLevel,
            outlineNumber: taskData.outlineNumber
        });
      }
        
      // 5. Establecer relaciones Padre/Hijo (Opcional, basado en OutlineNumber si se necesita)
      // Este enfoque es simple pero puede fallar con numeraciones complejas.
      // Podría ser mejor calcularlo en el frontend si solo es para visualización.
      // Usar taskUuidMap para iterar sobre las tareas creadas
      for (const [childUuid, childData] of taskUuidMap.entries()) {
          // Asegurarse de que outlineNumber sea una cadena antes de usar split
          if (childData.outlineLevel > 1 && typeof childData.outlineNumber === 'string' && childData.outlineNumber) {
              const parts = childData.outlineNumber.split('.');
              if (parts.length > 1) { // Asegurarse de que haya algo que quitar
                  parts.pop();
                  const parentOutlineNumber = parts.join('.');
                  // Buscar el UUID de la tarea padre por su outlineNumber
                  let parentUuid = null;
                  for (const [uuid, data] of taskUuidMap.entries()) {
                      if (data.outlineNumber === parentOutlineNumber) {
                          parentUuid = uuid;
                          break;
                      }
                  }
                  if (parentUuid) {
                      await childData.task.update({ parent_task_id: parentUuid }, { transaction });
                  }
              }
          }
      }
        
      // 6. Crear Dependencias de Tareas
      for (const depData of parsedData.dependencies) {
        // Buscar los UUIDs usando los IDs originales del XML
        const predecessorUuid = taskOriginalIdToUuidMap.get(depData.predecessorMppUid);
        const successorUuid = taskOriginalIdToUuidMap.get(depData.successorMppUid);
        const predecessorTaskData = predecessorUuid ? taskUuidMap.get(predecessorUuid) : null;
        const successorTaskData = successorUuid ? taskUuidMap.get(successorUuid) : null;

        if (predecessorTaskData && successorTaskData) {
          await TaskDependency.create({
            // id se genera automáticamente por Sequelize
            predecessor_id: predecessorTaskData.task.id, // Usar UUIDs
            successor_id: successorTaskData.task.id,   // Usar UUIDs
            type: depData.type, // El parser ya mapea a 'FS', 'FF', etc.
            lag: depData.lagHours // Usar horas calculadas por el parser
          }, { transaction });
        } else {
            console.warn(`Import Service: Skipping dependency due to missing task(s): Pred ${depData.predecessorMppUid} -> Succ ${depData.successorMppUid}`);
        }
      }
        
      // 7. Crear Asignaciones de Recursos
      for (const assignData of parsedData.assignments) {
        // Buscar UUID de la tarea y el recurso usando IDs originales
        const taskUuidForAssignment = taskOriginalIdToUuidMap.get(assignData.taskMppUid);
        const taskDataForAssignment = taskUuidForAssignment ? taskUuidMap.get(taskUuidForAssignment) : null;
        const resource = resourceMapByMppUid.get(assignData.resourceMppUid); // Los IDs de recursos ya son únicos (o manejados)

        if (taskDataForAssignment && resource) {
          await ResourceAssignment.create({
            // id se genera automáticamente
            task_id: taskDataForAssignment.task.id, // Usar UUID
            resource_id: resource.id, // ID de la BD
            units: assignData.units, // El parser ya obtiene el número (100 para 100%)
            startDate: assignData.start, // El parser ya convierte a Date
            endDate: assignData.finish, // El parser ya convierte a Date
            workHours: assignData.workHours // Usar horas calculadas por el parser
          }, { transaction });
        } else {
             console.warn(`Import Service: Skipping assignment due to missing task or resource: Task ${assignData.taskMppUid}, Res ${assignData.resourceMppUid}`);
        }
      }
      
      await transaction.commit();
      
      return {
        id: project.id,
        name: project.name,
        taskCount: parsedData.tasks.length,
        resourceCount: parsedData.resources.length
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error importing from XML:', error);
    throw new Error(`Failed to import project: ${error.message}`);
  }
};

// Import from MPP/MPX (requires external library or service)
const importFromMPP = async (filePath) => {
  // Since direct MPP parsing requires special libraries that might not be available in JS,
  // we could implement one of these approaches:
  // 1. Use a child process to call an external tool that can convert MPP to XML
  // 2. Use a third-party API that can convert MPP files
  // 3. Require users to export to XML format first
  
  throw new Error('Direct MPP import not implemented yet. Please export to XML format from MS Project.');
};

module.exports = {
  importFromXML,
  importFromMPP
};