
import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { MapPin, Star, Navigation, Search, Plus, Minus, Locate, Loader2, ArrowLeft, X } from 'lucide-react';

// Declaração global para evitar erros de TS já que o L é carregado via CDN
declare global {
  interface Window {
    L: any;
  }
}

interface MapInterfaceProps {
  professionals: User[];
  onSelectProfessional: (pro: User) => void;
  onClose?: () => void;
}

const MapInterface: React.FC<MapInterfaceProps> = ({ professionals, onSelectProfessional, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  const [isMapReady, setIsMapReady] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'top'>('all');
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedPro, setSelectedPro] = useState<User | null>(null);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  // Solicita localização ao montar o componente
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
        console.error("Geolocalização não suportada pelo navegador.");
        // Mantém em checking ou mostra erro específico se desejar
        return;
    }

    console.log("Solicitando localização...");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log("Localização obtida:", position);
            setLocationStatus('granted');
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
        },
        (error) => {
            console.warn("Geolocalização negada ou erro:", error);
            // Mantém em 'checking' (loop) mas loga o erro
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Inicializa o mapa quando tiver a localização E o Leaflet estiver pronto
  useEffect(() => {
    if (!mapContainerRef.current || !window.L || !userLocation || mapInstanceRef.current) return;

    const [lat, lng] = userLocation;
    initMap(lat, lng);

    function initMap(lat: number, lng: number) {
        if (!mapContainerRef.current) return;

        const map = window.L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true
        }).setView([lat, lng], 14);
        
        mapInstanceRef.current = map;

        // Camada CartoDB Positron
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        // Eventos do Mapa
        map.on('moveend', () => {
            setShowSearchButton(true);
        });

        map.on('click', () => {
            setSelectedPro(null);
        });

        updateUserMarker(map, lat, lng);

        // Força o resize após um breve delay
        const resizeTimer = setTimeout(() => {
            if (mapInstanceRef.current) {
                map.invalidateSize();
                setIsMapReady(true);
            }
        }, 100);
    }
  }, [userLocation]); // Dependência apenas de userLocation (e refs/window que são estáveis/globais)

  // Limpeza do mapa
  useEffect(() => {
    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            setIsMapReady(false);
        }
    };
  }, []);

  const updateUserMarker = (map: any, lat: number, lng: number) => {
      const userIcon = window.L.divIcon({
          className: 'custom-user-marker',
          html: `<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg pulse-ring"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
      });

      window.L.marker([lat, lng], { icon: userIcon }).addTo(map);
  };

  const handleRecenter = () => {
      if (mapInstanceRef.current && userLocation) {
          mapInstanceRef.current.flyTo(userLocation, 14);
      }
  };

  const handleZoom = (delta: number) => {
      if (mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
      }
  };

  const handleSearchArea = () => {
      setIsSearching(true);
      setTimeout(() => {
          setIsSearching(false);
          setShowSearchButton(false);
      }, 1500);
  };

  // Atualiza marcadores quando a lista de profissionais ou o mapa mudar
  useEffect(() => {
      if (!mapInstanceRef.current || !window.L || !userLocation) return;
      
      // Limpa marcadores antigos
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      professionals.forEach(pro => {
          // Lógica de posicionamento (usando dados reais ou mockados perto do usuário)
          const proLat = (pro as any).latitude || userLocation[0] + (Math.random() - 0.5) * 0.01;
          const proLng = (pro as any).longitude || userLocation[1] + (Math.random() - 0.5) * 0.01;

          const icon = window.L.divIcon({
              className: 'custom-pro-marker',
              html: `<div class="w-10 h-10 bg-white p-0.5 rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110">
                        <img src="${pro.avatarUrl}" class="w-full h-full rounded-full object-cover" />
                     </div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20]
          });

          const marker = window.L.marker([proLat, proLng], { icon })
              .addTo(mapInstanceRef.current)
              .on('click', () => {
                  setSelectedPro(pro);
                  mapInstanceRef.current.flyTo([proLat, proLng], 16);
              });
          
          markersRef.current.push(marker);
      });
  }, [professionals, isMapReady, userLocation]);

  if (locationStatus === 'checking') {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 z-50 relative">
              {onClose && (
                  <button 
                      onClick={onClose} 
                      className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-secondary hover:bg-gray-100 transition-all active:scale-95"
                  >
                      <X size={20} />
                  </button>
              )}
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-secondary font-bold text-sm animate-pulse">Obtendo sua localização...</p>
              <p className="text-secondaryMuted text-xs mt-2 max-w-[200px] text-center">Por favor, permita o acesso à localização no seu navegador.</p>
              
              <button 
                  onClick={requestLocation}
                  className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
              >
                  Solicitar Permissão Novamente
              </button>
          </div>
      );
  }

  if (locationStatus === 'denied') {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 z-50 p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500">
                  <MapPin size={40} />
              </div>
              <h2 className="text-2xl font-black text-secondary mb-3">Localização Necessária</h2>
              <p className="text-secondaryMuted font-medium mb-8 max-w-xs">
                  Para encontrar os melhores profissionais perto de você, precisamos saber onde você está.
              </p>
              <div className="space-y-3 w-full max-w-xs">
                <button 
                    onClick={() => window.location.reload()} 
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primaryDark transition-all active:scale-95"
                >
                    Tentar Novamente
                </button>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="w-full bg-white text-secondary py-4 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        Voltar
                    </button>
                )}
              </div>
          </div>
      );
  }

  return (
    <div className="w-full h-full relative z-0 bg-gray-50">
        <div ref={mapContainerRef} className="w-full h-full outline-none" />
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 z-[400] flex justify-between items-start pointer-events-none">
             {onClose && (
                 <button onClick={onClose} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-secondary hover:bg-gray-50 active:scale-95 transition-all pointer-events-auto">
                     <ArrowLeft size={20} />
                 </button>
             )}
             
             <div className="pointer-events-auto flex gap-2">
                <button 
                    onClick={() => setActiveFilter('all')}
                    className={`px-4 py-2 rounded-full shadow-lg border backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold ${activeFilter === 'all' ? 'bg-secondary text-white border-secondary' : 'bg-white/90 text-secondary border-white/50 hover:bg-white'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setActiveFilter('top')}
                    className={`px-4 py-2 rounded-full shadow-lg border backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold ${activeFilter === 'top' ? 'bg-secondary text-white border-secondary' : 'bg-white/90 text-secondary border-white/50 hover:bg-white'}`}
                >
                    <Star size={12} className={activeFilter === 'top' ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-500'} />
                    Top Avaliados
                </button>
             </div>
        </div>

        {/* Right Controls (Zoom & Location) */}
        <div className={`absolute right-4 z-[400] flex flex-col gap-3 transition-all duration-300 ${selectedPro ? 'bottom-64' : 'bottom-24'}`}>
            <button 
                onClick={handleRecenter} 
                title="Centralizar na minha localização"
                className={`w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-secondary transition-all active:scale-95 border border-white/50 ${!userLocation ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
            >
                <Locate size={20} />
            </button>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col overflow-hidden border border-white/50">
                <button 
                    onClick={() => handleZoom(1)} 
                    title="Aumentar zoom"
                    className="w-12 h-12 flex items-center justify-center text-secondary hover:bg-white active:bg-gray-50 border-b border-gray-100/50"
                >
                    <Plus size={20} />
                </button>
                <button 
                    onClick={() => handleZoom(-1)} 
                    title="Diminuir zoom"
                    className="w-12 h-12 flex items-center justify-center text-secondary hover:bg-white active:bg-gray-50"
                >
                    <Minus size={20} />
                </button>
            </div>
        </div>

        {/* Floating Search Button */}
        {!selectedPro && (
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] transition-all duration-500 ${showSearchButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <button 
                    onClick={handleSearchArea}
                    disabled={isSearching}
                    className="bg-secondary text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 disabled:opacity-80 disabled:cursor-wait"
                >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {isSearching ? 'Buscando...' : 'Buscar nesta área'}
                </button>
            </div>
        )}

        {/* Bottom Professional Card */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 z-[500] transition-transform duration-500 ease-out ${selectedPro ? 'translate-y-0' : 'translate-y-full'}`}>
            {selectedPro && (
                <div className="bg-white rounded-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] p-5 animate-fade-in-up relative overflow-hidden">
                    <button onClick={() => setSelectedPro(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={16} />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">
                            <img src={selectedPro.avatarUrl} className="w-full h-full object-cover" alt={selectedPro.name} />
                        </div>
                        <div>
                            <h3 className="font-display font-black text-xl text-secondary leading-tight">{selectedPro.name}</h3>
                            <p className="text-sm font-bold text-secondaryMuted uppercase tracking-wide mb-1">{selectedPro.specialty}</p>
                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg w-fit">
                                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-black text-yellow-700">{selectedPro.rating}</span>
                                <span className="text-[10px] text-yellow-600/70 font-medium">({selectedPro.reviewsCount} avaliações)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={() => onSelectProfessional(selectedPro)} className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primaryDark transition-colors active:scale-[0.98]">
                            Ver Perfil Completo
                        </button>
                        <button className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100 transition-colors">
                            <MapPin size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        <style>{`
            .leaflet-container {
                font-family: 'Inter', sans-serif !important;
            }
        `}</style>
    </div>
  );
};

export default MapInterface;
