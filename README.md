# kapture

[![Build Status](https://app.travis-ci.com/kalisio/kapture.svg?branch=master)](https://app.travis-ci.com/kalisio/kapture)

** Capture Kano Snapshots as a Service **

**kapture** is a lightwight service that let you take screenshots of [Kano](https://kalisio.github.io/kano/). 

**kapture** relies on [Puppeteer](https://github.com/puppeteer/puppeteer) and [Express](https://expressjs.com/fr/)

## API

### capture endpoint

Request a capture with the following query parameters:

| Parameter  | Description | Defaults |
|-----------| ------------| ------------|
| `base-layer` | The base layer to be displayed | `OSM_BRIGHT` |
| `bbox` | The view extention | - |
| `width` | The viewport width | `1024` |
| `height` | The viewport height | `768` |


```js
/capture?base-layer=OSM_DARK&bbox=42.538409837545586,1.3629913330078127,43.19116019158773,2.486343383789063&width=1200&height=800
```

### healthcheck endpoint

Check for the health of the service

## Configuring

Here are the environment variables you can use to customize the service:

| Variable  | Description | Defaults |
|-----------| ------------| ------------|
| `KANO_URL` | The **Kano** url | - |
| `KANO_JWT` | The **Kano** token to get connected | * |

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

## Contributing

Please read the [Contributing file](./.github/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

This project is sponsored by 

![Kalisio](https://s3.eu-central-1.amazonaws.com/kalisioscope/kalisio/kalisio-logo-black-256x84.png)

## License

This project is licensed under the MIT License - see the [license file](./LICENSE.md) for details