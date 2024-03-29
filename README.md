# lima-service

![lima-logo](./docs/media/lima-logo-full.png)

Language Intelligence Manager/Analyzer provides a common interface to language-related cognitive services (i.e. Azure Luis & CLU, GPT, ...) and enables easy transaction analysis, annotation and review. It is especially useful during the design/validation phase of conversationa ai product development. LIMA is a component of the [robokit-cognitive-hub](https://github.com/wwlib/robokit-cognitive-hub) but can also be used as a standalone service.

### version

v0.0.1 (alpha)


### microservice architecture

Based on wwlib/microservice-template#versions/socket-io: A template for creating node microservices with:
- express route handling
- get/post REST api routes
- WebSocket api routes
- http admin UI routes
- JWT auth
- docker support

### medium article

See: [A Nodejs Microservice Template](https://medium.com/@andrew.rapo/a-nodejs-microservice-template-36f080fe1418)

### customization example

For an example customization of this template, see:
- [Using Microsoft Orchestrator for Intent Recognition and Dispatch to Luis](https://github.com/wwlib/orchestrator-microservice)
- https://github.com/wwlib/orchestrator-microservice

### install

`npm install`

### build

The lima-app repo (https://github.com/wwlib/lima-app) should be checked out as a peer of lima-service. In lima-app:

```
cd lima-app
yarn
yarn build
```

Then in lima-service

```
cd lima-service
npm run copy-lima-app
npm run build
```

### run

`npm run start`


### run as docker container

`docker build -t lima-service .` 
- or `npm run docker:build`

Copy `.env-example` to `.env`
```
SERVER_PORT=8084
USE_AUTH=true
```

start redis

```
docker run -it --rm -p 6379:6379 redislabs/redismod

```

start lima

`docker run -it -v $(pwd)/.limarc.json:/usr/app/.limarc.json --rm -p 8084:8084 --env-file ./.env lima-service`
- or `npm run docker:run`


### curl

Without auth:

```sh
curl --location --request POST 'http://localhost:8084/post' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "utterance": "hello"
     }'
```

With auth

```sh
curl --location --request POST 'http://localhost:8084/post' \
     --header 'Content-Type: application/json' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMSIsImF1dGgiOnsicGVybWlzc2lvbnMiOlt7InNjb3BlcyI6WyJyZWFkIl0sInJlc291cmNlIjoiZXhhbXBsZSJ9XX0sImlhdCI6MTY1MzM2MTQ3OX0.WMbG7o7CaKOf6H7djUpZ7aylvUeYw3N8cdn1K1FrN8A' \
     --data-raw '{
       "utterance": "hello"
     }'
```

```json
{"status":"OK","utterance":"hello","accountId":"user1"}
```



```sh
curl --location --request POST 'http://localhost:8084/auth' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "accountId": "user1",
       "password": "12345!"
     }'
```

```json
{"message":"Logged in successfully.","access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMSIsImF1dGgiOnsicGVybWlzc2lvbnMiOlt7InNjb3BlcyI6WyJyZWFkIl0sInJlc291cmNlIjoiZXhhbXBsZSJ9XX0sImlhdCI6MTY1NDM2NzQ5NSwiZXhwIjoxNjU0MzY3NTU1fQ.J7yxsSoOYTvNQtMkLrmlY_TEZT6x4jEvYvnI_Gqr64Q","refresh_toke":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMSIsImlhdCI6MTY1NDM2NzQ5NSwiZXhwIjoxNjU0NDUzODk1fQ.Lj7fairF_ABjeXzIc_-38aMqfj3ce08fd33V3ymoa04","account_id":"account1"}
```

### http - dashboard

http://localhost:8084/


### socket client

```
cd tools
node socket-cli.js
```

Note; The socket client will authenticate using the credentials in the `tools/.env` file.

This will start a REPL that will accept and echo prompts.

```
client connected
ctrl-c to quit
> hello
hello
```

Anything typed at the `>` prompt will be echoed.
