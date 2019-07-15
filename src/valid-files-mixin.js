import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin";

export const ValidFilesMixin = dedupingMixin( base => {
  const VALID_FILES_CONFIG = {
    name: "valid-files-mixin",
    id: "valid-files",
    version: "1.0"
  };

  class ValidFiles extends LoggerMixin( base ) {
    constructor() {
      super();

      this.validFilesConfig = Object.assign({}, VALID_FILES_CONFIG );
    }

    initValidFiles( validFilesConfig ) {
      Object.assign( this.validFilesConfig, validFilesConfig );
    }

    _getStorageFileFormat( filePath ) {
      if ( !filePath || typeof filePath !== "string" ) {
        return "";
      }

      return filePath.substr( filePath.lastIndexOf( "." ) + 1 ).toLowerCase();
    }

    _isValidFileType( path, validTypes ) {
      const format = this._getStorageFileFormat( path );

      for ( let i = 0, len = validTypes.length; i < len; i++ ) {
        if ( format.indexOf( validTypes[ i ]) !== -1 ) {
          return true;
        }
      }

      return false;
    }

    _isValidFiles( files ) {
      if ( !files || !Array.isArray( files )) {
        return false;
      }

      if ( files.filter( f => !f ).length > 0 ) {
        return false;
      }

      return files.length > 0 && files.indexOf( "" ) === -1;
    }

    _filterInvalidFileTypes( files, validTypes ) {
      let invalidFiles = [];
      const validFiles = files.filter( file => {
        const valid = this._isValidFileType( file, validTypes );

        if ( !valid ) {
          invalidFiles.push( file );
        }

        return valid;
      });

      invalidFiles.forEach( invalidFile => {
        this.log( ValidFiles.LOG_TYPE_ERROR, "format-invalid", null, {
          storage: {
            configuration: "storage file",
            file_form: this._getStorageFileFormat( invalidFile ),
            file_path: invalidFile,
            local_url: ""
          }
        });
      });

      // { storage: this._getStorageData( invalidFile ) });

      return { validFiles, invalidFiles };
    }

    validateFiles( files, validTypes ) {
      if ( !this._isValidFiles( files )) {
        return { validFiles: [], invalidFiles: [] };
      }

      if ( !validTypes || !validTypes.length ) {
        return { validFiles: files, invalidFiles: [] };
      }

      return this._filterInvalidFileTypes( files, validTypes );
    }
  }

  return ValidFiles;
})
