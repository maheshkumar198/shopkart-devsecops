up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

test:
	cd services/auth-service && npm test
	cd services/catalog-service && npm test
	cd services/order-service && npm test

coverage:
	cd services/auth-service && npm run test:coverage
	cd services/catalog-service && npm run test:coverage
	cd services/order-service && npm run test:coverage
