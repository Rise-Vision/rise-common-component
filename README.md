# Rise Common Web Component [![CircleCI](https://circleci.com/gh/Rise-Vision/rise-common-component/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/workflows/rise-common-component/tree/master)

## Introduction

`rise-common-component` is a Polymer 3 Web Component helper library.

The `scripts` folder of the repo contains various scripts required for components' build and deployment

Provides a common `RiseElement` which performs initialization tasks and logging for Rise Components. This element can be extended instead of `PolymerElement`.

Provides a cacheMixin for using browser's local storage to store API responses.

## Usage

To use the `RiseElement` for building Rise Components, all that is needed is to extend it when declaring your element class:

```
class RiseDataWeather extends RiseElement {}
```

`super._setVersion( version )` should always be called as part of the constructor. This will pass your component version to `RiseElement` for logging purposes.

`RiseElement` provides a few utility functions:
- `ready()` is called by the Component once initialized.
- `_init()` is called once RisePlayerConfiguration has been initialized.
- `_handleStart()` is called once the Component is required to start playing.

You don't have to extend these functions, but if you do, don't forget to call the `super.***()` function to ensure everything works as expected.

### Example

```
import { RiseElement } from "rise-common-component/src/rise-element.js";

class RiseExample extends RiseElement {

  static get properties() {
    return {
      // your properties here
    }
  }

  constructor() {
    super();

    this._setVersion( version );
  }

  ready() {
    super.ready();

    // your code here
  }

  _init() {
    super._init();

    // your code here
  }

  _handleStart() {
    super._handleStart();

    // your code here
  }

  // send events via _sendEvent
  _myEvent(e) {
    super._sendEvent( 'custom-event', e );
  }

}

customElements.define( "rise-example", RiseExample );
```

### Logging Mechanism

A `loggerMixin` is enabled with `RiseElement`. This provides an interface that log to `RisePlayerConfiguration.Logger`

The mixin is automatically configured with your element's `name`, `id` and `version` (see `super._setVersion( version )` call in `constructor()`)

To log you can just use the `super.log()` function:

```
super.log( "error", "data error", { error: e.message });
```

### Caching Mechanism

For caching arbitrary data responses, the mixin uses browsers Cache API.

Whenever the cached data is retrieved, the mixin checks the date header and delete it from cache in case it is expired. Also, to prevent cache from growing indefinitely, during mixin initialization all expired cache entries are deleted.

To enable the mixin in your component you have to declare the mixin and call the `initCache` function with your desired cache name and optionally duration. Cache duration defaults to 2h. Cache expiry defaults to 4h. For greater certainty:

- `duration` is how long a cache entry is valid, after which data will be requested again
- `expiration` is how long a cache entry is kept for offline, before it gets removed from the cache

Setting any of the timers to -1 ignores that functionality and either hits the API every time (except for offline) or uses the offline version all the time (until it expires).


Default values are:
```
{
  name: "cache-mixin",
  duration: 1000 * 60 * 60 * 2,
  expiry: 1000 * 60 * 60 * 2
}
```


To use the `cacheMixin`, there are two functions:

`super.putCache( response )` adds your response to the cache.

`super.getCache( url )` retrieves your response by resource `url` via a `Promise`. If the resource is not available or it has expired from Cache (see the `duration` variable), the promise will reject.


#### Caching Example


```
import { RiseElement } from "rise-common-component/src/rise-element.js";
import { CacheMixin } from "rise-common-component/src/cache-mixin.js";

class RiseExample extends CacheMixin( RiseElement ) {

...

ready() {
  super.ready();

  super.initCache({
    name: this.tagName.toLowerCase(),
    duration: 1000 * 60 * 60
  });
}

_requestData() {
  fetch( this._getUrl()).then( res => {
    this._handleResponse( res.clone());

    super.putCache( res );
  }).catch( this._handleFetchError.bind( this ));
}

_getData() {
  let url = this._getUrl();

  super.getCache( url ).then( response => {
    this._logData( true );
    response.text().then( this._processData.bind( this ));
  }).catch(() => {
    this._requestData();
  });

...

}
```

### Fetch Mechanism

Used to fetch data from an API, the mixin uses browsers Fetch API.

The mixin can optionally use the cacheMixin for Caching purposes.

To enable the mixin in your component you have to declare the mixin and call the `initFetch` function with your desired configuration. Default values are:
```
{
  retry: 1000 * 60,
  cooldown: 1000 * 60 * 10,
  refresh: 1000 * 60 * 60,
  count: 5
}
```

Along with the configuration, the mixin requires data and error callbacks. Here's a sample call:
```
super.initFetch({}, this._handleResponse, this._handleError );
```

To use the `fetchMixin`, you can simply call:

`super.fetch( url )` with the desired resource URL.

The functionality will retrieve the data from the URL, and return it via the `_handleResponse` callback. In case an error is received, and after the retry count has been surpassed, the `_handleError` function will be called.


#### Fetch Example


```
import { RiseElement } from "rise-common-component/src/rise-element.js";
import { CacheMixin } from "rise-common-component/src/cache-mixin.js";
import { FetchMixin } from "rise-common-component/src/fetch-mixin.js";

class RiseExample extends FetchMixin ( CacheMixin( RiseElement )) {

...

ready() {
  super.ready();

  super.initFetch({}, this._handleResponse, this._handleError );
  super.initCache({
    name: this.tagName.toLowerCase()
  });
}

_handleStart() {
  super._handleStart();

  super.fetch( this._getUrl());
}

_handleResponse( resp ) {
  resp.text().then( this._processData.bind( this ));
}

_handleError() {
  this._sendEvent( RiseData.EVENT_REQUEST_ERROR );
}

```

### Uptime Mechanism
`RiseElement` automatically respond to Uptime requests from Templates, reporting no errors.

In case you need to specify an error state, you can set `RiseElement._setUptimeError()` to **true** based on your component logic.

### Play Until Done
`RiseElement` provides the `_sendDoneEvent(done)` method for components to report when it is done.

### Valid Files Mixin

Used to validate that a list of files has the expected extensions and to log related errors to BQ.

Provides a `validateFiles( files, extensions )` function, which accepts:

- an array of filenames, ie: `["video1.mp4", "video2.webm"]`
- an array of allowed extensions, ie: `["mp4", "webm"]`

Returns an object containing arrays of all valid / invalid files, ie:

`
{
  validFiles: ["video1.mp4", "video2.webm"],
  invalidFiles: []
}
`

Logs the following errors to BQ:

- `format-invalid` - A file with an invalid extension is encountered
- `all-formats-invalid` - All files have invalid formats

### Valid Files Mixin Example

```
import { RiseElement } from "rise-common-component/src/rise-element.js";
import { ValidFilesMixin } from "rise-common-component/src/valid-files-mixin.js";

const VALID_FILE_TYPES = ["mp4", "webm"];

class RiseExample extends ValidFilesMixin( RiseElement ) {
  static get properties() {
    return {
      files: {
        type: Array,
        value: []
      }
    }
  }

  _handleStart() {
    const validFiles = this.validateFiles( this.files, VALID_FILE_TYPES );
  }

  ...
}
```

### Watch Files Mixin

  Used to facilitate watching and responding to changes to files using RLS.

  Provides the following methods:

  - `watchedFileAddedCallback( details )` - Override in child class to be notified when a watched file is added
  - `watchedFileErrorCallback( details )` - Override in child class to be notified when there is an error with a watched file
  - `watchedFileDeletedCallback( details )` - Override in child class to be notified when a watched file is deleted
  - `startWatch( filesList )` - Start watching a list of files, accepts a list of files, ie: `["path/to/video1.mp4", "path/to/video2.webm"]`
  - `stopWatch()` - Stop watching all files

  Provides the following properties:

  - `managedFiles` - A list of watched files which are currently available

  Logs the following errors to BQ:

  - `file-not-found` - Logged when a watched file is not found
  - `file-insufficient-disk-space-error` - Logged when a watched file can not be downloaded due to a lack of disk space
  - `file-rls-error` - Logged when a general RLS error is encountered for a watched file

### Watch Files Mixin Example

```
import { RiseElement } from "rise-common-component/src/rise-element.js";
import { WatchFilesMixin } from "rise-common-component/src/watch-files-mixin.js";

class RiseExample extends WatchFilesMixin( RiseElement ) {
  static get properties() {
    return {
      files: {
        type: Array,
        value: []
      }
    }
  }

  constructor() {
    super();

    this._renderedFiles = [];
  }

  static get observers() {
    return [
      "_filesChanged(files)"
    ]
  }

  _filesChanged() {
    super.stopWatch();
    super.startWatch(files);
  }

  _removeRenderedFile( filePath ) {
    this._renderedFiles = this._renderedFiles.filter( f => f !== filePath );
  }

  watchedFileAddedCallback(  details ) {
    this._renderedFiles.push( details.filePath );
  }

  watchedFileErrorCallback( details ) {
    this._removeRenderedFile( details.filePath );
  }

  watchedFileDeletedCallback( details ) {
    this._removeRenderedFile( details.filePath );
  }

  ...
}
```

## Built With
- [Polymer 3](https://www.polymer-project.org/)
- [Polymer CLI](https://github.com/Polymer/tools/tree/master/packages/cli)
- [WebComponents Polyfill](https://www.webcomponents.org/polyfills/)
- [npm](https://www.npmjs.org)

## Development

### Local Development Build
Clone this repo and change into this project directory.

Execute the following commands in Terminal:

```
npm install
npm install -g polymer-cli@1.9.7
npm run build
```

**Note**: If EPERM errors occur then install polymer-cli using the `--unsafe-perm` flag ( `npm install -g polymer-cli --unsafe-perm` ) and/or using sudo.

### Testing
You can run the suite of tests either by command terminal or interactive via Chrome browser.

#### Command Terminal
Execute the following command in Terminal to run tests:

```
npm run test
```

#### Local Server
Run the following command in Terminal: `polymer serve`.

Now in your browser, navigate to:

```
http://127.0.0.1:8081/components/rise-common-component/test/index.html
```
You can also run a specific test page by targeting the page directly:

```
http://127.0.0.1:8081/components/rise-common-component/test/unit/rise-element.html
```

You can preview a Demo Page in your browser:

```
http://127.0.0.1:8081/components/rise-common-component/demo/rise-element-dev.html
```


## Submitting Issues
If you encounter problems or find defects we really want to hear about them. If you could take the time to add them as issues to this Repository it would be most appreciated. When reporting issues, please use the following format where applicable:

**Reproduction Steps**

1. did this
2. then that
3. followed by this (screenshots / video captures always help)

**Expected Results**

What you expected to happen.

**Actual Results**

What actually happened. (screenshots / video captures always help)

## Contributing
All contributions are greatly appreciated and welcome! If you would first like to sound out your contribution ideas, please post your thoughts to our [community](https://help.risevision.com/hc/en-us/community/topics), otherwise submit a pull request and we will do our best to incorporate it. Please be sure to submit test cases with your code changes where appropriate.

## Resources
If you have any questions or problems, please don't hesitate to join our lively and responsive [community](https://help.risevision.com/hc/en-us/community/topics).

If you are looking for help with Rise Vision, please see [Help Center](https://help.risevision.com/hc/en-us).

**Facilitator**

[Alex Deaconu](https://github.com/alex-deaconu "Alex Deaconu")
