# Start the tool in a Docker container
stack-up:
    docker compose up -d --build

# Stop the tool's Docker container
stack-down:
    docker compose down
