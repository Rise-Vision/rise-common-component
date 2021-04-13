import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin";

export const WatchFilesMixin = dedupingMixin( base => {
  const WATCH_FILES_CONFIG = {
    name: "watch-files-mixin",
    id: "valid-files",
    version: "1.0"
  };

  class WatchFiles extends LoggerMixin( base ) {
    static get WATCH_TYPE_RLS() {
      return "rise-local-storage";
    }

    static get WATCH_TYPE_SENTINEL() {
      return "rise-content-sentinel";
    }

    constructor() {
      super();

      this.watchFilesConfig = Object.assign({}, WATCH_FILES_CONFIG );
      this.managedFiles = [];

      this._watchInitiated = false;
      this._managedFilesInError = [];
      this._filesList = [];
      this._watchType = null;
    }

    initWatchFiles( watchFilesConfig ) {
      Object.assign( this.watchFilesConfig, watchFilesConfig );
    }

    watchedFileAddedCallback() {}

    watchedFileDeletedCallback() {}

    watchedFileErrorCallback() {}

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

    _getWatchType() {
      if ( RisePlayerConfiguration.Helpers.useContentSentinel()) {
        return WatchFiles.WATCH_TYPE_SENTINEL;
      }

      if ( RisePlayerConfiguration.Helpers.isDisplay() && RisePlayerConfiguration.LocalMessaging.isConnected()) {
        return WatchFiles.WATCH_TYPE_RLS;
      }

      return null;
    }

    getManagedFile( filePath ) {
      return this.managedFiles.find( file => file.filePath === filePath );
    }

    startWatch( filesList ) {
      if ( !filesList ) {
        return Promise.reject();
      }

      if ( !this._watchInitiated ) {
        this._watchType = this._getWatchType();

        if ( !this._watchType ) {
          return Promise.reject();
        }

        const watchFn = this._watchType === WatchFiles.WATCH_TYPE_RLS ? RisePlayerConfiguration.LocalStorage.watchSingleFile : RisePlayerConfiguration.ContentSentinel.watchSingleFile;

        this._filesList = filesList.slice( 0 );

        this._filesList.forEach( file => {
          watchFn(
            file, message => this._handleSingleFileUpdate( message )
          );
        });

        this._watchInitiated = true;
      }

      return Promise.resolve( this._watchType );
    }

    stopWatch() {
      this._watchInitiated = false;
      this._watchType = null;
      this.managedFiles = [];
      this._managedFilesInError = [];
      this._filesList = [];
    }

    _handleSingleFileError( message ) {
      const { filePath, fileUrl } = message,
        details = { filePath, errorMessage: message.errorMessage, errorDetail: message.errorDetail },
        fileInError = this._getManagedFileInError( filePath ),
        isFileNotFound = "NOEXIST" === message.status.toUpperCase() && !message.errorMessage,
        errors = [ {
          name: "file-not-found",
          code: "E000000014"
        }, {
          name: "file-insufficient-disk-space-error",
          code: "E000000040"
        }, {
          name: "file-rls-error",
          code: "E000000027"
        } ];

      let error;

      if ( isFileNotFound ) {
        error = errors[ 0 ];
      } else {
        error = message.errorMessage === "Insufficient disk space" ? errors[ 1 ] : errors[ 2 ];
      }

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

      this.log( WatchFiles.LOG_TYPE_ERROR, error.name, { errorCode: error.code }, {
        errorMessage: message.errorMessage,
        errorDetail: message.errorDetail,
        storage: super.getStorageData( filePath, fileUrl ) });

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

      if ( message.status.toUpperCase() === "FILE-ERROR" || message.status.toUpperCase() === "NOEXIST" ) {
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
