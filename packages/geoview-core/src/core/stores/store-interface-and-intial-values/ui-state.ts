import { useStore } from 'zustand';
import { useGeoViewStore } from '@/core/stores/stores-managers';
import { TypeSetStore, TypeGetStore } from '@/core/stores/geoview-store';
import { TypeValidAppBarCoreProps, TypeMapCorePackages, TypeNavBarProps } from '@/geo';
import { TypeMapFeaturesConfig } from '@/core/types/cgpv-types';

type focusItemProps = {
  activeElementId: string | false;
  callbackElementId: string | false;
};

export interface IUIState {
  activeFooterBarTabId: string;
  activeTrapGeoView: boolean;
  appBarComponents: TypeValidAppBarCoreProps;
  corePackagesComponents: TypeMapCorePackages;
  focusITem: focusItemProps;
  geoLocatorActive: boolean;
  mapInfoExpanded: boolean;
  navBarComponents: TypeNavBarProps;
  footerPanelResizeValue: number;
  footerPanelResizeValues: number[];
  setDefaultConfigValues: (geoviewConfig: TypeMapFeaturesConfig) => void;

  actions: {
    closeModal: () => void;
    openModal: (uiFocus: focusItemProps) => void;
    setActiveFooterBarTab: (id: string) => void;
    setActiveTrapGeoView: (active: boolean) => void;
    setGeolocatorActive: (active: boolean) => void;
    setFooterPanelResizeValue: (value: number) => void;
    setMapInfoExpanded: (expanded: boolean) => void;
  };
}

export function initializeUIState(set: TypeSetStore, get: TypeGetStore): IUIState {
  const init = {
    appBarComponents: ['geolocator'],
    activeFooterBarTabId: 'legend',
    activeTrapGeoView: false,
    corePackagesComponents: [],
    focusITem: { activeElementId: false, callbackElementId: false },
    geoLocatorActive: false,
    mapInfoExpanded: false,
    navBarComponents: [],
    footerPanelResizeValue: 35,
    footerPanelResizeValues: [35, 50, 100],

    // initialize default stores section from config information when store receive configuration file
    setDefaultConfigValues: (geoviewConfig: TypeMapFeaturesConfig) => {
      set({
        uiState: {
          ...get().uiState,
          appBarComponents: geoviewConfig.appBar?.tabs.core || [],
          corePackagesComponents: geoviewConfig.corePackages || [],
          navBarComponents: geoviewConfig.navBar || [],
        },
      });
    },

    // #region ACTIONS
    actions: {
      closeModal: () => {
        document.getElementById(get().uiState.focusITem.callbackElementId as string)?.focus();
        set({
          uiState: {
            ...get().uiState,
            focusITem: { activeElementId: false, callbackElementId: false },
          },
        });
      },
      openModal: (uiFocus: focusItemProps) => {
        set({
          uiState: {
            ...get().uiState,
            focusITem: { activeElementId: uiFocus.activeElementId, callbackElementId: uiFocus.callbackElementId },
          },
        });
      },
      setActiveFooterBarTab: (id: string) => {
        set({
          uiState: {
            ...get().uiState,
            activeFooterBarTabId: id,
          },
        });
      },
      setActiveTrapGeoView: (active: boolean) => {
        set({
          uiState: {
            ...get().uiState,
            activeTrapGeoView: active,
          },
        });
      },
      setGeolocatorActive: (active: boolean) => {
        set({
          uiState: {
            ...get().uiState,
            geoLocatorActive: active,
          },
        });
      },
      setFooterPanelResizeValue: (value) => {
        set({
          uiState: {
            ...get().uiState,
            footerPanelResizeValue: value,
          },
        });
      },
      setMapInfoExpanded: (expanded: boolean) => {
        set({
          uiState: {
            ...get().uiState,
            mapInfoExpanded: expanded,
          },
        });
      },
    },
    // #endregion ACTIONS
  } as IUIState;

  return init;
}

// **********************************************************
// UI state selectors
// **********************************************************
export const useUIActiveFocusItem = () => useStore(useGeoViewStore(), (state) => state.uiState.focusITem);
export const useUIActiveFooterBarTabId = () => useStore(useGeoViewStore(), (state) => state.uiState.activeFooterBarTabId);
export const useUIActiveTrapGeoView = () => useStore(useGeoViewStore(), (state) => state.uiState.activeTrapGeoView);
export const useUIAppbarComponents = () => useStore(useGeoViewStore(), (state) => state.uiState.appBarComponents);
export const useUIAppbarGeolocatorActive = () => useStore(useGeoViewStore(), (state) => state.uiState.geoLocatorActive);
export const useUICorePackagesComponents = () => useStore(useGeoViewStore(), (state) => state.uiState.corePackagesComponents);
export const useUIFooterPanelResizeValue = () => useStore(useGeoViewStore(), (state) => state.uiState.footerPanelResizeValue);
export const useUIFooterPanelResizeValues = () => useStore(useGeoViewStore(), (state) => state.uiState.footerPanelResizeValues);
export const useUIMapInfoExpanded = () => useStore(useGeoViewStore(), (state) => state.uiState.mapInfoExpanded);
export const useUINavbarComponents = () => useStore(useGeoViewStore(), (state) => state.uiState.navBarComponents);

export const useUIStoreActions = () => useStore(useGeoViewStore(), (state) => state.uiState.actions);
