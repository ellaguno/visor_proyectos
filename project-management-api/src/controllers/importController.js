const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const importService = require('../services/importService');

// --- Helper function to run the Java utility ---
function runMppConverter(inputFilePath) {
  return new Promise((resolve, reject) => {
    const javaExecutable = '/usr/bin/java'; // Usar ruta absoluta
    const converterDir = path.join(__dirname, '..', 'java-utils', 'mpp-converter'); // Directorio base de la utilidad Java
    // Classpath relativo al converterDir
    const classPath = [
        'bin', // Directorio de clases compiladas
        path.join('lib', 'mpxj.jar') // Librería MPXJ
    ].join(path.delimiter);
    const mainClass = 'MppConverter'; // Nombre de la clase sin paquete
    // Asegurarse de que inputFilePath sea absoluto o interpretable desde converterDir
    // spawn funcionará mejor con rutas absolutas para el archivo de entrada
    const absoluteInputPath = path.resolve(inputFilePath);
    const args = ['-cp', classPath, mainClass, absoluteInputPath]; // Argumentos para Java

    console.log(`Executing Java in ${converterDir}: ${javaExecutable} ${args.join(' ')}`);

    // Ejecutar Java directamente, especificando el directorio de trabajo
    const javaProcess = spawn(javaExecutable, args, {
        cwd: converterDir // Establecer el directorio de trabajo para el proceso Java
    });

    let stdoutData = '';
    let stderrData = '';

    javaProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    javaProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    javaProcess.on('close', (code) => {
      console.log(`Java process exited with code ${code}`);
      if (code === 0) {
        // Verificar si stdoutData está vacío, lo cual podría indicar un problema
        if (!stdoutData || stdoutData.trim().length === 0) {
            console.error(`Java process exited successfully but produced no output. Stderr: ${stderrData}`);
            reject(new Error(`Java converter exited successfully but produced no output. Check Java logs or MPXJ compatibility. Stderr: ${stderrData.trim() || 'None'}`));
        } else {
            resolve(stdoutData); // Resuelve con el XML de stdout
        }
      } else {
        console.error(`Java process error output:\n${stderrData}`);
        reject(new Error(`Java converter exited with code ${code}. Error: ${stderrData.trim() || 'Unknown Java error'}`));
      }
    });

    javaProcess.on('error', (err) => {
      console.error('Failed to start Java process:', err);
      reject(new Error(`Failed to start Java process: ${err.message}`));
    });
  });
}


// --- Controller function ---
const importMSProject = async (req, res, next) => {
  let originalFilePath = null; // Guardar ruta original para limpieza
  let tempXmlPath = null; // Guardar ruta temporal para limpieza

  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
    }

    originalFilePath = req.file.path; // Ruta del archivo subido (MPP, MPPX, XML, etc.)
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let xmlFilePath = originalFilePath; // Por defecto, si ya es XML

    // Si es MPP o MPPX, convertir a XML usando la utilidad Java
    if (fileExt === '.mpp' || fileExt === '.mppx') {
      console.log(`Detected ${fileExt} file. Attempting conversion via Java utility...`);
      // Usar path.resolve para asegurar ruta absoluta para Java
      const absoluteInputPath = path.resolve(originalFilePath);
      tempXmlPath = path.join(os.tmpdir(), `mpxj_converted_${Date.now()}.xml`); // Crear ruta temporal única

      try {
        const xmlOutput = await runMppConverter(absoluteInputPath); // Pasar ruta absoluta
        await fs.writeFile(tempXmlPath, xmlOutput);
        xmlFilePath = tempXmlPath; // Usar el XML temporal para la importación
        console.log(`Conversion successful. XML saved to temporary file: ${tempXmlPath}`);
      } catch (javaError) {
        console.error('Java MPP Converter Error:', javaError);
        // No intentar eliminar originalFilePath aquí, se hará en finally
        throw new Error(`Failed to convert ${fileExt} file: ${javaError.message || 'Unknown error'}`); // Re-lanzar para manejo centralizado
      }
    } else if (fileExt !== '.xml' && fileExt !== '.mpx') { // Si no es MPP/MPPX ni XML/MPX
        throw new Error('Unsupported file format.'); // Lanzar error para manejo centralizado
    }

    // Proceder a importar desde XML (ya sea el original o el convertido)
    console.log(`Importing from XML file: ${xmlFilePath}`);
    const result = await importService.importFromXML(xmlFilePath); // Usar xmlFilePath

    // Si la importación fue exitosa, responder
    return res.status(201).json({
      status: 'success',
      message: 'Project imported successfully',
      data: {
        project: result // El servicio devuelve los datos relevantes
      }
    });

  } catch (error) {
    // Manejo centralizado de errores (incluye conversión, formato, importación)
    console.error('Error during import process:', error);
    // Pasar el error al middleware de errores de Express
    next(error);

  } finally {
    // Limpieza de archivos temporales y/o originales en caso de error o éxito
    // Borrar XML temporal si se creó
    if (tempXmlPath) {
      try {
        await fs.unlink(tempXmlPath);
        console.log(`Deleted temporary XML file: ${tempXmlPath}`);
      } catch (unlinkErr) {
        console.error('Error deleting temporary XML file:', unlinkErr);
      }
    }
    // Borrar el archivo original subido SIEMPRE, excepto si era XML/MPX y la importación falló (para depurar)
    // Opcional: Podrías querer mantener siempre el archivo original en /uploads
    // if (originalFilePath) {
    //    try {
    //        await fs.unlink(originalFilePath);
    //        console.log(`Deleted original uploaded file: ${originalFilePath}`);
    //    } catch (unlinkErr) {
    //        console.error('Error deleting original uploaded file:', unlinkErr);
    //    }
    // }
  }
};

module.exports = {
  importMSProject
};