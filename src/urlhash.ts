import LayerSwitcher from './index';
import type maplibregl from 'maplibre-gl';

interface HashComponents {
  zoom?: number,
  center?: [number, number],
  layers?: string,
}

function decodeHash(hash: string): HashComponents {
  const loc = hash.replace('#', '').split('/')
  let result: HashComponents = {}
  if (loc.length < 3) {
    return result
  }
  result.layers = ''
  result.zoom = +loc[0];
  result.center = [+loc[2], +loc[1]];

  for (let i = 3; i < loc.length; i++) {
    let component = loc[i];
    let matches = component.match(/([a-z])=(.*)/);
    if (matches) {
      // TODO: handle additional components
    } else {
      result.layers = component;
    }
  }

  return result
}


class URLHash {
  layerSwitcher: LayerSwitcher
  _map: maplibregl.Map | undefined

  constructor(layerSwitcher: LayerSwitcher) {
    this.layerSwitcher = layerSwitcher;
    this._onHashChange();
  }

  enable(map: maplibregl.Map) {
    this._map = map;
    map.on('moveend', () => {
      this._updateHash();
    });

    window.addEventListener(
      'hashchange',
      () => {
        this._onHashChange();
      },
      false,
    );
  }

  _onHashChange() {
    const hash = decodeHash(window.location.hash);

    if (hash.center && hash.zoom && this._map) {
      this._map.jumpTo({
        center: hash.center,
        zoom: hash.zoom,
      });
    }

    if (this.layerSwitcher && hash.layers !== undefined) {
      this.layerSwitcher.setURLString(hash.layers);
    }
  }

  _updateHash() {
    try {
      window.history.replaceState(
        window.history.state,
        '',
        this.getHashString(),
      );
    } catch (e) {
      console.log(e);
    }
  }

  getHashString() {
    if (!this._map) {
      throw new Error('getHashString called before map initialised');
    }
    const center = this._map.getCenter(),
      zoom = Math.round(this._map.getZoom() * 100) / 100,
      // derived from equation: 512px * 2^z / 360 / 10^d < 0.5px
      precision = Math.ceil(
        (zoom * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10,
      ),
      m = Math.pow(10, precision),
      lng = Math.round(center.lng * m) / m,
      lat = Math.round(center.lat * m) / m
      // bearing = this._map.getBearing(),
      // pitch = this._map.getPitch();
    
    let hash = `#${zoom}/${lat}/${lng}`;
    let layers = null;

    if (this.layerSwitcher) {
      layers = this.layerSwitcher.getURLString();
    }

    if (layers) {
      hash += '/' + layers;
    }
    return hash;
  }

  /**
   * Modify MapLibre GL map constructor options to include values from the URL hash.
   * 
   * @param options the original options passed to the MapLibre GL `Map` constructor.
   *      You should include defaults for the `center` and `zoom` parameters.
   * @returns an options object to be passed to the `Map` constructor, with the
   *      `center` and `zoom` parameters updated if necessary. Other options are untouched.
   */
  init(options: maplibregl.MapOptions): maplibregl.MapOptions {
    options.hash = false;
    const loc = window.location.hash.replace('#', '').split('/');
    if (loc.length >= 3) {
      options.center = [+loc[2], +loc[1]];
      options.zoom = +loc[0];
    }
    return options;
  }
};

export default URLHash;
