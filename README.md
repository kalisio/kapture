# kapture

[![Latest Release](https://img.shields.io/github/v/tag/kalisio/kapture?sort=semver&label=latest)](https://github.com/kalisio/kapture/releases)
[![CI](https://github.com/kalisio/kapture/actions/workflows/main.yaml/badge.svg)](https://github.com/kalisio/kapture/actions/workflows/main.yaml)
[![Quality Gate Status](https://sonar.portal.kalisio.com/api/project_badges/measure?project=kalisio-kapture&metric=alert_status&token=sqb_ce15b40ea4df16b3ab256a57f76ac53f77524677)](https://sonar.portal.kalisio.com/dashboard?id=kalisio-kapture)
[![Maintainability Issues](https://sonar.portal.kalisio.com/api/project_badges/measure?project=kalisio-kapture&metric=software_quality_maintainability_issues&token=sqb_ce15b40ea4df16b3ab256a57f76ac53f77524677)](https://sonar.portal.kalisio.com/dashboard?id=kalisio-kapture)
[![Coverage](https://sonar.portal.kalisio.com/api/project_badges/measure?project=kalisio-kapture&metric=coverage&token=sqb_ce15b40ea4df16b3ab256a57f76ac53f77524677)](https://sonar.portal.kalisio.com/dashboard?id=kalisio-kapture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Capture App Snapshots as a Service**

**kapture** is a lightweight service that let you take screenshots.

**kapture** relies on [Puppeteer](https://github.com/puppeteer/puppeteer) and [Express](https://expressjs.com/fr/)

## API

### capture (POST)

Request a capture with the following query parameters.

The body of the request must conform a **JSON** object with the following properties: 

| Property | Description | Defaults`|
| --- | --- | -- |
| `layers` | specifies the layers to display | `[]` | 
| `activity` | specifies the `map` or `globe` view | `map` |
| `size` | specifies the capture size | `{ "width": 1024, "height": 768 }` |
| `delay` | specified the waiting delay before capturing the screenshot (in milliseconds) | `1000` |
| `networkIdleTimeout` | specified the maximum time to wait for network idle capturing the screenshot (in milliseconds) | `90000` |

The `layers` property must conform the following JSON schema: 

```json
"layers": {
  "type" : "array",
  "items": {
    "type": "string"
  }
}
```

The items must conform the [kano](https://kalisio.github.io/kano/) formalism, i.e. `Layers.MY_LAYER`. In addition and for backward compatibility, you can specify the layer name using kebab case: `layers-my-layer`, with or without the `layers-` prefix. 

The `activity` property must conform the following JSON schema: 

```json
"activity": {
  "type": "string",
  "pattern": "map|globe"
}
```

The `size` property must conform the following JSON schema: 

```json
"size": {
  "type": "object",
  "properties": {
    "width": {
      "type": "integer",
      "default": 1024
    },
    "height": {
      "type": "integer",
      "default": 768
    }
}
```

The `delay` property must conform the following JSON schema: 

```json
"activity": {
  "type": "number",
  "default": "2000"
}
```

In addition the body can conform a [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946) object. The described features will be rendered as an overlay.

Here is a complete example:

```json
{
  "layers": ["Layers.IMAGERY"],
  "type": "FeatureCollection",
  "features": [
    { 
      "type": "Feature", 
      "geometry": { 
        "type": "Point", 
        "coordinates": [3, 42.5]
      },
      "properties": { "fill-color": "#AAAAAA" } 
    },
    { 
      "type": "Feature", 
      "geometry": { 
        "type": "LineString", 
        "coordinates": [ [3, 42], [4, 43], [5,42], [6, 43]] 
      },
      "properties": { "fill-color": "#AAAAAA" } 
    },
    { 
      "type": "Feature", 
      "geometry": { 
        "type": "Polygon", 
        "coordinates": [ [ [0, 42], [1, 42], [1, 43], [0, 43], [0, 42] ] ] 
      }, 
      "properties": { "fill-color": "#AAAAAA" } 
    }
  ]
}
```

And the response looks like:

![response](./assets/response.png)

### healthcheck (GET)

Check for the health of the service

## Configuring

Here are the environment variables you can use to customize the service:

| Variable  | Description | Defaults |
|-----------| ------------| ------------|
| `APP_NAME`| The app name | - |
| `APP_URL` | The app url | - |
| `APP_JWT` | The app token to get connected | * |
| `BODY_LIMIT` | The size limit of the request body | `100kb` |
| `DELAY` | The waiting delay before capturing the screen (in milliseconds) | '1000' |
| `NETWORK_IDLE_TIMEOUT` | Maximum time to wait for the network idle (in milliseconds) | '90000' |
| `DEBUG` | The namespaces to enable debug output. Set it to `kapture:*` to enable full debug output. | 

## Building

### Manual build 

You can build the image with the following command:

```bash
docker build -t <your-image-name> .
```

### Automatic build using Travis CI

This project is configured to use **Travis** to build and push the image on the [Kalisio's Docker Hub](https://hub.docker.com/u/kalisio/).
The built image is tagged using the `version` property in the `package.json` file.

To enable Travis to do the job, you must define the following variable in the corresponding Travis project:

| Variable  | Description |
|-----------| ------------|
| `DOCKER_USER` | your username |
| `DOCKER_PASSWORD` | your password |

## Deploying

This image is designed to be deployed using the [Kargo](https://kalisio.github.io/kargo/) project.

Check out the [compose file](https://github.com/kalisio/kargo/blob/master/deploy/kontrol.yml) to have an overview on how the container is deployed.

## Testing

To test the service you need to set the following environment variables:

| Variable  | Description | Defaults |
|-----------| ------------| ------------|
| `KAPTURE_URL` | The **Kapture** url. | `http://localhost:3000` |
| `KAPTURE_JWT` | The **Kapture** bearen token to pass a gateway if needed. It is set using `Auhtorization` header. | - |

To run the tests, use the subcommand `test`: 

```bash
yarn test
```

## Contributing

Please read the [Contributing file](./.github/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

Copyright (c) 2017-20xx Kalisio

Licensed under the [MIT license](LICENSE).

## Authors

This project is sponsored by 

[![Kalisio](https://s3.eu-central-1.amazonaws.com/kalisioscope/kalisio/kalisio-logo-black-256x84.png)](https://kalisio.com)
