import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin";

export const WatchFilesMixin = dedupingMixin( base => {
  const WATCH_FILES_CONFIG = {
    name: "watch-files-mixin",
    id: "valid-files",
    version: "1.0"
  };

  class WatchFiles extends LoggerMixin( base ) {
    constructor() {
      super();

      this.watchFilesConfig = Object.assign({}, WATCH_FILES_CONFIG );
    }

    initWatchFiles( watchFilesConfig ) {
      Object.assign( this.watchFilesConfig, watchFilesConfig );
    }

  }

  return WatchFiles;
})
