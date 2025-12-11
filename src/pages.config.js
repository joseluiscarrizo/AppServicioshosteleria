import Pedidos from './pages/Pedidos';
import Informes from './pages/Informes';
import Coordinadores from './pages/Coordinadores';
import Asignacion from './pages/Asignacion';
import Disponibilidad from './pages/Disponibilidad';
import TiempoReal from './pages/TiempoReal';
import VistaMovil from './pages/VistaMovil';
import Camareros from './pages/Camareros';
import ConfirmarServicio from './pages/ConfirmarServicio';
import TableroEventos from './pages/TableroEventos';
import PerfilCamarero from './pages/PerfilCamarero';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Pedidos": Pedidos,
    "Informes": Informes,
    "Coordinadores": Coordinadores,
    "Asignacion": Asignacion,
    "Disponibilidad": Disponibilidad,
    "TiempoReal": TiempoReal,
    "VistaMovil": VistaMovil,
    "Camareros": Camareros,
    "ConfirmarServicio": ConfirmarServicio,
    "TableroEventos": TableroEventos,
    "PerfilCamarero": PerfilCamarero,
}

export const pagesConfig = {
    mainPage: "Pedidos",
    Pages: PAGES,
    Layout: __Layout,
};