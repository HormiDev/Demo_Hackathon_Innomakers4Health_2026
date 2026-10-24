NAME := deriva
COMPOSE := docker compose
-include .env
APP_PORT ?= 8080

.PHONY: all build up down restart logs test test-live test-quality clean fclean re help

all: up

build:
	$(COMPOSE) build app

up:
	$(COMPOSE) up --build -d app
	@printf 'Deriva disponible en http://localhost:%s\n' "$(APP_PORT)"

down:
	$(COMPOSE) down --remove-orphans

restart:
	$(COMPOSE) restart app

logs:
	$(COMPOSE) logs --tail=100 -f app

test:
	$(COMPOSE) --profile test build backend-tests frontend-tests
	$(COMPOSE) --profile test run --rm backend-tests
	$(COMPOSE) --profile test run --rm frontend-tests

test-live:
	$(COMPOSE) exec -T app python scripts/live_check.py

test-quality:
	$(COMPOSE) exec -T app python scripts/quality_check.py --repeat 2

clean:
	$(COMPOSE) down --remove-orphans

fclean: clean
	@for image in deriva:local deriva-backend-tests:local deriva-frontend-tests:local; do \
		if docker image inspect "$$image" >/dev/null 2>&1; then docker image rm "$$image"; fi; \
	done

re:
	$(MAKE) fclean
	$(MAKE) all

help:
	@printf '%s\n' 'all/up    Compila e inicia la aplicación' 'build     Compila la imagen' 'down      Detiene los servicios' 'restart   Reinicia la aplicación' 'logs      Muestra logs sin contenido clínico' 'test      Ejecuta las pruebas aisladas' 'test-live Comprueba Tev con casos ficticios' 'test-quality Audita decisiones y resultados con Tev real' 'clean     Elimina contenedores del proyecto' 'fclean    Elimina también sus tres imágenes' 're        Reconstruye el proyecto' 'help      Muestra esta ayuda'
