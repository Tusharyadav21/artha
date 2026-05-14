#!/usr/bin/env bash

# Signal trap for graceful exits
trap "echo -e '\n\n\033[0;31m🛑 Execution interrupted by user.\033[0m'; exit 1" INT

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging helpers
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

# Docker Compose Configuration
COMPOSE_BASE="compose.yaml"
COMPOSE_DEV="compose.dev.yaml"
COMPOSE_PROD="compose.prod.yaml"

# Default to dev
COMPOSE_FILES="-f $COMPOSE_BASE -f $COMPOSE_DEV"
PROFILES=""

# Check for production flag in arguments
for arg in "$@"; do
    if [ "$arg" == "--prod" ]; then
        COMPOSE_FILES="-f $COMPOSE_BASE -f $COMPOSE_PROD"
        log_warning "Running in PRODUCTION mode!"
    fi
    if [ "$arg" == "--dev-tools" ]; then
        PROFILES="--profile dev"
        log_info "Including developer tools (pgAdmin, Redis Commander)..."
    fi
done

show_banner() {
    clear
    echo -e "${CYAN}  █████╗  ██████╗ ███████╗███╗   ██╗████████╗██╗ ██████╗    ██████╗  █████╗  ██████╗ ${NC}"
    echo -e "${CYAN} ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██║██╔════╝    ██╔══██╗██╔══██╗██╔════╝ ${NC}"
    echo -e "${CYAN} ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ██║██║         ██████╔╝███████║██║  ███╗${NC}"
    echo -e "${CYAN} ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██║██║         ██╔══██╗██╔══██║██║   ██║${NC}"
    echo -e "${CYAN} ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ██║╚██████╗    ██║  ██║██║  ██║╚██████╔╝${NC}"
    echo -e "${CYAN} ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝ ╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ${NC}"
    echo -e "${PURPLE}                  Autonomous Retrieval-Augmented Generation Stack${NC}"
    echo -e "${WHITE}─────────────────────────────────────────────────────────────────────────────────${NC}"
    echo ""
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

check_env() {
    log_step "Checking environment configuration..."
    if [ ! -f .env ]; then
        log_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        log_success ".env file created. You may want to customize secrets in it."
    else
        log_success ".env file is present."
    fi
}

check_ollama() {
    log_step "Checking Ollama integration..."
    if curl -s -f http://localhost:11434 >/dev/null 2>&1; then
        log_success "Ollama host is reachable at http://localhost:11434"
        
        # Load models from .env or default
        local OLLAMA_REASONER=$(grep -E '^OLLAMA_MODEL_REASONER=' .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        local OLLAMA_EMBED=$(grep -E '^OLLAMA_MODEL_EMBED=' .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        
        OLLAMA_REASONER=${OLLAMA_REASONER:-"qwen2.5:3b"}
        OLLAMA_EMBED=${OLLAMA_EMBED:-"nomic-embed-text"}
        
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
    check_env
    check_ollama
    
    log_step "Starting the Docker Compose services with --build..."
    docker compose $COMPOSE_FILES $PROFILES up -d --build
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start services via docker compose."
        exit 1
    fi
    
    log_success "Docker containers are starting up in the background."
    
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
            log_error "PostgreSQL reported unhealthy status. Checking logs..."
            docker compose $COMPOSE_FILES logs postgres
            exit 1
        fi
        
        if [ $count -ge $timeout ]; then
            log_warning "Timeout waiting for PostgreSQL to be healthy. Attempting database migrations anyway..."
            break
        fi
        
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    echo ""
    
    # Run database migrations
    log_step "Running database migrations via Alembic..."
    docker compose $COMPOSE_FILES exec backend alembic upgrade head
    if [ $? -eq 0 ]; then
        log_success "Database migrations executed successfully!"
    else
        log_warning "Alembic migrations might have failed or backend service is not fully ready. Retrying in 5 seconds..."
        sleep 5
        docker compose $COMPOSE_FILES exec backend alembic upgrade head
        if [ $? -eq 0 ]; then
            log_success "Database migrations executed successfully on second attempt!"
        else
            log_error "Alembic migrations failed. You can run them manually later using './run.sh migrate'."
        fi
    fi
    
    echo -e "\n${GREEN}${BOLD}🎉 AGENTIC RAG SERVICES ARE SUCCESSFULLY RUNNING!${NC}\n"
    echo -e "🔗 ${WHITE}Frontend Dashboard:${NC}   ${CYAN}http://localhost:3000${NC}"
    echo -e "🔗 ${WHITE}Backend API Docs:${NC}     ${CYAN}http://localhost:8000/docs${NC}"
    echo -e "🔗 ${WHITE}Langfuse Trace UI:${NC}   ${CYAN}http://localhost:3001${NC}"
    echo ""
    
    log_step "Streaming logs (interactive mode)..."
    docker compose $COMPOSE_FILES logs -f
}

stop_stack() {
    check_docker
    log_step "Stopping all Agentic RAG services..."
    docker compose $COMPOSE_FILES down
    log_success "All services stopped."
}

restart_stack() {
    stop_stack
    start_stack
}

view_status() {
    check_docker
    log_step "Current service status:"
    docker compose $COMPOSE_FILES ps
}

tail_logs() {
    check_docker
    if [ -z "$1" ]; then
        log_step "Streaming logs for all services (Ctrl+C to stop)..."
        docker compose $COMPOSE_FILES logs -f
    else
        log_step "Streaming logs for '$1' (Ctrl+C to stop)..."
        docker compose $COMPOSE_FILES logs -f "$1"
    fi
}

run_migrations() {
    check_docker
    log_step "Running Alembic database migrations..."
    docker compose $COMPOSE_FILES exec backend alembic upgrade head
}

clean_system() {
    check_docker
    log_warning "This will stop all services and delete ALL volumes (losing database, redis, and langfuse data)!"
    read -p "Are you absolutely sure you want to proceed? (y/N) " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        log_step "Stopping services and deleting volumes..."
        docker compose $COMPOSE_FILES down -v
        log_success "Stack stopped and volumes deleted successfully."
    else
        log_info "Operation cancelled."
    fi
}

interactive_menu() {
    while true; do
        show_banner
        echo -e "${BOLD}${WHITE}Select an action to perform:${NC}"
        echo -e "  ${CYAN}1)${NC} 🚀 Start Stack (Build + Migrations + Logs)"
        echo -e "  ${CYAN}2)${NC} 🛠️  Start Stack with Dev Tools (pgAdmin, Redis Commander)"
        echo -e "  ${CYAN}3)${NC} 🛑 Stop Stack"
        echo -e "  ${CYAN}4)${NC} ♻️  Restart Stack"
        echo -e "  ${CYAN}5)${NC} 📊 Check Services Status (ps)"
        echo -e "  ${CYAN}6)${NC} 📋 View Services Logs"
        echo -e "  ${CYAN}7)${NC} ⚙️  Run Database Migrations"
        echo -e "  ${CYAN}8)${NC} 🧹 Deep Clean Stack (Remove Volumes)"
        echo -e "  ${CYAN}9)${NC} 🚪 Exit"
        echo ""
        read -p "Enter your choice (1-9): " choice
        echo ""
        
        case $choice in
            1)
                start_stack
                break
                ;;
            2)
                PROFILES="--profile dev"
                start_stack
                break
                ;;
            3)
                stop_stack
                break
                ;;
            4)
                restart_stack
                break
                ;;
            5)
                view_status
                ;;
            6)
                echo "Select logs to view:"
                echo "1) All services"
                echo "2) Backend"
                echo "3) Frontend"
                echo "4) Worker"
                echo "5) Postgres"
                echo "6) Redis"
                echo "7) Langfuse"
                read -p "Choose service (1-7): " log_choice
                case $log_choice in
                    1) tail_logs ;;
                    2) tail_logs backend ;;
                    3) tail_logs frontend ;;
                    4) tail_logs worker ;;
                    5) tail_logs postgres ;;
                    6) tail_logs redis ;;
                    7) tail_logs langfuse ;;
                    *) log_error "Invalid option" ;;
                esac
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
    # Filter out our custom flags before passing to command logic
    COMMAND=$1
    shift
    case "$COMMAND" in
        up|start)
            if [ "$2" == "--build" ] || [ "$2" == "-b" ]; then
                start_stack --build
            else
                start_stack
            fi
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
            tail_logs "$2"
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
            echo "  start, up       Start all services and run database migrations"
            echo "  start --build   Rebuild container images and start services"
            echo "  stop, down      Stop all running services"
            echo "  restart         Stop and then start services"
            echo "  status, ps      Show current status of all containers"
            echo "  logs [service]  Tail logs of all or a specific service (e.g., backend, frontend)"
            echo "  migrate         Manually run database migrations"
            echo "  clean           Stop containers and delete volumes (data reset)"
            echo "  help            Show this help menu"
            echo ""
            echo "Options:"
            echo "  --prod          Run using production overrides (compose.prod.yaml)"
            echo "  --dev-tools     Include dev tools profile (pgAdmin, Redis Commander)"
            echo ""
            echo "If run without commands, opens the interactive menu."
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Run './run.sh help' for usage instructions."
            exit 1
            ;;
    esac
else
    interactive_menu
fi
