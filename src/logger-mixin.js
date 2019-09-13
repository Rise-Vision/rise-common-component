import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";

export const LoggerMixin = dedupingMixin( base => {
  const LOGGER_CONFIG = {
    name: "logger-mixin",
    id: "logger",
    version: "1.0"
  };

  class Logger extends base {

    constructor() {
      super();

      this.loggerConfig = Object.assign({}, LOGGER_CONFIG );
    }

    initLogger( loggerConfig ) {
      Object.assign( this.loggerConfig, loggerConfig );
    }

    static get LOG_TYPE_INFO() {
      return "info";
    }

    static get LOG_TYPE_WARNING() {
      return "warning";
    }

    static get LOG_TYPE_ERROR() {
      return "error";
    }

    log( type, event, details = null, additionalFields ) {
      if ( RisePlayerConfiguration.isPreview()) {
        return;
      }

      switch ( type ) {
      case "info":
        RisePlayerConfiguration.Logger.info( this.loggerConfig, event, details, additionalFields );
        break;
      case "warning":
        RisePlayerConfiguration.Logger.warning( this.loggerConfig, event, details, additionalFields );
        break;
      case "error":
        RisePlayerConfiguration.Logger.error( this.loggerConfig, event, details, additionalFields );
        break;
      }
    }

    getStorageData( file, url ) {
      return {
        configuration: "storage file",
        file_form: this.getStorageFileFormat( file ),
        file_path: file,
        local_url: url || ""
      }
    }

    getStorageFileFormat( filePath ) {
      if ( !filePath || typeof filePath !== "string" ) {
        return "";
      }

      return filePath.substr( filePath.lastIndexOf( "." ) + 1 ).toLowerCase();
    }
  }

  return Logger;
})
