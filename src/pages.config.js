import Pedidos from './pages/Pedidos';
import Informes from './pages/Informes';
import Coordinadores from './pages/Coordinadores';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Pedidos": Pedidos,
    "Informes": Informes,
    "Coordinadores": Coordinadores,
}

export const pagesConfig = {
    mainPage: "Pedidos",
    Pages: PAGES,
    Layout: __Layout,
};