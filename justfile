# Start the frontend and backend with Docker containers
stack-up:
    docker compose up -d --build

# Stop the frontend and backend Docker containers
stack-down:
    docker compose down
