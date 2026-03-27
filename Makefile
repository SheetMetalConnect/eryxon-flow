# Eryxon Flow — Common tasks
# Usage: make <target>

.PHONY: dev build test lint deps-graph deps-circular analyze deploy-fn new-adr types

## Development
dev:
	npm run dev

build:
	npm run build

test:
	npm run test:run

lint:
	npm run lint

## Analysis
deps-graph:
	npm run deps:graph
	@echo "Generated docs/dependency-graph.json"

deps-circular:
	npm run deps:circular

analyze:
	npm run analyze

## Supabase
deploy-fn:
	@test -n "$(FN)" || (echo "Usage: make deploy-fn FN=api-jobs REF=<project-ref>" && exit 1)
	@test -n "$(REF)" || (echo "Usage: make deploy-fn FN=api-jobs REF=<project-ref>" && exit 1)
	supabase functions deploy $(FN) --project-ref $(REF) --no-verify-jwt

types:
	@test -n "$(REF)" || (echo "Usage: make types REF=<project-ref>" && exit 1)
	supabase gen types typescript --project-id $(REF) > src/integrations/supabase/types/database.ts
	@echo "Types regenerated"

## Scaffolding
new-adr:
	@test -n "$(NUM)" || (echo "Usage: make new-adr NUM=006 TITLE=my-decision" && exit 1)
	@test -n "$(TITLE)" || (echo "Usage: make new-adr NUM=006 TITLE=my-decision" && exit 1)
	cp docs/decisions/TEMPLATE.md docs/decisions/$(NUM)-$(TITLE).md
	@echo "Created docs/decisions/$(NUM)-$(TITLE).md"

new-endpoint:
	@test -n "$(NAME)" || (echo "Usage: make new-endpoint NAME=api-widgets" && exit 1)
	mkdir -p supabase/functions/$(NAME)
	echo '{ "imports": { "@shared/": "../_shared/" } }' > supabase/functions/$(NAME)/deno.json
	@echo "Created supabase/functions/$(NAME)/ — add index.ts"

## Health
check:
	@echo "--- Build ---" && npm run build 2>&1 | tail -3
	@echo "--- Tests ---" && npm run test:run 2>&1 | tail -5
	@echo "--- Circular deps ---" && npm run deps:circular 2>&1 | tail -3
	@echo "--- Lint ---" && npm run lint 2>&1 | tail -3
