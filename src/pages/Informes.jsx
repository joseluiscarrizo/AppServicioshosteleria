import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, Users, TrendingUp, DollarSign } from 'lucide-react';
import ResumenPeriodo from '../components/informes/ResumenPeriodo';
import RendimientoCamareros from '../components/informes/RendimientoCamareros';
import ReporteDisponibilidad from '../components/informes/ReporteDisponibilidad';
import ReporteFinanciero from '../components/informes/ReporteFinanciero';

export default function Informes() {
  const [activeTab, setActiveTab] = useState('resumen');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#1e3a5f]" />
            Informes y Reportes
          </h1>
          <p className="text-slate-500 mt-1">Análisis detallado de pedidos, camareros y finanzas</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Resumen Período</span>
              <span className="sm:hidden">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="rendimiento" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Rendimiento</span>
              <span className="sm:hidden">Rend.</span>
            </TabsTrigger>
            <TabsTrigger value="disponibilidad" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Disponibilidad</span>
              <span className="sm:hidden">Disp.</span>
            </TabsTrigger>
            <TabsTrigger value="financiero" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Financiero</span>
              <span className="sm:hidden">Fin.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <ResumenPeriodo />
          </TabsContent>
          <TabsContent value="rendimiento">
            <RendimientoCamareros />
          </TabsContent>
          <TabsContent value="disponibilidad">
            <ReporteDisponibilidad />
          </TabsContent>
          <TabsContent value="financiero">
            <ReporteFinanciero />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}