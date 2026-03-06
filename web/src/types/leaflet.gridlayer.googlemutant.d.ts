/** Minimal type declaration for the leaflet.gridlayer.googlemutant v0.16+ plugin. */
declare module 'leaflet.gridlayer.googlemutant' {
  import { GridLayer, GridLayerOptions } from 'leaflet';

  interface GoogleMutantOptions extends GridLayerOptions {
    type?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  }

  class GoogleMutant extends GridLayer {
    constructor(options?: GoogleMutantOptions);
  }

  export default GoogleMutant;
}
