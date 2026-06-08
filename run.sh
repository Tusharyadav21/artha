#!/usr/bin/env bash

# Colors (Makes it more readable , I personnaly like it :P)
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
PURPLE=$'\033[0;35m'
CYAN=$'\033[0;36m'
WHITE=$'\033[1;37m'
BOLD=$'\033[1m'
NC=$'\033[0m' # No Color

# Logging helpers
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

# Docker Compose Configuration
COMPOSE_BASE="compose.yaml"
COMPOSE_DEV="compose.dev.yaml"
COMPOSE_FILES="-f $COMPOSE_BASE -f $COMPOSE_DEV"
PROFILES=""

# No custom flags currently

# Signal trap for graceful exits
cleanup() {
    echo -e "\n\n${YELLOW}🛑 Shutting down host processes and containers...${NC}"
    
    # Terminate native background processes
    if [ ! -z "$BACKEND_PID" ]; then
        log_info "Stopping Backend API (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$WORKER_PID" ]; then
        log_info "Stopping Arq Worker (PID: $WORKER_PID)..."
        kill $WORKER_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        log_info "Stopping Frontend Client (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ ! -z "$DOCKER_LOGS_PID" ]; then
        kill $DOCKER_LOGS_PID 2>/dev/null
    fi

    # Kill by pattern just in case
    pkill -f "uvicorn src.main:app" 2>/dev/null
    pkill -f "arq src.workers.arq_worker.WorkerSettings" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    
    # Stop docker containers
    log_info "Stopping containerized services..."
    docker compose $COMPOSE_FILES $PROFILES down 2>/dev/null
    
    log_success "All processes stopped and containers shut down successfully."
    exit 0
}
trap cleanup INT TERM

show_banner() {
    clear
    echo -e "${CYAN}    █████╗ ██████╗ ████████╗██╗  ██╗ █████╗ ${NC}"
    echo -e "${CYAN}   ██╔══██╗██╔══██╗╚══██╔══╝██║  ██║██╔══██╗${NC}"
    echo -e "${CYAN}   ███████║██████╔╝   ██║   ███████║███████║${NC}"
    echo -e "${CYAN}   ██╔══██║██╔══██╗   ██║   ██╔══██║██╔══██║${NC}"
    echo -e "${CYAN}   ██║  ██║██║  ██║   ██║   ██║  ██║██║  ██║${NC}"
    echo -e "${CYAN}   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝${NC}"
    echo -e "${PURPLE}        Local-first AI Workspace.         ${NC}"
    echo -e "${WHITE}────────────────────────────────────────────────────────${NC}"
    echo ""
}

load_env() {
    if [ ! -f .env ]; then
        log_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
    fi

    # Export all vars from .env into the current shell so Alembic and workers can read them
    set -a
    # shellcheck source=.env
    source .env
    set +a

    # Construct DATABASE_URL and REDIS_URL from component vars if not explicitly set.
    # Uses host-exposed ports from compose.dev.yaml (5435 for postgres, 6379 for redis).
    if [ -z "$DATABASE_URL" ]; then
        export DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER:-ragapp}:${POSTGRES_PASSWORD:-ragapp}@localhost:5435/${POSTGRES_DB:-ragapp}"
    fi
    if [ -z "$REDIS_URL" ]; then
        export REDIS_URL="redis://localhost:6379"
    fi

    # Sync .env to subdirectories so pydantic-settings finds it when running from those dirs.
    # The exported DATABASE_URL and REDIS_URL above are inherited by all child processes
    # (uv run alembic, uvicorn, arq) via the shell environment — no extra writes needed.
    cp .env backend/.env 2>/dev/null
    cp .env frontend/.env 2>/dev/null
}

check_tool() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log_error "Required tool '$1' is not installed on your host machine."
        log_info "Please install '$1' to run this service locally."
        exit 1
    fi
}

check_docker() {
    log_step "Checking Docker daemon status..."
    if ! docker info >/dev/null 2>&1; then
        log_warning "Docker daemon is not running."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            log_info "Attempting to start Docker on macOS..."
            open -a Docker
            log_info "Waiting for Docker daemon to start (this may take up to 45 seconds)..."
            local timeout=45
            local count=0
            while ! docker info >/dev/null 2>&1; do
                if [ $count -ge $timeout ]; then
                    log_error "Docker failed to start automatically. Please launch Docker Desktop manually."
                    exit 1
                fi
                sleep 3
                count=$((count + 3))
                echo -n "."
            done
            echo ""
            log_success "Docker daemon is now running!"
        else
            log_error "Please start Docker and try again."
            exit 1
        fi
    else
        log_success "Docker daemon is active."
    fi
}

check_ollama() {
    log_step "Checking Ollama integration..."
    if curl -s -f http://localhost:11434 >/dev/null 2>&1; then
        log_success "Ollama host is reachable at http://localhost:11434"
        
        # Load models from env or default
        local OLLAMA_REASONER=${OLLAMA_MODEL_REASONER:-"gemma4:e4b"}
        local OLLAMA_EMBED=${OLLAMA_MODEL_EMBED:-"nomic-embed-text"}
        
        log_info "Checking pulled models..."
        local pulled_models=$(curl -s http://localhost:11434/api/tags)
        
        if echo "$pulled_models" | grep -q "$OLLAMA_REASONER"; then
            log_success "Model '$OLLAMA_REASONER' (Reasoner) is already pulled."
        else
            log_warning "Model '$OLLAMA_REASONER' is not pulled. You can pull it using: ollama pull $OLLAMA_REASONER"
        fi
        
        if echo "$pulled_models" | grep -q "$OLLAMA_EMBED"; then
            log_success "Model '$OLLAMA_EMBED' (Embeddings) is already pulled."
        else
            log_warning "Model '$OLLAMA_EMBED' is not pulled. You can pull it using: ollama pull $OLLAMA_EMBED"
        fi
    else
        log_warning "Ollama host is NOT reachable at http://localhost:11434"
        log_warning "Please ensure Ollama is installed and running on your host machine ('ollama serve')."
    fi
}

start_stack() {
    check_docker
    load_env
    check_tool uv
    check_tool bun
    check_ollama
    
    log_step "Starting infrastructure containers (PostgreSQL, Redis, Langfuse)..."
    docker compose $COMPOSE_FILES $PROFILES up -d
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start services via docker compose."
        exit 1
    fi
    log_success "Infrastructure containers started."
    
    # Wait for postgres to be healthy
    log_step "Waiting for database (PostgreSQL) to be healthy..."
    local timeout=60
    local count=0
    while true; do
        local status=$(docker inspect --format='{{.State.Health.Status}}' $(docker compose $COMPOSE_FILES ps -q postgres 2>/dev/null) 2>/dev/null)
        if [ "$status" == "healthy" ]; then
            log_success "PostgreSQL is healthy!"
            break
        elif [ "$status" == "unhealthy" ]; then
            log_error "PostgreSQL reported unhealthy status. Checking container logs..."
            docker compose $COMPOSE_FILES logs postgres
            exit 1
        fi
        
        if [ $count -ge $timeout ]; then
            log_warning "Timeout waiting for PostgreSQL to be healthy. Trying local migrations anyway..."
            break
        fi
        
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    echo ""
    
    # Run database migrations locally from the host
    log_step "Running database migrations locally via Alembic..."
    cd backend
    uv run alembic upgrade head
    if [ $? -eq 0 ]; then
        log_success "Alembic migrations completed successfully!"
    else
        log_error "Local Alembic migrations failed. Check your environment settings."
        exit 1
    fi
    cd ..

    # Proactively clean up any ghost processes from previous ungraceful exits
    log_step "Cleaning up any leftover host processes..."
    pkill -f "uvicorn src.main:app" 2>/dev/null
    pkill -f "arq src.workers.arq_worker.WorkerSettings" 2>/dev/null
    pkill -f "next dev" 2>/dev/null

    echo -e "\n${GREEN}${BOLD}🎉 LAUNCHING LOCAL DEVELOPMENT SERVICES...${NC}"
    echo -e "🔗 ${WHITE}Frontend Dashboard:${NC}   ${CYAN}http://localhost:3000${NC}"
    echo -e "🔗 ${WHITE}Backend API Docs:${NC}     ${CYAN}http://localhost:8000/docs${NC}"
    echo -e "🔗 ${WHITE}Langfuse Trace UI:${NC}   ${CYAN}http://localhost:3001${NC}"
    echo -e "${YELLOW}Streaming logs. Press Ctrl+C to stop all services and containers cleanly.${NC}\n"

    # Start Backend API Server
    cd backend
    uv run uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload 2>&1 | sed -u "s/^/${YELLOW}[backend] ${NC}/" &
    BACKEND_PID=$!
    cd ..

    # Start Arq Background Worker
    cd backend
    uv run arq src.workers.arq_worker.WorkerSettings 2>&1 | sed -u "s/^/${PURPLE}[worker]  ${NC}/" &
    WORKER_PID=$!
    cd ..

    # Start Frontend Next.js Client
    cd frontend
    bun run dev 2>&1 | sed -u "s/^/${CYAN}[frontend] ${NC}/" &
    FRONTEND_PID=$!
    cd ..

    # Stream containerized infrastructure logs
    docker compose $COMPOSE_FILES logs -f 2>&1 | sed -u "s/^/${BLUE}[docker]   ${NC}/" &
    DOCKER_LOGS_PID=$!

    # Active monitoring loop: shut down if any background host process crashes
    while true; do
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            log_error "Backend service exited unexpectedly!"
            break
        fi
        if ! kill -0 $WORKER_PID 2>/dev/null; then
            log_error "Worker service exited unexpectedly!"
            break
        fi
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            log_error "Frontend service exited unexpectedly!"
            break
        fi
        sleep 2
    done

    cleanup
}

stop_stack() {
    check_docker
    load_env
    log_step "Stopping all host processes and containers..."
    
    pkill -f "uvicorn src.main:app" 2>/dev/null
    pkill -f "arq src.workers.arq_worker.WorkerSettings" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    
    docker compose $COMPOSE_FILES $PROFILES down
    log_success "All processes stopped and containers shut down successfully."
}

restart_stack() {
    stop_stack
    start_stack
}

view_status() {
    check_docker
    log_step "Current service status (Docker infra):"
    docker compose $COMPOSE_FILES ps
    echo ""
    log_step "Current host service statuses:"
    if pgrep -f "uvicorn src.main:app" >/dev/null; then
        echo -e "  Backend API: ${GREEN}RUNNING${NC}"
    else
        echo -e "  Backend API: ${RED}STOPPED${NC}"
    fi
    if pgrep -f "arq src.workers.arq_worker.WorkerSettings" >/dev/null; then
        echo -e "  Arq Worker:  ${GREEN}RUNNING${NC}"
    else
        echo -e "  Arq Worker:  ${RED}STOPPED${NC}"
    fi
    if pgrep -f "next dev" >/dev/null; then
        echo -e "  Frontend:    ${GREEN}RUNNING${NC}"
    else
        echo -e "  Frontend:    ${RED}STOPPED${NC}"
    fi
}

tail_logs() {
    check_docker
    log_step "Streaming logs for containerized infrastructure..."
    docker compose $COMPOSE_FILES logs -f "$@"
}

run_migrations() {
    load_env
    check_tool uv
    log_step "Running database migrations locally via Alembic..."
    cd backend
    uv run alembic upgrade head
}

clean_system() {
    check_docker
    log_warning "This will stop all services and delete ALL volumes (losing database, redis, and langfuse data)!"
    read -p "Are you absolutely sure you want to proceed? (y/N) " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        log_step "Stopping services and deleting volumes..."
        pkill -f "uvicorn src.main:app" 2>/dev/null
        pkill -f "arq src.workers.arq_worker.WorkerSettings" 2>/dev/null
        pkill -f "next dev" 2>/dev/null
        docker compose $COMPOSE_FILES down -v
        log_success "Stack stopped and volumes deleted successfully."
    else
        log_info "Operation cancelled."
    fi
}

interactive_menu() {
    while true; do
        show_banner
        echo -e "${BOLD}${WHITE}What would you like to do?${NC}"
        echo ""
        echo -e "  ${CYAN}1)${NC} 🚀 ${WHITE}Start Artha${NC}              Boot infra + backend + frontend with live logs"
        echo -e "  ${CYAN}2)${NC} 🛑 ${WHITE}Stop Everything${NC}          Kill all processes and containers"
        echo -e "  ${CYAN}3)${NC} ♻️  ${WHITE}Restart${NC}                  Full stop → start cycle"
        echo -e "  ${CYAN}4)${NC} 📊 ${WHITE}Health Check${NC}              Show status of all host & Docker services"
        echo -e "  ${CYAN}5)${NC} 📋 ${WHITE}Stream Infra Logs${NC}         Tail PostgreSQL / Redis / Langfuse logs"
        echo -e "  ${CYAN}6)${NC} 🗄️  ${WHITE}Run Migrations${NC}            Apply pending Alembic schema migrations"
        echo -e "  ${CYAN}7)${NC} 🧹 ${WHITE}Wipe All Data${NC}             Stop stack and delete all Docker volumes"
        echo -e "  ${CYAN}8)${NC} 🚪 ${WHITE}Exit${NC}"
        echo ""
        read -p "Enter your choice (1-8): " choice
        echo ""

        case $choice in
            1)
                start_stack
                break
                ;;
            2)
                stop_stack
                break
                ;;
            3)
                restart_stack
                break
                ;;
            4)
                view_status
                ;;
            5)
                tail_logs
                ;;
            6)
                run_migrations
                ;;
            7)
                clean_system
                ;;
            8)
                log_success "Goodbye!"
                exit 0
                ;;
            *)
                log_error "Invalid selection. Please try again."
                sleep 1.5
                ;;
        esac

        echo ""
        read -p "Press Enter to return to the menu..." dummy
    done
}

# Handle direct command-line arguments
if [ $# -gt 0 ]; then
    show_banner
    COMMAND=$1
    shift
    case "$COMMAND" in
        up|start)
            start_stack
            ;;
        down|stop)
            stop_stack
            ;;
        restart)
            restart_stack
            ;;
        status|ps)
            view_status
            ;;
        logs)
            tail_logs "$@"
            ;;
        migrate)
            run_migrations
            ;;
        clean)
            clean_system
            ;;
        help|-h|--help)
            echo -e "Usage: ./run.sh [command]"
            echo ""
            echo "Commands:"
            echo "  start, up       Start Docker infra, run local migrations, start host apps with unified logs"
            echo "  stop, down      Stop all running services and host processes"
            echo "  restart         Stop and then start services"
            echo "  status, ps      Show current status of host processes and containers"
            echo "  logs [service]  Tail logs of specific Docker container services"
            echo "  migrate         Manually run database migrations locally"
            echo "  clean           Stop stack and delete volumes (data reset)"
            echo "  help            Show this help menu"
            echo ""
            echo "Options:"
            echo "  (No custom options available)"
            echo ""
            echo "If run without commands, opens the interactive menu."
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo "Run './run.sh help' for usage instructions."
            exit 1
            ;;
    esac
else
    interactive_menu
fi
