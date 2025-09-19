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
| date-fns              | Utility library for parsing and formatting dates, including UK formats. |

# Command Reference

To run the Corps Analytics tool, you need the following pre-requisites installed on your machine:

| Pre-requisite | Version |
| ------ | ------ |
| Node.js | ^24.0.0 |
| Node Package Manager (npm) | ^11.0.0 |

## Backend
### Setup
In order to setup the backend, you need to create a `.env` file to store your environment variables.

1. Make a copy of [`backend/example.env`](https://gitlab.ecs.vuw.ac.nz/course-work/project489/2025/project/kendreanth/corps-analytics/-/blob/main/backend/example.env?ref_type=heads).
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

1. Make a copy of [`frontend/example.env`](https://gitlab.ecs.vuw.ac.nz/course-work/project489/2025/project/kendreanth/corps-analytics/-/blob/main/frontend/example.env?ref_type=heads).
1. Complete the fields with the following description:

    | Environment Variable | Description |
    | ------ | ------ |
    | VITE_SERVER_URL | If running locally, the URL of the local host server, including the port number from the backend environment variables. |

### Running
To run the frontend:

1. Open your terminal to the `frontend` folder.
1. Run `npm i`
1. Run `npm run dev` for development.