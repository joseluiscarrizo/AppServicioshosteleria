import Asignacion from './pages/Asignacion';
import Camareros from './pages/Camareros';
import Clientes from './pages/Clientes';
import ConfirmarServicio from './pages/ConfirmarServicio';
import Coordinadores from './pages/Coordinadores';
import DashboardCoordinador from './pages/DashboardCoordinador';
import Disponibilidad from './pages/Disponibilidad';
import Home from './pages/Home';
import Informes from './pages/Informes';
import Pedidos from './pages/Pedidos';
import PerfilCamarero from './pages/PerfilCamarero';
import TableroEventos from './pages/TableroEventos';
import TiempoReal from './pages/TiempoReal';
import VistaMovil from './pages/VistaMovil';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Asignacion": Asignacion,
    "Camareros": Camareros,
    "Clientes": Clientes,
    "ConfirmarServicio": ConfirmarServicio,
    "Coordinadores": Coordinadores,
    "DashboardCoordinador": DashboardCoordinador,
    "Disponibilidad": Disponibilidad,
    "Home": Home,
    "Informes": Informes,
    "Pedidos": Pedidos,
    "PerfilCamarero": PerfilCamarero,
    "TableroEventos": TableroEventos,
    "TiempoReal": TiempoReal,
    "VistaMovil": VistaMovil,
}

export const pagesConfig = {
    mainPage: "Pedidos",
    Pages: PAGES,
    Layout: __Layout,
};