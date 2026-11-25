import { useCallback, useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { Bookmark, BookmarkCheck, Crosshair, MapPin, Phone } from 'lucide-react';
import type { BloodCentreView } from '../shared/types.ts';

interface BloodCentresGoogleMapProps {
  centres: BloodCentreView[];
  selectedCentreId: string | null;
  onSelectCentre: (id: string | null) => void;
  savedCentreIds?: string[];
  isSignedIn?: boolean;
  bookmarkBusyId?: string | null;
  onToggleBookmark?: (centre: BloodCentreView) => void;
}

const MANGALURU_DEFAULT_CENTER = { lat: 12.874, lng: 74.848 };

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

function MapCameraController({
  centres,
  selectedCentreId,
  resetSignal,
}: {
  centres: BloodCentreView[];
  selectedCentreId: string | null;
  resetSignal: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCentreId) return;
    const found = centres.find((c) => c.id === selectedCentreId);
    if (found && Number.isFinite(found.lat) && Number.isFinite(found.lng)) {
      map.panTo({ lat: found.lat, lng: found.lng });
      const currentZoom = map.getZoom() ?? 12;
      if (currentZoom < 14) {
        map.setZoom(14);
      }
    }
  }, [map, centres, selectedCentreId]);

  useEffect(() => {
    if (!map || resetSignal === 0) return;
    map.panTo(MANGALURU_DEFAULT_CENTER);
    map.setZoom(12);
  }, [map, resetSignal]);

  return null;
}

interface CentreMarkerItemProps {
  centre: BloodCentreView;
  isSelected: boolean;
  isSaved: boolean;
  isSignedIn: boolean;
  bookmarkBusy: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
  onToggleBookmark?: (centre: BloodCentreView) => void;
}

function CentreMarkerItem({
  centre,
  isSelected,
  isSaved,
  isSignedIn,
  bookmarkBusy,
  onSelect,
  onCloseInfo,
  onToggleBookmark,
}: CentreMarkerItemProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isBloodBank = centre.centreType === 'Blood bank';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: centre.lat, lng: centre.lng }}
        title={`${centre.name} (${centre.area})`}
        onClick={onSelect}
        zIndex={isSelected ? 50 : isBloodBank ? 20 : 10}
      >
        <Pin
          background={isBloodBank ? '#B3261E' : '#D97706'}
          borderColor={isSelected ? '#FFFFFF' : isBloodBank ? '#7F1D1D' : '#92400E'}
          glyphColor="#FFFFFF"
          scale={isSelected ? 1.25 : 1.0}
          glyphText={isBloodBank ? 'BB' : 'H'}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={290} onCloseClick={onCloseInfo}>
          <div className="p-1 space-y-2 text-[#1C1917] font-sans">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B3261E]">
                {centre.centreType} · {centre.area}
              </p>
              <h4 className="text-sm font-bold leading-snug text-[#1C1917]">{centre.name}</h4>
              <p className="text-xs text-[#57534E] leading-relaxed">{centre.address}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#1C1917]">
              <span className="tabular-nums font-semibold">
                Stock: {centre.totalUnits} {centre.totalUnits === 1 ? 'unit' : 'units'}
              </span>
              <span>·</span>
              <span className={centre.is24Hour ? 'text-[#166534] font-semibold' : 'text-[#57534E]'}>
                {centre.is24Hour ? '24-hour desk' : 'Daytime hours'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={toTelHref(centre.contactPhone)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B3261E] text-white text-xs font-semibold hover:bg-[#961E17]"
              >
                <Phone className="h-3 w-3" aria-hidden="true" />
                <span>{centre.contactPhone}</span>
              </a>

              {isSignedIn && onToggleBookmark && (
                <button
                  type="button"
                  disabled={bookmarkBusy}
                  onClick={() => onToggleBookmark(centre)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2DDD6] bg-[#FAF8F6] text-xs font-semibold text-[#1C1917] hover:border-[#B3261E]/60 disabled:opacity-50"
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5 text-[#B3261E]" aria-hidden="true" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function BloodCentresGoogleMap({
  centres,
  selectedCentreId,
  onSelectCentre,
  savedCentreIds = [],
  isSignedIn = false,
  bookmarkBusyId = null,
  onToggleBookmark,
}: BloodCentresGoogleMapProps) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
  const [resetSignal, setResetSignal] = useState(0);

  const handleResetView = useCallback(() => {
    onSelectCentre(null);
    setResetSignal((n) => n + 1);
  }, [onSelectCentre]);

  if (!apiKey) {
    return (
      <div className="h-[460px] w-full rounded-[22px] ios-glass flex flex-col items-center justify-center p-6 text-center space-y-3">
        <MapPin className="h-7 w-7 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
            Google Maps Interactive Locator Ready
          </h3>
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
            Configure <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in the preview environment to display live Mangaluru blood bank and hospital pins on Google Maps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] ios-glass overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2DDD6]/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
            Mangaluru Blood Bank &amp; Hospital Map ({centres.length} pins)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#57534E] dark:text-[#A8A29E]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#B3261E]" />
            <span>Blood Bank (BB)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#57534E] dark:text-[#A8A29E]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span>Hospital (H)</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetView}
          className="min-h-[36px] px-3 py-1 rounded-xl ios-glass-subtle text-xs font-medium text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 inline-flex items-center gap-1.5"
        >
          <Crosshair className="h-3.5 w-3.5 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
          <span>Reset Mangaluru view</span>
        </button>
      </div>

      {/* Explicit pixel height required by Google Maps CF2; no CSS 3D transform ancestors */}
      <div className="w-full h-[460px] relative">
        <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="IN">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={MANGALURU_DEFAULT_CENTER}
            defaultZoom={12}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <MapCameraController
              centres={centres}
              selectedCentreId={selectedCentreId}
              resetSignal={resetSignal}
            />
            {centres.map((centre) => (
              <CentreMarkerItem
                key={centre.id}
                centre={centre}
                isSelected={selectedCentreId === centre.id}
                isSaved={savedCentreIds.includes(centre.id)}
                isSignedIn={isSignedIn}
                bookmarkBusy={bookmarkBusyId === centre.id}
                onSelect={() => onSelectCentre(centre.id)}
                onCloseInfo={() => onSelectCentre(null)}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </GoogleMap>
        </APIProvider>
      </div>
    </div>
  );
}
