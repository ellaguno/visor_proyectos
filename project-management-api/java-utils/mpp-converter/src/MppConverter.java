import net.sf.mpxj.ProjectFile;
import net.sf.mpxj.reader.ProjectReader;
import net.sf.mpxj.reader.ProjectReaderUtility;
import net.sf.mpxj.writer.ProjectWriter;
// import net.sf.mpxj.writer.ProjectWriterUtility; // No usar
import net.sf.mpxj.mspdi.MSPDIWriter; // Importar escritor MSPDI específico

import java.io.OutputStream;

public class MppConverter {

    public static void main(String[] args) {
        if (args.length != 1) {
            System.err.println("Usage: java MppConverter <input_mpp_file>");
            System.exit(1);
        }

        String inputFile = args[0];
        ProjectFile projectFile = null;

        try {
            // 1. Leer el archivo MPP/MPPX
            ProjectReader reader = ProjectReaderUtility.getProjectReader(inputFile);
            projectFile = reader.read(inputFile);

            // 2. Instanciar MSPDIWriter directamente
            ProjectWriter writer = new MSPDIWriter();

            // 3. Escribir el XML a la salida estándar (System.out)
            OutputStream stdoutStream = System.out;
            writer.write(projectFile, stdoutStream);

            System.out.flush();

        } catch (Exception e) {
            System.err.println("Error converting file: " + inputFile);
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }
}