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
      this.managedFiles = [];

      this._watchInitiated = false;
      this._managedFilesInError = [];
      this._filesList = [];
    }

    initWatchFiles( watchFilesConfig ) {
      Object.assign( this.watchFilesConfig, watchFilesConfig );
    }

    watchedFileAddedCallback() {}

    watchedFileDeletedCallback() {}

    watchedFileErrorCallback() {}

    _getStorageFileFormat( filePath ) {
      if ( !filePath || typeof filePath !== "string" ) {
        return "";
      }

      return filePath.substr( filePath.lastIndexOf( "." ) + 1 ).toLowerCase();
    }

    _manageFileInError( details, fixed ) {
      const { filePath, params } = details;

      if ( !filePath ) {
        return;
      }

      let fileInError = this._getManagedFileInError( filePath );

      if ( fixed && fileInError ) {
        // remove this file from files in error list
        this._managedFilesInError.splice( this._managedFilesInError.findIndex( file => file.filePath === filePath ), 1 );
      } else if ( !fixed ) {
        if ( !fileInError ) {
          fileInError = { filePath, params };
          // add this file to list of files in error
          this._managedFilesInError.push( fileInError );
        } else {
          fileInError.params = params;
        }
      }
    }

    _manageFile( message ) {
      const { filePath, status, fileUrl } = message;

      let managedFile = this.getManagedFile( filePath );

      if ( status.toUpperCase() === "CURRENT" ) {
        if ( !managedFile ) {
          // get the order that this file should be in from _filesList
          const order = this._filesList.findIndex( path => path === filePath );

          managedFile = { filePath, fileUrl, order };

          // add this file to list
          this.managedFiles.push( managedFile );
        } else {
          // file has been updated
          managedFile.fileUrl = fileUrl;
        }
      }

      if ( status.toUpperCase() === "DELETED" && managedFile ) {
        this.managedFiles.splice( this.managedFiles.findIndex( file => file.filePath === filePath ), 1 );
      }

      // sort the managed files based on order value
      this.managedFiles.sort(( a, b ) => a.order - b.order );
    }

    _getManagedFileInError( filePath ) {
      return this._managedFilesInError.find( file => file.filePath === filePath );
    }

    getManagedFile( filePath ) {
      return this.managedFiles.find( file => file.filePath === filePath );
    }

    startWatch( filesList ) {
      if ( !this._watchInitiated ) {
        this._filesList = filesList.slice( 0 );

        this._filesList.forEach( file => {
          RisePlayerConfiguration.LocalStorage.watchSingleFile(
            file, message => this._handleSingleFileUpdate( message )
          );
        });

        this._watchInitiated = true;
      }
    }

    stopWatch() {
      this._watchInitiated = false;
      this.managedFiles = [];
      this._managedFilesInError = [];
      this._filesToRenderList = [];
      this._filesList = [];
    }

    _handleSingleFileError( message ) {
      const { filePath, fileUrl } = message,
        details = { filePath, errorMessage: message.errorMessage, errorDetail: message.errorDetail },
        fileInError = this._getManagedFileInError( filePath );

      // prevent repetitive logging when component instance is receiving messages from other potential component instances watching same file
      // Note: to avoid using Lodash or Underscore library for just a .isEqual() function, taking a simple approach to object comparison with JSON.stringify()
      // as the property order will not change and the data is not large for this object
      if ( fileInError && ( JSON.stringify( details ) === JSON.stringify( fileInError.details ))) {
        return;
      }

      this._manageFileInError( details, false );

      /*** Possible error messages from Local Storage ***/
      /*
        "File's host server could not be reached"
        "File I/O Error"
        "Could not retrieve signed URL"
        "Insufficient disk space"
        "Invalid response with status code [CODE]"
       */

      this.log( WatchFiles.LOG_TYPE_ERROR, "file-rls-error", {
        errorMessage: message.errorMessage,
        errorDetail: message.errorDetail
      }, {
        storage: {
          configuration: "storage file",
          file_form: this._getStorageFileFormat( filePath ),
          file_path: filePath,
          local_url: fileUrl || ""
        }
      });

      if ( this.getManagedFile( filePath )) {
        // remove this file from the file list since there was a problem with its new version being provided
        this._manageFile({ filePath, status: "deleted" });
      }

      this.watchedFileErrorCallback( details );
    }

    _handleSingleFileUpdate( message ) {
      if ( !message.status || !message.filePath ) {
        return;
      }

      if ( message.status.toUpperCase() === "FILE-ERROR" ) {
        this._handleSingleFileError( message );
        return;
      }

      this.handleFileStatusUpdated( message );
    }

    handleFileStatusUpdated( message ) {
      const { filePath, status } = message;

      this._manageFile( message );
      this._manageFileInError( message, true );

      if ( status.toUpperCase() === "DELETED" ) {
        this.watchedFileDeletedCallback({ filePath });
      }

      if ( status.toUpperCase() === "CURRENT" ) {
        this.watchedFileAddedCallback({ filePath });
      }
    }
  }

  return WatchFiles;
})
