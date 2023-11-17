#!/bin/bash

set -e

file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"

	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo "Both $var and $fileVar are set (but are exclusive)"
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}


docker_setup_env() {
	# Initialize values that might be stored in a file
	file_env 'SALESFORCE_TOKEN'
}

_main() {
	docker_setup_env "$@"
	exec "$@"
}
_main "$@"
