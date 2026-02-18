
import React, { useEffect, useRef } from 'react';
import { User } from '../types';
import { MapPin, Star } from 'lucide-react';

// Declaração global para evitar erros de TS já que o L é carregado via CDN
declare global {
  interface Window {
    L: any;
  }
}

interface MapInterfaceProps {
  professionals: User[];
  onSelectProfessional: (pro: User) => void;
}

const MapInterface: React.FC<MapInterfaceProps> = ({ professionals, onSelectProfessional }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    // Se o mapa já existe, não recria
    if (mapInstanceRef.current) return;

    // Default: São Paulo
    const defaultCoords = [-23.55052, -46.633308];

    // Inicializa o mapa
    const map = window.L.map(mapContainerRef.current).setView(defaultCoords, 13);
    mapInstanceRef.current = map;

    // Adiciona camada do OpenStreetMap (Grátis)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Tentar pegar localização do usuário
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 14);

                // Marcador "Você está aqui"
                const userIcon = window.L.divIcon({
                    className: 'user-location-marker',
                    html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md relative">
                            <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                           </div>`,
                    iconSize: [16, 16]
                });
                window.L.marker([latitude, longitude], { icon: userIcon }).addTo(map).bindPopup("Você está aqui").openPopup();
            },
            () => {
                console.warn("Geolocalização negada ou falhou.");
            }
        );
    }

    // Ícone Personalizado dos Profissionais
    professionals.forEach(pro => {
      if (pro.coordinates) {
        const iconHtml = `
          <div class="relative group cursor-pointer custom-marker-pin">
            <div class="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden relative z-10">
              <img src="${pro.avatarUrl}" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-20 flex items-center gap-0.5 shadow-sm border border-white">
              ★ ${pro.rating || '5.0'}
            </div>
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
               <div class="w-2 h-2 bg-white rotate-45 -mt-1 shadow-sm"></div>
            </div>
          </div>
        `;

        const icon = window.L.divIcon({
          className: 'custom-icon-container', 
          html: iconHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 54] 
        });

        const marker = window.L.marker([pro.coordinates.lat, pro.coordinates.lng], { icon }).addTo(map);
        
        // Popup Personalizado
        const popupContent = document.createElement('div');
        popupContent.className = "text-center p-3 font-sans";
        popupContent.innerHTML = `
            <h4 class="font-bold text-sm text-gray-900 mb-0.5 leading-tight">${pro.name}</h4>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">${pro.specialty}</p>
            <button id="btn-hire-${pro.id}" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase py-2 rounded-lg transition-colors">
                Ver Perfil
            </button>
        `;

        marker.bindPopup(popupContent);
        
        marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-hire-${pro.id}`);
            if (btn) {
                btn.onclick = () => {
                    onSelectProfessional(pro);
                };
            }
        });
      }
    });

    return () => {
       // Cleanup se necessário
    };
  }, [professionals]);

  return (
    <div className="w-full h-[500px] rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white relative z-0 animate-scale-in">
        <div ref={mapContainerRef} className="w-full h-full bg-gray-100" />
        
        {/* Overlay Legenda */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg z-[400] text-xs">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                <span className="font-bold text-textMain">Top Avaliados</span>
            </div>
             <p className="text-[10px] text-textMuted max-w-[120px] leading-tight mt-2">
                Clique nos rostos para ver detalhes.
             </p>
        </div>
    </div>
  );
};

export default MapInterface;
