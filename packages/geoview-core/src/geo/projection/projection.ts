import proj4 from 'proj4';
import { Coordinate } from 'ol/coordinate';

import { register } from 'ol/proj/proj4';
import {
  get as olGetProjection,
  Projection as olProjection,
  getPointResolution,
  ProjectionLike,
  transform as olTransform,
  transformExtent as olTransformExtent,
  fromLonLat,
  toLonLat,
} from 'ol/proj';
import { Extent } from 'ol/extent';

/**
 * constant used for the available projection names
 */
export const PROJECTION_NAMES = {
  LCC: 'EPSG:3978',
  WM: 'EPSG:3857',
  LNGLAT: 'EPSG:4326',
};

/**
 * Class used to handle functions for trasforming projections
 *
 * @exports
 * @class Projection
 */
export class Projection {
  /**
   * List of supported projections
   */
  projections: Record<string, olProjection> = {};

  /**
   * initialize projections
   */
  constructor() {
    this.initCRS84Projection();
    this.initWMProjection();
    this.initLCCProjection();

    proj4.defs('EPSG:4617', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs');
    register(proj4);
  }

  // #region INITIALIZE SUPPORTED PROJECTIONS
  /**
   * Initialize WM Projection
   */
  private initCRS84Projection() {
    const newDefinition = proj4.defs('EPSG:4326');
    newDefinition.axis = 'neu';
    proj4.defs('http://www.opengis.net/def/crs/OGC/1.3/CRS84', newDefinition);

    const projection = olGetProjection('http://www.opengis.net/def/crs/OGC/1.3/CRS84');
    if (projection) this.projections['http://www.opengis.net/def/crs/OGC/1.3/CRS84'] = projection;
  }

  /**
   * Initialize WM Projection
   */
  private initWMProjection() {
    const projection = olGetProjection('EPSG:3857');

    if (projection) this.projections['3857'] = projection;
  }

  /**
   * initialize LCC projection
   */
  private initLCCProjection() {
    // define 3978 projection
    proj4.defs(
      'EPSG:3978',
      '+proj=lcc +lat_1=49 +lat_2=77 +lat_0=49 +lon_0=-95 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );
    register(proj4);

    const projection = olGetProjection('EPSG:3978');

    if (projection) this.projections['3978'] = projection;
  }
  // #endregion

  /**
   * Transforms an extent from source projection to destination projection. This returns a new extent (and does not modify the
   * original).
   *
   * @param {Extent} extent The extent to transform.
   * @param {ProjectionLike} source Source projection-like.
   * @param {ProjectionLike} destination Destination projection-like.
   * @param {number} stops Optional number of stops per side used for the transform. The default value is 20.
   *
   * @returns The densified extent transformed in the destination projection.
   */
  transformAndDensifyExtent(extent: Extent, source: ProjectionLike, destination: ProjectionLike, stops = 25): Coordinate[] {
    const coordinates: number[][] = [];
    const width: number = extent[2] - extent[0];
    const height: number = extent[3] - extent[1];
    for (let i = 0; i < stops; ++i) coordinates.push([extent[0] + (width * i) / stops, extent[1]]);
    for (let i = 0; i < stops; ++i) coordinates.push([extent[2], extent[1] + (height * i) / stops]);
    for (let i = 0; i < stops; ++i) coordinates.push([extent[2] - (width * i) / stops, extent[3]]);
    for (let i = 0; i < stops; ++i) coordinates.push([extent[0], extent[3] - (height * i) / stops]);
    for (let i = 0; i < coordinates.length; i++) coordinates[i] = olTransform(coordinates[i], source, destination);
    return coordinates;
  }

  /**
   * Transforms an extent from source projection to destination projection. This returns a new extent (and does not modify the
   * original).
   *
   * @param {Extent} extent The extent to transform.
   * @param {ProjectionLike} source Source projection-like.
   * @param {ProjectionLike} destination Destination projection-like.
   * @param {number} stops Optional number of stops per side used for the transform. By default only the corners are used.
   *
   * @returns The new extent transformed in the destination projection.
   */
  transformExtent(extent: Extent, source: ProjectionLike, destination: ProjectionLike, stops?: number | undefined): Extent {
    return olTransformExtent(extent, source, destination, stops);
  }

  /**
   * Convert points from one projection to another using proj4
   *
   * @param {Coordinate[]} points array of passed in points to convert
   * @param {string} fromProj projection to be converted from
   * @param {string} toProj projection to be converted to
   */
  transformPoints = (points: Coordinate[], fromProj: string, toProj: string): Array<Array<number>> => {
    // initialize empty array for the converted points
    const converted: Array<Array<number>> = [];

    // if the points is an array and has some points
    if (Array.isArray(points) && points.length > 0) {
      // if the array contains another set of arrays containing points
      if (Array.isArray(points[0])) {
        // loop through each point
        for (let i = 0; i < points.length; i++) {
          // convert the points from one projection to another
          const coords = proj4(fromProj, toProj, points[i]);

          // add the converted points
          converted.push(coords);
        }
      }
    }

    return converted;
  };

  /**
   * Wrapper around OpenLayers function to transforms a coordinate from lone projection to another.
   *
   * @param {Coordinate} coordinate Longitude/latitude coordinate
   * @param {ProjectionLike} inProjection Actual projection of the coordinate
   * @param {ProjectionLike} outProjection Desired projection of the coordinate
   * @return {Coordinate}  Coordinate as projected
   */
  transform(coordinate: Coordinate, inProjection: ProjectionLike, outProjection: ProjectionLike): Coordinate {
    return olTransform(coordinate, inProjection, outProjection);
  }

  /**
   * Wrapper around OpenLayers function to transforms a coordinate from longitude/latitude.
   *
   * @param {Coordinate} coordinate Longitude/latitude coordinate
   * @param {ProjectionLike} projection Projection to project the coordinate
   * @return {Coordinate}  Coordinate as projected
   */
  transformFromLonLat(coordinate: Coordinate, projection: ProjectionLike): Coordinate {
    return fromLonLat(coordinate, projection);
  }

  /**
   * Wrapper around OpenLayers function to transforms a coordinate to longitude/latitude.
   *
   * @param {Coordinate} coordinate Projected coordinate
   * @param {ProjectionLike} projection Projection of the coordinate
   * @return {Coordinate}  Coordinate as longitude and latitude, i.e. an array with longitude as 1st and latitude as 2nd element.
   */
  transformToLonLat(coordinate: Coordinate, projection: ProjectionLike): Coordinate {
    return toLonLat(coordinate, projection);
  }

  /**
   * Wrapper around OpenLayers get function that fetches a Projection object for the code specified.
   *
   * @param {ProjectionLike} projectionLike Either a code string which is a combination of authority and identifier such as "EPSG:4326", or an existing projection object, or undefined.
   * @return {olProjection | null} — Projection object, or null if not in list.
   */
  getProjection(projectionLike: ProjectionLike): olProjection | null {
    return olGetProjection(projectionLike);
  }

  /**
   * Get map point resolution
   *
   * @param {string} projection the projection code
   * @param {Coordinate} center map center
   * @returns the point resolution for map center
   */
  getResolution = (projection: string, center: Coordinate): number => {
    return getPointResolution(projection, 1, center, 'm');
  };
}
