import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";

export const LastRequestedStorageMixin = dedupingMixin( base => {
  const LOCAL_STORAGE_KEY = "rise_files_last_requested";

  class LastRequestedStorage extends base {
    constructor() {
      super();

      this._isSupported = this._isLocalStorageSupported();
    }

    save( fileUrl, timestamp ) {
      if ( !this._isSupported ) {
        return;
      }

      if ( !fileUrl || !timestamp ) {
        return;
      }

      const map = this._getMap();

      map.set( fileUrl, timestamp );

      this._saveMap( map );
    }

    getTimestamp( fileUrl ) {
      if ( !this._isSupported || !fileUrl ) {
        return;
      }

      const map = this._getMap();

      return map.get( fileUrl )
    }

    _isLocalStorageSupported() {
      const test = "test";

      try {
        localStorage.setItem( test, test );
        localStorage.removeItem( test );
        return true;
      } catch ( e ) {
        return false;
      }
    }

    _getMap() {
      let map;

      try {
        map = new Map( JSON.parse( localStorage.getItem( LOCAL_STORAGE_KEY )));
      } catch ( e ) {
        console.warn( e ); // eslint-disable-line no-console
        map = new Map();
      }
      return map;
    }

    _saveMap( map ) {
      if ( !map || !( map instanceof Map )) {
        return;
      }

      localStorage.setItem( LOCAL_STORAGE_KEY, JSON.stringify( Array.from( map )));
    }
  }

  return LastRequestedStorage;
})
