import { useState, useEffect } from 'react'; // Quitar useRef si no se usa aquí directamente
// MUI Core Components
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
// MUI Icons
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
// Gantt Charts
import GanttChart from './GanttChart';
import PortfolioGanttChart from './PortfolioGanttChart';
import './App.css';

// --- Configuración del Layout ---
const drawerWidth = 320;

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer)(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
      }),
      overflowX: 'hidden',
      ...(!open && {
        width: 0,
        border: 'none',
      }),
    },
  }),
);

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: `${drawerWidth}px`,
    }),
    paddingTop: `56px`,
  }),
);

const defaultTheme = createTheme();

// --- Componente Principal ---
function App() {
  // Mantener solo los estados y funciones básicas para probar la estructura
  const [openDrawer, setOpenDrawer] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]); // Necesario para PortfolioGanttChart
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true); // Estado para indicar carga

  const toggleDrawer = () => setOpenDrawer(!openDrawer);
  // Simular handleViewDetails para la prop de PortfolioGanttChart
  const handleViewDetails = (projectId) => {
      console.log("Simulating view details for:", projectId);
      // setSelectedProjectDetails({ id: projectId, name: "Dummy Project", Tasks: [] }); // Simular selección
            // Aquí podríamos cargar los detalles del proyecto si fuera necesario
            // Por ahora, solo cerramos el drawer y simulamos la selección
            setSelectedProjectDetails({ id: projectId, name: `Project ${projectId}`, Tasks: [] }); // Simular selección para cambiar vista
            setOpenDrawer(false);
  };

    // useEffect para cargar los proyectos al montar el componente
    useEffect(() => {
      const fetchProjects = async () => {
        setLoadingProjects(true);
        setError(''); // Limpiar errores anteriores
        try {
          // Asumiendo que el backend corre en localhost:3001
          const response = await fetch('http://localhost:3001/api/projects');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log("Projects fetched raw data:", data); // Log raw data
          // Extraer el array de proyectos de la respuesta, buscando en data.data o data.projects
          let projectsArray = [];
          if (Array.isArray(data)) {
              projectsArray = data; // Si la respuesta es el array directamente
          } else if (data && data.data && Array.isArray(data.data)) {
              projectsArray = data.data; // Si está en data.data
          } else if (data && data.projects && Array.isArray(data.projects)) {
              projectsArray = data.projects; // Si está en data.projects
          } else if (data && data.data && data.data.projects && Array.isArray(data.data.projects)) {
              projectsArray = data.data.projects; // Si está en data.data.projects
          }
          console.log("Extracted projects array before setting state:", projectsArray); // Log específico del array extraído
          setProjects(projectsArray); // Setear el array extraído
        } catch (e) {
          console.error("Error fetching projects:", e);
          setError(`Error al cargar proyectos: ${e.message}. Asegúrate de que el backend esté corriendo en http://localhost:3001.`);
          setProjects([]); // Asegurar que projects esté vacío en caso de error
        } finally {
          setLoadingProjects(false);
        }
      };
  
      fetchProjects();
    }, []); // El array vacío asegura que se ejecute solo una vez al montar
  
    // Dejar solo el return básico para probar la sintaxis
  return (
    <ThemeProvider theme={defaultTheme}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />
        <AppBar position="fixed" open={openDrawer} elevation={1}>
           <Toolbar sx={{ minHeight: '56px !important' }}>
             <Tooltip title={openDrawer ? "Ocultar Panel Lateral" : "Mostrar Panel Lateral"}>
                 <IconButton color="inherit" aria-label="toggle drawer" onClick={toggleDrawer} edge="start" sx={{ mr: 2 }} >
                   <MenuIcon />
                 </IconButton>
             </Tooltip>
             <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>Visor Proyectos (Simplificado)</Typography>
           </Toolbar>
        </AppBar>
        <Drawer variant="persistent" anchor="left" open={openDrawer}>
          <Toolbar sx={{ minHeight: '56px !important' }}/>
           <Divider />
           <List>
             {/* Quitar prop 'button', onClick es suficiente */}
             <ListItem onClick={() => setSelectedProjectDetails(null)} sx={{ cursor: 'pointer' }}>
                 <ListItemText primary="Volver a Portafolio" />
             </ListItem>
           </List>
        </Drawer>
        <Main open={openDrawer}>
          <Container maxWidth={false} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0, height: '100%' }}>
             {message && <Alert severity="success" sx={{ m: 2, mb: 0 }} onClose={() => setMessage('')}>{message}</Alert>}
             {error && <Alert severity="error" sx={{ m: 2, mb: 0 }} onClose={() => setError('')}>{error}</Alert>}
{loadingProjects ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando proyectos...</Typography>
    </Box>
) : selectedProjectDetails ? (
    // Aquí iría el componente GanttChart para el proyecto seleccionado
    // Por ahora, mostramos un texto simple
    <Box sx={{ p: 2 }}>
        <Typography variant="h5">Detalles del Proyecto: {selectedProjectDetails.name}</Typography>
        {/* <GanttChart project={selectedProjectDetails} /> */}
        <Typography>Gantt detallado del proyecto iría aquí.</Typography>
    </Box>
) : (
    // Pasar los proyectos cargados al PortfolioGanttChart
    <PortfolioGanttChart projects={projects} onProjectSelect={handleViewDetails} />
)}
          </Container>
        </Main>
      </Box>
    </ThemeProvider>
  );
} // Fin de function App

export default App;
