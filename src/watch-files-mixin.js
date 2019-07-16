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

      this._watchInitiated = false;
      this._managedFiles = [];
      this._managedFilesInError = [];
      this._filesToRenderList = [];
    }

    initWatchFiles( watchFilesConfig ) {
      Object.assign( this.watchFilesConfig, watchFilesConfig );
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

      let managedFile = this._getManagedFile( filePath );

      if ( status.toUpperCase() === "CURRENT" ) {
        if ( !managedFile ) {
          // get the order that this file should be in from _filesList
          const order = this._filesList.findIndex( path => path === filePath );

          managedFile = { filePath, fileUrl, order };

          // add this file to list
          this._managedFiles.push( managedFile );
        } else {
          // file has been updated
          managedFile.fileUrl = fileUrl;
        }
      }

      if ( status.toUpperCase() === "DELETED" && managedFile ) {
        this._managedFiles.splice( this._managedFiles.findIndex( file => file.filePath === filePath ), 1 );
      }

      // sort the managed files based on order value
      this._managedFiles.sort(( a, b ) => a.order - b.order );
    }

    startWatch( filesList ) {
      if ( !this._watchInitiated ) {
        filesList.forEach( file => {
          RisePlayerConfiguration.LocalStorage.watchSingleFile(
            file, message => this._handleSingleFileUpdate( message )
          );
        });

        this._watchInitiated = true;
      }
    }

    stopWatch() {
      this._watchInitiated = false;
      this._managedFiles = [];
      this._managedFilesInError = [];
      this._filesToRenderList = [];
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

      this._log( WatchFiles.LOG_TYPE_ERROR, "image-rls-error", {
        errorMessage: message.errorMessage,
        errorDetail: message.errorDetail
      }, { storage: this._getStorageData( filePath, fileUrl ) });

      // TODO: Which error should we log?
      // this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, details );

      if ( this._getManagedFile( filePath )) {
        // remove this file from the file list since there was a problem with its new version being provided
        this._manageFile({ filePath, status: "deleted" });

        if ( this._filesToRenderList.length === 1 && this._getFileToRender( message.filePath )) {
          this._filesToRenderList = [];
          this._clearDisplayedImage();
        }
      }
    }

    _handleSingleFileUpdate( message ) {
      console.log( "handle single file update", message ); // eslint-disable-line
      if ( !message.status || !message.filePath ) {
        return;
      }

      if ( message.status.toUpperCase() === "FILE-ERROR" ) {
        this._handleSingleFileError( message );
        return;
      }

      this._handleImageStatusUpdated( message );
    }

    _handleImageStatusUpdated( message ) {
      const { filePath, status } = message;

      this._manageFile( message );
      this._manageFileInError( message, true );

      if ( this._filesToRenderList.length === 1 && status.toUpperCase() === "DELETED" && this._filesToRenderList.find( file => file.filePath === filePath )) {
        this._filesToRenderList = [];
        this._clearDisplayedImage();

        return;
      }

      if ( status.toUpperCase() === "CURRENT" ) {
        this._configureShowingImages();
      }
    }
  }

  return WatchFiles;
})
