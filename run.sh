#!/usr/bin/env bash

# Colors
CYAN=$'\033[0;36m'
WHITE=$'\033[1;37m'
PURPLE=$'\033[0;35m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
NC=$'\033[0m' # No Color
BOLD=$'\033[1m'

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

interactive_menu() {
    while true; do
        show_banner
        echo -e "${BOLD}${WHITE}What would you like to do?${NC}"
        echo ""
        echo -e "  ${CYAN}1)${NC} 🐳 ${WHITE}Start Artha (Docker)${NC}     Build & start all services in Docker (make docker-up)"
        echo -e "  ${CYAN}2)${NC} 💻 ${WHITE}Start Artha (Native Dev)${NC}  Boot infra + backend + frontend (make dev)"
        echo -e "  ${CYAN}3)${NC} 🛑 ${WHITE}Stop Infra${NC}               Stop Docker containers (make down)"
        echo -e "  ${CYAN}4)${NC} ♻️  ${WHITE}Restart${NC}                  Full stop → native dev cycle"
        echo -e "  ${CYAN}5)${NC} 📋 ${WHITE}Logs${NC}                     Tail all service logs (make docker-logs)"
        echo -e "  ${CYAN}6)${NC} 🗄️  ${WHITE}Run Migrations${NC}           Apply pending DB migrations (make docker-migrate)"
        echo -e "  ${CYAN}7)${NC} 🧹 ${WHITE}Wipe All Data${NC}             Stop stack and delete all data/volumes (make clean)"
        echo -e "  ${CYAN}8)${NC} 🚪 ${WHITE}Exit${NC}"
        echo ""
        read -p "Enter your choice (1-8): " choice
        echo ""

        case $choice in
            1)
                make docker-up
                break
                ;;
            2)
                make dev
                break
                ;;
            3)
                make down
                ;;
            4)
                make down
                make dev
                break
                ;;
            5)
                make docker-logs
                ;;
            6)
                make docker-migrate
                ;;
            7)
                make clean
                ;;
            8)
                echo -e "${GREEN}✅ Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid selection. Please try again.${NC}"
                sleep 1.5
                ;;
        esac

        echo ""
        read -p "Press Enter to return to the menu..." dummy
    done
}

# Handle direct command-line arguments
if [ $# -gt 0 ]; then
    COMMAND=$1
    shift
    case "$COMMAND" in
        up|start)
            make dev
            ;;
        down|stop)
            make down
            ;;
        restart)
            make down && make dev
            ;;
        logs)
            make logs
            ;;
        migrate)
            make migrate
            ;;
        clean)
            make clean
            ;;
        format)
            make format
            ;;
        lint)
            make lint
            ;;
        help|-h|--help)
            echo "Artha run.sh wrapper for Makefile"
            echo "Usage: ./run.sh [command]"
            echo ""
            echo "Commands:"
            echo "  start, up       -> make dev"
            echo "  stop, down      -> make down"
            echo "  restart         -> make down && make dev"
            echo "  logs            -> make logs"
            echo "  migrate         -> make migrate"
            echo "  clean           -> make clean"
            echo "  format          -> make format"
            echo "  lint            -> make lint"
            echo ""
            echo "If run without commands, opens the interactive menu."
            make help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
            echo "Run './run.sh help' for usage instructions."
            exit 1
            ;;
    esac
else
    interactive_menu
fi
