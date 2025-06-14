#!/bin/bash
set -e

# ==============================================================================
# SCRIPT DE CONFIGURATION PRODUCTION AVEC NGINX + HTTPS
# ==============================================================================

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Configuration de la production avec nginx + HTTPS${NC}"
echo "=================================================================="

# Variables
DOMAIN=""
EMAIL=""
USE_LETSENCRYPT=false

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN     Domaine pour HTTPS (ex: api.monsite.com)"
    echo "  -e, --email EMAIL       Email pour Let's Encrypt"
    echo "  --dev                   Mode développement (certificats auto-signés)"
    echo "  -h, --help              Affiche cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --dev                                    # Mode développement"
    echo "  $0 -d api.monsite.com -e admin@monsite.com # Mode production"
}

# Parsing des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            USE_LETSENCRYPT=true
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        --dev)
            USE_LETSENCRYPT=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# ==============================================================================
# FONCTIONS UTILITAIRES
# ==============================================================================

check_requirements() {
    echo -e "${YELLOW}🔍 Vérification des prérequis...${NC}"
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prérequis validés${NC}"
}

setup_directories() {
    echo -e "${YELLOW}📁 Création des dossiers nécessaires...${NC}"
    
    # Dossiers pour Let's Encrypt
    sudo mkdir -p /etc/letsencrypt
    sudo mkdir -p /var/www/certbot
    
    echo -e "${GREEN}✅ Dossiers créés${NC}"
}

configure_nginx_domain() {
    if [[ "$USE_LETSENCRYPT" == true ]]; then
        echo -e "${YELLOW}🔧 Configuration du domaine dans nginx...${NC}"
        
        if [[ -z "$DOMAIN" ]]; then
            echo -e "${RED}❌ Domaine manquant. Utilisez -d votre-domaine.com${NC}"
            exit 1
        fi
        
        # Sauvegarder l'original
        cp nginx/nginx.conf nginx/nginx.conf.backup
        
        # Remplacer le domaine
        sed -i.tmp "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf
        rm nginx/nginx.conf.tmp 2>/dev/null || true
        
        echo -e "${GREEN}✅ Domaine configuré: $DOMAIN${NC}"
    else
        echo -e "${YELLOW}⚠️  Mode développement - utilisation de localhost${NC}"
    fi
}

obtain_certificates() {
    if [[ "$USE_LETSENCRYPT" == true ]]; then
        echo -e "${YELLOW}🔐 Obtention des certificats Let's Encrypt...${NC}"
        
        if [[ -z "$EMAIL" ]]; then
            echo -e "${RED}❌ Email manquant. Utilisez -e votre-email@exemple.com${NC}"
            exit 1
        fi
        
        # Démarrer nginx temporairement pour le challenge
        echo -e "${YELLOW}📡 Démarrage de nginx pour le challenge ACME...${NC}"
        docker run --rm -d \
            --name nginx-temp \
            -p 80:80 \
            -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
            -v "/var/www/certbot:/var/www/certbot:ro" \
            nginx:alpine
        
        # Attendre que nginx soit prêt
        sleep 3
        
        # Obtenir le certificat
        echo -e "${YELLOW}🔑 Obtention du certificat pour $DOMAIN...${NC}"
        docker run --rm \
            -v /etc/letsencrypt:/etc/letsencrypt \
            -v /var/www/certbot:/var/www/certbot \
            -p 80:80 \
            certbot/certbot \
            certonly --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" || {
                echo -e "${RED}❌ Échec de l'obtention du certificat${NC}"
                docker stop nginx-temp 2>/dev/null || true
                exit 1
            }
        
        # Arrêter nginx temporaire
        docker stop nginx-temp 2>/dev/null || true
        
        echo -e "${GREEN}✅ Certificats obtenus avec succès${NC}"
    else
        echo -e "${YELLOW}📝 Mode développement - génération de certificats auto-signés...${NC}"
        ./scripts/generate-ssl-certs.sh 2>/dev/null || {
            echo -e "${YELLOW}⚠️  Script de génération de certificats non trouvé - continuons sans${NC}"
        }
    fi
}

# ==============================================================================
# FONCTION PRINCIPALE
# ==============================================================================

main() {
    echo -e "${BLUE}Configuration choisie:${NC}"
    if [[ "$USE_LETSENCRYPT" == true ]]; then
        echo "  • Mode: Production avec Let's Encrypt"
        echo "  • Domaine: $DOMAIN"
        echo "  • Email: $EMAIL"
    else
        echo "  • Mode: Développement"
        echo "  • Certificats: Auto-signés"
    fi
    echo ""
    
    read -p "Continuer ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏸️  Configuration annulée${NC}"
        exit 0
    fi
    
    # Exécution des étapes
    check_requirements
    setup_directories
    configure_nginx_domain
    obtain_certificates
    
    echo ""
    echo -e "${GREEN}🎉 Configuration terminée avec succès !${NC}"
    echo "=================================================================="
    echo ""
    echo -e "${BLUE}📋 Prochaines étapes:${NC}"
    echo ""
    echo "1. Vérifier votre fichier .env.production"
    echo "2. Démarrer les services:"
    echo -e "   ${YELLOW}docker compose -f docker-compose.prod.yml up -d${NC}"
    echo ""
    echo "3. Vérifier le statut:"
    echo -e "   ${YELLOW}docker compose -f docker-compose.prod.yml ps${NC}"
    echo ""
    if [[ "$USE_LETSENCRYPT" == true ]]; then
        echo "4. Tester HTTPS:"
        echo -e "   ${YELLOW}curl -s https://$DOMAIN/health | jq .${NC}"
        echo ""
        echo "5. Accéder à la documentation:"
        echo -e "   ${YELLOW}https://$DOMAIN/api${NC}"
    else
        echo "4. Tester HTTP:"
        echo -e "   ${YELLOW}curl -s http://localhost/health | jq .${NC}"
        echo ""
        echo "5. Accéder à la documentation:"
        echo -e "   ${YELLOW}http://localhost/api${NC}"
    fi
    echo ""
}

# Exécution
main 