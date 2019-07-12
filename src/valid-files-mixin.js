import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";

export const ValidFilesMixin = dedupingMixin( base => {
  const VALID_FILES_CONFIG = {
    name: "valid-files-mixin",
    id: "valid-files",
    version: "1.0"
  };

  class ValidFiles extends base {
    constructor() {
      super();

      this.validFilesConfig = Object.assign({}, VALID_FILES_CONFIG );
    }

    initValidFiles( validFilesConfig ) {
      Object.assign( this.validFilesConfig, validFilesConfig );
    }

    getStorageFileFormat( filePath ) {
      if ( !filePath || typeof filePath !== "string" ) {
        return "";
      }

      return filePath.substr( filePath.lastIndexOf( "." ) + 1 ).toLowerCase();
    }

    isValidFileType( path, validTypes ) {
      const format = this.getStorageFileFormat( path );

      for ( let i = 0, len = validTypes.length; i < len; i++ ) {
        if ( format.indexOf( validTypes[ i ]) !== -1 ) {
          return true;
        }
      }

      return false;
    }

    isValidFiles( files ) {
      if ( !files || typeof files !== "string" ) {
        return false;
      }

      // single symbol
      if ( files.indexOf( "|" ) === -1 ) {
        return true;
      }

      return files.split( "|" ).indexOf( "" ) === -1;
    }

    filterInvalidFileTypes( files, validTypes ) {
      let invalidFiles = [];
      const validFiles = files.filter( file => {
        const valid = this.isValidFileType( file, validTypes );

        if ( !valid ) {
          invalidFiles.push( file );
        }

        return valid;
      });

      return { validFiles, invalidFiles };
    }

    validateFiles( files, validTypes ) {
      if ( !this.isValidFiles( files )) {
        return { validFiles: [], invalidFiles: [] };
      }

      if ( !validTypes || !validTypes.length ) {
        return { validFiles: files, invalidFiles: [] };
      }

      return this.filterInvalidFileTypes( files.split( "|", validTypes ));
    }
  }

  return ValidFiles;
})
