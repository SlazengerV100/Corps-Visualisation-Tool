# Corps Analytics

Corps Analytics is a web-based application to display historical data and predict future trends about churches. Visualisations display information about finances, programme and 
attendance metrics of each church.

# Data
This repository does not contain any data to protect the privacy of The Salvation Army.

The backend handles and parses various CSV files provided by The Salvation Army to respond to API requests with the corresponding data.

# Technologies Used

| Tool                  | Purpose                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| React                 | Frontend library for building user interfaces with reusable components. |
| D3                    | JavaScript library for creating dynamic, interactive data visualisations. |
| Node.js               | JavaScript runtime for executing backend server code.                   |
| Jest                  | Testing framework for writing and running unit and integration tests.   |
| Express               | Web framework for building RESTful APIs and handling HTTP requests.     |
| Vite                  | Frontend build tool for fast development and optimized production builds. |
| CSV Parser            | Parses CSV files to extract and process data for backend use.           |

# Command Reference

To run the Corps Analytics tool, you need the following pre-requisites installed on your machine:

| Pre-requisite | Version |
| ------ | ------ |
| Node.js | ^24.0.0 |
| Node Package Manager (npm) | ^11.0.0 |

To run the tool with [Docker](#docker), you need:

| Pre-requisite | Version |
| ------ | ------ |
| Docker | ^24.0.0 |
| Docker Compose | ^2.0.0 |
| [just](https://github.com/casey/just) | any (optional, for the `just` command shortcuts) |

## Backend
### Setup
In order to setup the backend, you need to create a `.env` file to store your environment variables.

1. Make a copy of [`backend/example.env`](backend/example.env).
1. Complete the fields with the following description:

    | Environment Variable | Description |
    | ------ | ------ |
    | PORT | The desired port number of the backend server. For development, this must match the VITE_SERVER_URL in the frontend environment variables. |
    | DATA_FOLDER | The path to the folder which contains the CSV data files which are not included in this repository for security reasons. |

### Running
To run the backend: 

1. Open your terminal to the `backend` folder.
1. Run `npm i`
1. Run `npm run dev` for development or `npm start` for production.

### Testing
To run [Jest](https://jestjs.io/) unit tests for the backend: 

1. Open your terminal to the `backend` folder.
1. Run `npm i`
1. Run `npm run test`

## Frontend
### Setup
In order to setup the frontend, you need to create a `.env` file to store your environment variables.

1. Make a copy of [`frontend/example.env`](frontend/example.env).
1. Complete the fields with the following description:

    | Environment Variable | Description |
    | ------ | ------ |
    | VITE_SERVER_URL | If running locally, the URL of the local host server, including the port number from the backend environment variables. |

### Running
To run the frontend:

1. Open your terminal to the `frontend` folder.
1. Run `npm i`
1. Run `npm run dev` for development.

## Docker
Both the frontend and backend can instead be run as Docker containers via Docker Compose, without installing Node.js locally.

### Setup
1. In the repository root, create a `.env` file (see [`.env.example`](.env.example)):

    | Environment Variable | Description |
    | ------ | ------ |
    | HOST_DATA_FOLDER | Path on your machine to the folder containing the CSV data files |

    This `.env` is read by Docker Compose only, to mount your data folder into the backend container — it is separate from `backend/.env` and `frontend/.env`, which configure the apps themselves when run outside Docker.

### Running
1. Run `just stack-up`.
1. The frontend is served at http://localhost:8080 and the backend at http://localhost:8081.
1. Run `just stack-down` to stop and remove the containers.