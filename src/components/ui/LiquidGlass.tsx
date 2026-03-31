import React from 'react';

interface LiquidGlassProps {
    title: string;
    subtitle: string;
    content: string;
    children?: React.ReactNode;
}

const LiquidGlassCard: React.FC<LiquidGlassProps> = ({ title, subtitle, content, children }) => {
    return (
        /* 1. CONTENEDOR EXTERIOR (Carcasa de material) 
           - backdrop-blur: Para la refracción.
           - group: Habilitar estados hover para elementos hijos.
        */
        <div className="
      group relative overflow-hidden 
      w-full max-w-sm p-6 
      rounded-3xl 
      bg-white/10 backdrop-blur-xl 
      border border-white/20 
      ring-1 ring-inset ring-white/10
      shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]
      transition-all duration-500 hover:shadow-[0_20px_48px_0_rgba(0,0,0,0.3)]
      hover:-translate-y-1
    ">

            {/* 2. EFECTO DE DESTELLO "LIQUIDO" (Shine Effect)
          - Un gradiente que recorre la tarjeta al hacer hover para simular el brillo del cristal.
      */}
            <div className="
        absolute -inset-full h-full w-full rotate-45 
        bg-gradient-to-r from-transparent via-white/10 to-transparent 
        transition-all duration-1000 group-hover:translate-x-full
        pointer-events-none
      " />

            {/* 3. PLACA INTERIOR ESTABILIZADA (El "Tray") */}
            <div className="relative z-10 flex flex-col gap-5">

                {/* Cabecera: Texto Estabilizado */}
                <div className="bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        {subtitle}
                    </span>
                    <h3 className="text-xl font-semibold text-white mt-1 tracking-tight">
                        {title}
                    </h3>
                </div>

                {/* Contenido Principal */}
                <div className="px-1">
                    <p className="text-sm leading-relaxed text-white/70 font-light">
                        {content}
                    </p>
                </div>

                {/* 4. ESTADOS DE INTERACCIÓN (Botón Dinámico) 
            - El botón responde al hover general del contenedor.
        */}
                <div className="mt-2 flex flex-col gap-4">
                    <button className="
            group/btn relative w-full overflow-hidden
            py-3 px-4 rounded-xl
            bg-white/10 hover:bg-white/20
            border border-white/20
            transition-all duration-300
            active:scale-95
          ">
                        <span className="relative z-10 text-sm font-medium text-white group-hover/btn:tracking-widest transition-all">
                            Explorar Detalles
                        </span>
                        {/* Brillo interno del botón */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </button>

                    {/* Renderizado de Children Adicionales */}
                    {children && (
                        <div className="pt-2 border-t border-white/5">
                            {children}
                        </div>
                    )}
                </div>
            </div>

            {/* 5. DECORACIÓN DE FONDO (Manchas de color para resaltar el desenfoque) */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -z-10 group-hover:bg-blue-400/30 transition-colors duration-700" />
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -z-10 group-hover:bg-purple-400/30 transition-colors duration-700" />
        </div>
    );
};

export default LiquidGlassCard;