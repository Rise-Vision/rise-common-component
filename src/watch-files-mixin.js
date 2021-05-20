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

    _getAllIndexesOfFile( arr, filePath ) {
      return arr.reduce(( indexes, val, index ) => {
        if ( val === filePath ) {
          indexes.push( index );
        }
        return indexes;
      }, []);
    }

    _manageFileInError( details, fixed ) {
      const { filePath } = details;

      if ( !filePath ) {
        return;
      }

      let fileInError = this._getManagedFileInError( filePath );

      if ( fileInError ) {
        // remove this file from files in error list
        this._managedFilesInError.splice( this._managedFilesInError.findIndex( file => file.filePath === filePath ), 1 );
      }

      // if not fixed, then add it to the list
      if ( !fixed ) {
        this._managedFilesInError.push( details );
      }
    }

    _manageFile( message ) {
      const { filePath, status, fileUrl } = message;

      let managedFile = this.getManagedFile( filePath );

      if ( status.toUpperCase() === "CURRENT" ) {
        if ( !managedFile ) {
          // get all index values of this file from _filesList
          const indexes = this._getAllIndexesOfFile( this._filesList, filePath );

          indexes.forEach(( index ) => {
            this.managedFiles.push({ filePath, fileUrl, order: index });
          });

          managedFile = this.getManagedFile( filePath );
        } else {
          // file has been updated
          this.managedFiles.forEach(( file ) => {
            if ( file.filePath === filePath ) {
              file.fileUrl = fileUrl;
            }
          });
        }
      }

      if ( status.toUpperCase() === "DELETED" && managedFile ) {
        this.managedFiles = this.managedFiles.filter( file => file.filePath !== filePath );
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

      // account for the component running in editor preview OR running locally in browser
      if ( RisePlayerConfiguration.Helpers.isEditorPreview() || !RisePlayerConfiguration.Helpers.isInViewer()) {
        // ensure files list is set for component file management usage
        this._filesList = filesList.slice( 0 );
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
        isInsufficientDiskSpace = message.errorMessage && message.errorMessage.toLowerCase().includes( "insufficient disk space" ),
        isInsufficientQuota = message.errorMessage && message.errorMessage.toLowerCase().includes( "insufficient quota" ),
        errors = [ {
          name: "file-not-found",
          code: "E000000014"
        }, {
          name: "file-insufficient-disk-space-error",
          code: "E000000040"
        }, {
          name: "file-rls-error",
          code: "E000000027"
        }, {
          name: "file-content-sentinel-error",
          code: "E000000215"
        } ];

      let error;

      if ( isFileNotFound ) {
        error = errors[ 0 ];
      } else if ( isInsufficientDiskSpace || isInsufficientQuota ) {
        error = errors[ 1 ];
      } else {
        error = this._watchType === WatchFiles.WATCH_TYPE_RLS ? errors[ 2 ] : errors[ 3 ];
      }

      // prevent repetitive logging when component instance is receiving messages from other potential component instances watching same file
      // Note: to avoid using Lodash or Underscore library for just a .isEqual() function, taking a simple approach to object comparison with JSON.stringify()
      // as the property order will not change and the data is not large for this object
      if ( fileInError && ( JSON.stringify( details ) === JSON.stringify( fileInError ))) {
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
        watchType: this._watchType,
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
