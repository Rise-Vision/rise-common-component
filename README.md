# Rise Common Web Component [![CircleCI](https://circleci.com/gh/Rise-Vision/rise-common-component/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/workflows/rise-common-component/tree/master)

## Introduction

`rise-common-component` is a Polymer 3 Web Component helper library.

Instructions for demo page here:
https://github.com/Rise-Vision/rise-common-component/blob/master/demo/README.md

## Usage

TODO

### Example

```
TODO
```

### Caching Mechanism

For caching arbitrary data responses, the mixin uses browsers Cache API. 

Whenever the cached data is retrieved, the mixin checks the date header and delete it from cache in case it is expired. Also, to prevent cache from growing indefinitely, during mixin initialization all expired cache entries are deleted.

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
http://127.0.0.1:8081/components/rise-common-component/test/unit/rise-common-component.html
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
