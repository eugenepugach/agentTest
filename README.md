# flosum_agent

Flosum agent to work with git providers such as Github, Gitlab, Azure, BitBucket including On-premise editions.

## Prerequirements

- NodeJS 15.\* (through [nvm](https://github.com/nvm-sh/nvm))
- Git shell

## Quick Start

```
To enable debug through logger you should add 'DEBUG=flosum-agent*' to .env
```

Get started developing

via `npm`

```shell
# install deps
npm install

# run api server
npm run docs

# run in development mode
npm run dev

# run tests
npm run test
```

## Manual run on heroku

You must be logined into heroku in cli.

```shell
npm run compile
cd build
git init
git commit . -m "make it better"
heroku git:remote
git push heroku

```

---

## Install Dependencies

Install all package dependencies (one time operation)

```shell
npm install
```

## Run It

#### Run in _development_ mode:

Runs the application is development mode. Should not be used in production

```shell
npm run dev
```

#### Run in _production_ mode:

Compiles the application and starts it in production mode.

```shell
npm run build
npm start
```
