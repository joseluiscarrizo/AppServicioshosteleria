import Pedidos from './pages/Pedidos';
import Informes from './pages/Informes';
import Coordinadores from './pages/Coordinadores';
import Asignacion from './pages/Asignacion';
import Disponibilidad from './pages/Disponibilidad';
import TiempoReal from './pages/TiempoReal';
import VistaMovil from './pages/VistaMovil';
import Camareros from './pages/Camareros';
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
}

export const pagesConfig = {
    mainPage: "Pedidos",
    Pages: PAGES,
    Layout: __Layout,
};