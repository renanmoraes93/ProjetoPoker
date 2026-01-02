#!/bin/bash

echo ""
echo "========================================"
echo "  🦍 Gorila'z Poker Club - Docker Setup"
echo "========================================"
echo ""

echo "Verificando se o Docker está rodando..."
if ! docker version >/dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    echo "Por favor, inicie o Docker e tente novamente."
    exit 1
fi

echo "✅ Docker está rodando!"
echo ""

echo "Escolha uma opção:"
echo ""
echo "1) Produção (Aplicação completa em um container)"
echo "2) Desenvolvimento (Backend e Frontend separados com hot reload)"
echo "3) Parar todos os containers"
echo "4) Limpar dados e reconstruir"
echo ""
read -p "Digite sua escolha (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Iniciando em modo PRODUÇÃO..."
        echo ""
        docker-compose up --build -d
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Aplicação iniciada com sucesso!"
            echo "🌐 Acesse: http://localhost:5000"
            echo "🔍 Health Check: http://localhost:5000/api/health"
            echo ""
            echo "Credenciais de teste:"
            echo "👤 Admin: admin / admin123"
            echo "👤 Jogador: jogador1 / senha123"
            echo ""
            echo "Para ver logs: docker-compose logs -f"
            echo "Para parar: docker-compose down"
        else
            echo "❌ Erro ao iniciar a aplicação!"
        fi
        ;;
    2)
        echo ""
        echo "🛠️ Iniciando em modo DESENVOLVIMENTO..."
        echo ""
        docker-compose -f docker-compose.dev.yml up --build -d
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Aplicação iniciada com sucesso!"
            echo "🌐 Frontend: http://localhost:3000"
            echo "🔧 Backend: http://localhost:5000"
            echo "🔍 Health Check: http://localhost:5000/api/health"
            echo ""
            echo "Credenciais de teste:"
            echo "👤 Admin: admin / admin123"
            echo "👤 Jogador: jogador1 / senha123"
            echo ""
            echo "Para ver logs: docker-compose -f docker-compose.dev.yml logs -f"
            echo "Para parar: docker-compose -f docker-compose.dev.yml down"
        else
            echo "❌ Erro ao iniciar a aplicação!"
        fi
        ;;
    3)
        echo ""
        echo "🛑 Parando todos os containers..."
        echo ""
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        echo "✅ Containers parados!"
        ;;
    4)
        echo ""
        echo "🧹 Limpando dados e reconstruindo..."
        echo ""
        echo "Parando containers..."
        docker-compose down -v
        docker-compose -f docker-compose.dev.yml down -v
        echo ""
        echo "Removendo imagens antigas..."
        docker image prune -f
        echo ""
        echo "Reconstruindo..."
        docker-compose build --no-cache
        echo ""
        echo "✅ Limpeza concluída!"
        echo "Agora você pode escolher a opção 1 ou 2 para iniciar."
        ;;
    *)
        echo "Opção inválida!"
        exit 1
        ;;
esac

echo ""
echo "Pressione Enter para sair..."
read