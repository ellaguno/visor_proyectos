const Project = require('../models/project');
const Task = require('../models/task');
const Resource = require('../models/resource'); // Importar Resource
const ResourceAssignment = require('../models/resourceAssignment'); // Importar ResourceAssignment
const TaskDependency = require('../models/taskDependency'); // Importar TaskDependency
// Create a new project
const createProject = async (req, res, next) => {
  try {
    const { name, description, startDate, endDate, status } = req.body;
    
    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      status
    });
    
    return res.status(201).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all projects
const getAllProjects = async (req, res, next) => {
  try {
    const projects = await Project.findAll();
    
    return res.status(200).json({
      status: 'success',
      results: projects.length,
      data: {
        projects
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific project with its tasks
const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Incluir todas las asociaciones relevantes
    const project = await Project.findByPk(id, {
      include: [
        {
          model: Task,
          // as: 'Tasks', // Sequelize infiere 'Tasks' si no se especifica y la relación está bien definida
          include: [ // Incluir relaciones de Task
            { model: ResourceAssignment }, // Asignaciones de esta tarea
            { model: Task, as: 'subTasks' }, // Subtareas (si se usa jerarquía)
            { model: TaskDependency, as: 'successorDependencies' }, // Dependencias donde esta tarea es predecesora
            { model: TaskDependency, as: 'predecessorDependencies' } // Dependencias donde esta tarea es sucesora
          ]
        },
        // Podríamos incluir Recursos y Asignaciones directamente desde el Proyecto si fuera necesario,
        // pero obtenerlos a través de las Tareas suele ser más útil para la visualización.
        // Si necesitamos la lista completa de recursos del proyecto independientemente de las tareas:
        // { model: Resource } // Asumiendo que hay una relación directa o indirecta
      ]
      // Considerar añadir 'order' para las tareas si es necesario, ej: [['startDate', 'ASC']]
    });
    
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a project
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, status } = req.body;
    
    const project = await Project.findByPk(id);
    
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    await project.update({
      name,
      description,
      startDate,
      endDate,
      status
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a project
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id);
    
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    await project.destroy();
    
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject
};