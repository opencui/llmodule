set -e

(
	# npm install --global yarn
	npm install -g gatsby-cli
	cd ./frontend/
	yarn install
	yarn build
)

pip install -r requirements.txt
