@echo off
echo.
echo ========================================
echo   🦍 Gorila'z Poker Club - Docker Setup
echo ========================================
echo.

echo Verificando se o Docker Desktop está rodando...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop não está rodando!
    echo Por favor, inicie o Docker Desktop e tente novamente.
    pause
    exit /b 1
)

echo ✅ Docker Desktop está rodando!
echo.

echo Escolha uma opção:
echo.
echo 1) Produção (Aplicação completa em um container)
echo 2) Desenvolvimento (Backend e Frontend separados com hot reload)
echo 3) Parar todos os containers
echo 4) Limpar dados e reconstruir
echo.
set /p choice="Digite sua escolha (1-4): "

if "%choice%"=="1" goto production
if "%choice%"=="2" goto development
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto clean

echo Opção inválida!
pause
exit /b 1

:production
echo.
echo 🚀 Iniciando em modo PRODUÇÃO...
echo.
docker-compose up --build -d
if %errorlevel% equ 0 (
    echo.
    echo ✅ Aplicação iniciada com sucesso!
    echo 🌐 Acesse: http://localhost:5000
    echo 🔍 Health Check: http://localhost:5000/api/health
    echo.
    echo Credenciais de teste:
    echo 👤 Admin: admin / admin123
    echo 👤 Jogador: jogador1 / senha123
    echo.
    echo Para ver logs: docker-compose logs -f
    echo Para parar: docker-compose down
) else (
    echo ❌ Erro ao iniciar a aplicação!
)
goto end

:development
echo.
echo 🛠️ Iniciando em modo DESENVOLVIMENTO...
echo.
docker-compose -f docker-compose.dev.yml up --build -d
if %errorlevel% equ 0 (
    echo.
    echo ✅ Aplicação iniciada com sucesso!
    echo 🌐 Frontend: http://localhost:3000
    echo 🔧 Backend: http://localhost:5000
    echo 🔍 Health Check: http://localhost:5000/api/health
    echo.
    echo Credenciais de teste:
    echo 👤 Admin: admin / admin123
    echo 👤 Jogador: jogador1 / senha123
    echo.
    echo Para ver logs: docker-compose -f docker-compose.dev.yml logs -f
    echo Para parar: docker-compose -f docker-compose.dev.yml down
) else (
    echo ❌ Erro ao iniciar a aplicação!
)
goto end

:stop
echo.
echo 🛑 Parando todos os containers...
echo.
docker-compose down
docker-compose -f docker-compose.dev.yml down
echo ✅ Containers parados!
goto end

:clean
echo.
echo 🧹 Limpando dados e reconstruindo...
echo.
echo Parando containers...
docker-compose down -v
docker-compose -f docker-compose.dev.yml down -v
echo.
echo Removendo imagens antigas...
docker image prune -f
echo.
echo Reconstruindo...
docker-compose build --no-cache
echo.
echo ✅ Limpeza concluída!
echo Agora você pode escolher a opção 1 ou 2 para iniciar.
goto end

:end
echo.
echo Pressione qualquer tecla para sair...
pause >nul