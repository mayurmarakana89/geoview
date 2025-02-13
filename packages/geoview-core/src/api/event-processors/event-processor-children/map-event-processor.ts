import { Root } from 'react-dom/client';
import { ScaleLine } from 'ol/control';
import Overlay from 'ol/Overlay';
import { Extent } from 'ol/extent';
import View, { FitOptions } from 'ol/View';
import { KeyboardPan } from 'ol/interaction';

import { GeoviewStoreType } from '@/core/stores/geoview-store';
import { api, Coordinate, NORTH_POLE_POSITION, TypeBasemapOptions, TypeBasemapProps, TypeClickMarker, TypeMapFeaturesConfig } from '@/app';
import { TypeInteraction, TypeMapState, TypeValidMapProjectionCodes } from '@/geo/map/map-schema-types';
import {
  mapPayload,
  lngLatPayload,
  mapMouseEventPayload,
  numberPayload,
  mapViewProjectionPayload,
  TypeGeometry,
  TypeFeatureInfoEntry,
} from '@/api/events/payloads';
import { EVENT_NAMES } from '@/api/events/event-types';
import { getGeoViewStore } from '@/core/stores/stores-managers';
import { OL_ZOOM_DURATION, OL_ZOOM_PADDING } from '@/core/utils/constant';
import { AppEventProcessor } from './app-event-processor';
import { TypeLegendLayer } from '@/core/components/layers/types';
import { logger } from '@/core/utils/logger';

import { AbstractEventProcessor } from '../abstract-event-processor';

export class MapEventProcessor extends AbstractEventProcessor {
  /**
   * Override the initialization process to wire subscriptions and return them so they can be destroyed later.
   */
  protected onInitialize(store: GeoviewStoreType): Array<() => void> | void {
    const { mapId } = store.getState();

    const unsubMapLoaded = store.subscribe(
      (state) => state.mapState.mapLoaded,
      (cur, prev) => {
        if (cur !== prev) api.event.emit(mapPayload(EVENT_NAMES.MAP.EVENT_MAP_LOADED, mapId, store.getState().mapState.mapElement!));
      }
    );

    // #region MAP STATE
    const unsubMapCenterCoord = store.subscribe(
      (state) => state.mapState.centerCoordinates,
      (cur, prev) => {
        if (cur !== prev) {
          api.event.emit(lngLatPayload(EVENT_NAMES.MAP.EVENT_MAP_MOVE_END, mapId, cur));
        }
      }
    );

    const unsubMapPointerPosition = store.subscribe(
      (state) => state.mapState.pointerPosition,
      (cur, prev) => {
        if (cur! && cur !== prev) {
          api.event.emit(mapMouseEventPayload(EVENT_NAMES.MAP.EVENT_MAP_POINTER_MOVE, mapId, cur));
        }
      }
    );

    const unsubMapProjection = store.subscribe(
      (state) => state.mapState.currentProjection,
      (cur, prev) => {
        // because emit and on from api events can be trigger in loop, compare also the api value
        if (cur !== prev && api.maps[mapId].getMapState().currentProjection !== cur!) {
          api.event.emit(mapViewProjectionPayload(EVENT_NAMES.MAP.EVENT_MAP_VIEW_PROJECTION_CHANGE, mapId, cur!));
        }
      }
    );

    const unsubMapSingleClick = store.subscribe(
      (state) => state.mapState.clickCoordinates,
      (cur, prev) => {
        if (cur! && cur !== prev) {
          api.event.emit(mapMouseEventPayload(EVENT_NAMES.MAP.EVENT_MAP_SINGLE_CLICK, mapId, cur));
        }
      }
    );

    const unsubMapZoom = store.subscribe(
      (state) => state.mapState.zoom,
      (cur, prev) => {
        if (cur! && cur !== prev) {
          api.event.emit(numberPayload(EVENT_NAMES.MAP.EVENT_MAP_ZOOM_END, mapId, cur));
        }
      }
    );
    // #endregion MAP STATE

    // #region FEATURE SELECTION
    // Checks for changes to highlighted features and updates highlights
    const unsubMapHighlightedFeatures = store.subscribe(
      (state) => state.mapState.highlightedFeatures,
      (curFeatures, prevFeatures) => {
        if (curFeatures.length === 0) api.maps[mapId].layer.featureHighlight.removeHighlight('all');
        else {
          const curFeatureUids = curFeatures.map((feature) => (feature.geometry as TypeGeometry).ol_uid);
          const prevFeatureUids = prevFeatures.map((feature) => (feature.geometry as TypeGeometry).ol_uid);
          const newFeatures = curFeatures.filter(
            (feature: TypeFeatureInfoEntry) => !prevFeatureUids.includes((feature.geometry as TypeGeometry).ol_uid)
          );
          const removedFeatures = prevFeatures.filter(
            (feature: TypeFeatureInfoEntry) => !curFeatureUids.includes((feature.geometry as TypeGeometry).ol_uid)
          );
          for (let i = 0; i < newFeatures.length; i++) api.maps[mapId].layer.featureHighlight.highlightFeature(newFeatures[i]);
          for (let i = 0; i < removedFeatures.length; i++)
            api.maps[mapId].layer.featureHighlight.removeHighlight((removedFeatures[i].geometry as TypeGeometry).ol_uid);
        }
      }
    );

    // Checks for changes to selected features and updates highlights
    const unsubMapSelectedFeatures = store.subscribe(
      (state) => state.mapState.selectedFeatures,
      (curFeatures, prevFeatures) => {
        // TODO: on reload, layer object is undefined, need to test for now and solve in #1580
        if (curFeatures.length === 0 && api.maps[mapId].layer !== undefined) api.maps[mapId].layer.featureHighlight.resetAnimation('all');
        else {
          const curFeatureUids = curFeatures.map((feature) => (feature.geometry as TypeGeometry).ol_uid);
          const prevFeatureUids = prevFeatures.map((feature) => (feature.geometry as TypeGeometry).ol_uid);
          const newFeatures = curFeatures.filter(
            (feature: TypeFeatureInfoEntry) => !prevFeatureUids.includes((feature.geometry as TypeGeometry).ol_uid)
          );
          const removedFeatures = prevFeatures.filter(
            (feature: TypeFeatureInfoEntry) => !curFeatureUids.includes((feature.geometry as TypeGeometry).ol_uid)
          );
          for (let i = 0; i < newFeatures.length; i++) api.maps[mapId].layer.featureHighlight.selectFeature(newFeatures[i]);
          for (let i = 0; i < removedFeatures.length; i++)
            api.maps[mapId].layer.featureHighlight.resetAnimation((removedFeatures[i].geometry as TypeGeometry).ol_uid);
        }
      }
    );
    // #endregion FEATURE SELECTION

    const unsubLegendLayers = store.subscribe(
      (state) => state.layerState.legendLayers,
      (cur) => {
        const orderedLayerPaths = MapEventProcessor.evaluateLayerPathsFromLegendsArray(cur);
        const prevLayerOrder = [...store.getState().mapState.layerOrder];
        if (JSON.stringify(prevLayerOrder) !== JSON.stringify(orderedLayerPaths))
          store.getState().mapState.actions.setLayerOrder(orderedLayerPaths);
        const orderedVisibleLayers = orderedLayerPaths.filter(
          (layerPath) =>
            store.getState().layerState.actions.getLayer(layerPath)?.isVisible === 'yes' ||
            store.getState().layerState.actions.getLayer(layerPath)?.isVisible === 'always'
        );
        const prevVisibleLayers = [...store.getState().mapState.visibleLayers];
        if (JSON.stringify(prevVisibleLayers) !== JSON.stringify(orderedVisibleLayers))
          store.getState().mapState.actions.setVisibleLayers(orderedVisibleLayers);
      }
    );

    // Return the array of subscriptions so they can be destroyed later
    return [
      unsubMapHighlightedFeatures,
      unsubMapLoaded,
      unsubMapCenterCoord,
      unsubMapPointerPosition,
      unsubMapProjection,
      unsubMapSelectedFeatures,
      unsubMapZoom,
      unsubMapSingleClick,
      unsubLegendLayers,
    ];
  }

  //! THIS IS THE ONLY FUNCTION TO SET STORE DIRECTLY
  static setMapLoaded(mapId: string): void {
    // Log
    logger.logTraceCore('setMapLoaded', mapId);

    // use api to access map because this function will set map element in store
    const { map } = api.maps[mapId];
    const store = getGeoViewStore(mapId);

    // initialize store OpenLayers events
    // TODO: destroy events on map destruction
    map.on('change:size', store.getState().mapState.events.onMapChangeSize);
    map.on('moveend', store.getState().mapState.events.onMapMoveEnd);
    map.on('pointermove', store.getState().mapState.events.onMapPointerMove);
    map.on('singleclick', store.getState().mapState.events.onMapSingleClick);
    map.getView().on('change:resolution', store.getState().mapState.events.onMapZoomEnd);
    map.getView().on('change:rotation', store.getState().mapState.events.onMapRotation);

    // add map controls (scale)
    const scaleBar = new ScaleLine({
      units: 'metric',
      target: document.getElementById(`${mapId}-scaleControlBar`) as HTMLElement,
      bar: true,
      text: true,
    });

    const scaleLine = new ScaleLine({
      units: 'metric',
      target: document.getElementById(`${mapId}-scaleControlLine`) as HTMLElement,
    });
    map.addControl(scaleLine);
    map.addControl(scaleBar);

    // add map overlays
    // create overlay for north pole icon
    const northPoleId = `${mapId}-northpole`;
    const projectionPosition = api.projection.transformFromLonLat(
      [NORTH_POLE_POSITION[1], NORTH_POLE_POSITION[0]],
      `EPSG:${store.getState().mapState.currentProjection}`
    );

    const northPoleMarker = new Overlay({
      id: northPoleId,
      position: projectionPosition,
      positioning: 'center-center',
      element: document.getElementById(northPoleId) as HTMLElement,
      stopEvent: false,
    });
    map.addOverlay(northPoleMarker);

    // create overlay for click marker icon
    const clickMarkerId = `${mapId}-clickmarker`;
    const clickMarkerOverlay = new Overlay({
      id: clickMarkerId,
      position: [-1, -1],
      positioning: 'center-center',
      offset: [-18, -35],
      element: document.getElementById(clickMarkerId) as HTMLElement,
      stopEvent: false,
    });
    map.addOverlay(clickMarkerOverlay);

    // trigger the creation of feature info layer set and legend layer set
    // We always trigger creation because outside package may rely on them
    // ? duplicate of code in app-start, evaluate if there is a needed refactor for layer set.
    api.getFeatureInfoLayerSet(mapId);
    api.getLegendsLayerSet(mapId);

    // set autofocus/blur on mouse enter/leave the map so user can scroll (zoom) without having to click the map
    const mapHTMLElement = map.getTargetElement();
    mapHTMLElement.addEventListener('wheel', () => mapHTMLElement.focus());
    mapHTMLElement.addEventListener('mouseleave', () => mapHTMLElement.blur());

    // set store
    store.getState().mapState.actions.setMapElement(map);
    store.getState().mapState.actions.setOverlayNorthMarker(northPoleMarker);
    store.getState().mapState.actions.setOverlayClickMarker(clickMarkerOverlay);
    map.dispatchEvent('change:size'); // dispatch event to set initial value

    // set map interaction
    MapEventProcessor.setInteraction(mapId, store.getState().mapState.interaction);
  }

  // **********************************************************
  // Static functions for Typescript files to access store actions
  // **********************************************************
  //! Typescript MUST always use the defined store actions below to modify store - NEVER use setState!
  //! Some action does state modifications AND map actions.
  //! ALWAYS use map event processor when an action modify store and IS NOT trap by map state event handler

  // #region
  /**
   * Shortcut to get the Map state for a given map id
   * @param {string} mapId The mapId
   * @returns {ILayerState} The Map state
   */
  protected static getMapStateProtected(mapId: string) {
    // TODO: Refactor - Rename this function when we want to clarify the small confusion with getMapState function below
    // Return the map state
    return this.getState(mapId).mapState;
  }

  /**
   * Shortcut to get the Map config for a given map id
   * @param {string} mapId the map id to retreive the config for
   * @returns {TypeMapFeaturesConfig | undefined} the map config or undefined if there is no config for this map id
   */
  static getGeoViewMapConfig(mapId: string): TypeMapFeaturesConfig | undefined {
    // Return the map config
    return this.getState(mapId).mapConfig;
  }

  static getBasemapOptions(mapId: string): TypeBasemapOptions {
    return this.getMapStateProtected(mapId).basemapOptions;
  }

  static clickMarkerIconHide(mapId: string): void {
    this.getMapStateProtected(mapId).actions.hideClickMarker();
  }

  static clickMarkerIconShow(mapId: string, marker: TypeClickMarker): void {
    this.getMapStateProtected(mapId).actions.showClickMarker(marker);
  }

  static getMapInteraction(mapId: string): TypeInteraction {
    return this.getMapStateProtected(mapId).interaction;
  }

  static getMapState(mapId: string): TypeMapState {
    const mapState = this.getMapStateProtected(mapId);
    return {
      currentProjection: mapState.currentProjection as TypeValidMapProjectionCodes,
      currentZoom: mapState.zoom,
      mapCenterCoordinates: mapState.centerCoordinates,
      pointerPosition: mapState.pointerPosition || {
        pixel: [],
        lnglat: [],
        projected: [],
        dragging: false,
      },
      singleClickedPosition: mapState.clickCoordinates || {
        pixel: [],
        lnglat: [],
        projected: [],
        dragging: false,
      },
    };
  }

  static setMapAttribution(mapId: string, attribution: string[]): void {
    this.getMapStateProtected(mapId).actions.setAttribution(attribution);
  }

  static setInteraction(mapId: string, interaction: TypeInteraction): void {
    this.getMapStateProtected(mapId).actions.setInteraction(interaction);
  }

  static async setProjection(mapId: string, projectionCode: TypeValidMapProjectionCodes): Promise<void> {
    try {
      // Set circular progress to hide basemap switching
      getGeoViewStore(mapId).getState().appState.actions.setCircularProgress(true);

      // get view status (center and projection) to calculate new center
      const currentView = api.maps[mapId].map.getView();
      const currentCenter = currentView.getCenter();
      const currentProjection = currentView.getProjection().getCode();
      const newCenter = api.projection.transformPoints([currentCenter!], currentProjection, 'EPSG:4326')[0];
      const newProjection = projectionCode as TypeValidMapProjectionCodes;

      // create new view
      const newView = new View({
        zoom: currentView.getZoom() as number,
        minZoom: currentView.getMinZoom(),
        maxZoom: currentView.getMaxZoom(),
        center: api.projection.transformPoints([newCenter], 'EPSG:4326', `EPSG:${newProjection}`)[0] as [number, number],
        projection: `EPSG:${newProjection}`,
      });

      // use store action to set projection value in store and apply new view to the map
      this.getMapStateProtected(mapId).actions.setProjection(projectionCode, newView);

      // refresh layers so new projection is render properly and await on it
      await api.maps[mapId].refreshLayers();
    } finally {
      // Remove circular progress as refresh is done
      getGeoViewStore(mapId).getState().appState.actions.setCircularProgress(false);
    }
  }

  static rotate(mapId: string, rotation: number): void {
    this.getMapStateProtected(mapId).actions.setRotation(rotation);
  }

  static zoom(mapId: string, zoom: number): void {
    this.getMapStateProtected(mapId).actions.setZoom(zoom, OL_ZOOM_DURATION);
  }
  // #endregion

  // **********************************************************
  // Static functions for Store Map State to action on API
  // **********************************************************
  //! NEVER add a store action who does set state AND map action at a same time.
  //! Review the action in store state to make sure
  // #region
  static createEmptyBasemap(mapId: string) {
    return api.maps[mapId].basemap.createEmptyBasemap();
  }

  static createOverviewMapBasemap(mapId: string): TypeBasemapProps | undefined {
    return api.maps[mapId].basemap.getOverviewMap();
  }

  static resetBasemap(mapId: string) {
    // reset basemap will use the current display language and projection and recreate the basemap
    const language = AppEventProcessor.getDisplayLanguage(mapId);
    const projection = MapEventProcessor.getMapState(mapId).currentProjection as TypeValidMapProjectionCodes;
    api.maps[mapId].basemap.loadDefaultBasemaps(projection, language);
  }

  static evaluateLayerPathsFromLegendsArray(legendsArray: TypeLegendLayer[]): string[] {
    const layerPathList: string[] = [];
    const maxOrder = Math.max(...legendsArray.map((legendLayer) => legendLayer.order));
    for (let i = 0; i <= maxOrder; i++) {
      const nextLayerLegend = legendsArray.filter((layerLegend) => layerLegend.order === i)[0];
      if (nextLayerLegend) {
        layerPathList.push(nextLayerLegend.layerPath);
        if (nextLayerLegend.children.length) {
          layerPathList.push(...this.evaluateLayerPathsFromLegendsArray(nextLayerLegend.children));
        }
      }
    }
    return layerPathList;
  }

  static setMapKeyboardPanInteractions(mapId: string, panDelta: number): void {
    const mapElement = api.maps[mapId].map;

    // replace the KeyboardPan interraction by a new one
    mapElement!.getInteractions().forEach((interactionItem) => {
      if (interactionItem instanceof KeyboardPan) {
        mapElement!.removeInteraction(interactionItem);
      }
    });
    mapElement!.addInteraction(new KeyboardPan({ pixelDelta: panDelta }));
  }

  /**
   * Set the React root overview map element so it can be destroy if the map element is destroyed
   *
   * @param mapId The map id.
   * @param overviewRoot The React root element for the overview map
   */
  static setMapOverviewMapRoot(mapId: string, overviewRoot: Root): void {
    api.maps[mapId].overviewRoot = overviewRoot;
  }

  /**
   * Zoom to the specified extent.
   *
   * @param {string} mapId The map id.
   * @param {Extent} extent The extent to zoom to.
   * @param {FitOptions} options The options to configure the zoomToExtent (default: { padding: [100, 100, 100, 100], maxZoom: 11 }).
   */
  static zoomToExtent(mapId: string, extent: Extent, options: FitOptions = { padding: [100, 100, 100, 100], maxZoom: 11, duration: 1000 }) {
    // store state will be updated by map event
    api.maps[mapId].getView().fit(extent, options);
  }

  static zoomToGeoLocatorLocation(mapId: string, coords: Coordinate, bbox?: Extent): void {
    const indicatorBox = document.getElementsByClassName('ol-overviewmap-box') as HTMLCollectionOf<Element>;
    for (let i = 0; i < indicatorBox.length; i++) {
      (indicatorBox[i] as HTMLElement).style.display = 'none';
    }

    const projectionConfig = api.projection.projections[MapEventProcessor.getMapState(mapId).currentProjection];
    if (bbox) {
      //! There were issues with fromLonLat in rare cases in LCC projections, transformExtent seems to solve them.
      //! fromLonLat and transformExtent give differing results in many cases, fromLonLat had issues with the first
      //! three results from a geolocator search for "vancouver river"
      const convertedExtent = api.projection.transformExtent(bbox, 'EPSG:4326', projectionConfig);
      MapEventProcessor.zoomToExtent(mapId, convertedExtent, {
        padding: [50, 50, 50, 50],
        maxZoom: 16,
        duration: OL_ZOOM_DURATION,
      });

      // TODO: use proper function
      api.maps[mapId].layer.featureHighlight.highlightGeolocatorBBox(convertedExtent);
      setTimeout(() => {
        MapEventProcessor.clickMarkerIconShow(mapId, { lnglat: coords });
        for (let i = 0; i < indicatorBox.length; i++) {
          (indicatorBox[i] as HTMLElement).style.display = '';
        }
      }, OL_ZOOM_DURATION + 150);
    } else {
      const projectedCoords = api.projection.transformPoints(
        [coords],
        `EPSG:4326`,
        `EPSG:${this.getMapStateProtected(mapId).currentProjection}`
      );

      const extent: Extent = [...projectedCoords[0], ...projectedCoords[0]];
      const options: FitOptions = { padding: OL_ZOOM_PADDING, maxZoom: 13, duration: OL_ZOOM_DURATION };
      MapEventProcessor.zoomToExtent(mapId, extent, options);

      setTimeout(() => {
        MapEventProcessor.clickMarkerIconShow(mapId, { lnglat: coords });
        for (let i = 0; i < indicatorBox.length; i++) {
          (indicatorBox[i] as HTMLElement).style.display = '';
        }
      }, OL_ZOOM_DURATION + 150);
    }
  }

  static zoomToInitialExtent(mapId: string): void {
    const { center, zoom } = getGeoViewStore(mapId).getState().mapConfig!.map.viewSettings;
    const projectedCoords = api.projection.transformPoints(
      [center],
      `EPSG:4326`,
      `EPSG:${this.getMapStateProtected(mapId).currentProjection}`
    );
    const extent: Extent = [...projectedCoords[0], ...projectedCoords[0]];
    const options: FitOptions = { padding: OL_ZOOM_PADDING, maxZoom: zoom, duration: OL_ZOOM_DURATION };

    MapEventProcessor.zoomToExtent(mapId, extent, options);
  }

  static zoomToMyLocation(mapId: string, position: GeolocationPosition): void {
    const coord: Coordinate = [position.coords.longitude, position.coords.latitude];
    const projectedCoords = api.projection.transformPoints(
      [coord],
      `EPSG:4326`,
      `EPSG:${this.getMapStateProtected(mapId).currentProjection}`
    );

    const extent: Extent = [...projectedCoords[0], ...projectedCoords[0]];
    const options: FitOptions = { padding: OL_ZOOM_PADDING, maxZoom: 13, duration: OL_ZOOM_DURATION };

    MapEventProcessor.zoomToExtent(mapId, extent, options);
  }

  /**
   * Set Z index for layers
   *
   * @param {string} mapId Id of map to set layer Z indices
   */
  static setLayerZIndices = (mapId: string) => {
    const reversedLayers = [...this.getMapStateProtected(mapId).layerOrder].reverse();
    reversedLayers.forEach((layerPath, index) => {
      if (api.maps[mapId].layer.registeredLayers[layerPath]?.olLayer)
        api.maps[mapId].layer.registeredLayers[layerPath].olLayer?.setZIndex(index + 10);
    });
  };

  // #endregion
}
