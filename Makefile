.PHONY: format format-check

PNPX := $(shell command -v pnpx 2>/dev/null)

ifeq ($(PNPX),)
RUNNER := npx --yes
else
RUNNER := pnpx
endif

format:
	$(RUNNER) prettier --write ./src

format-check:
	$(RUNNER) prettier --check ./src
