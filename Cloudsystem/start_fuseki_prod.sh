#!/bin/bash
FUSEKI_DIR="apache-jena-fuseki-5.6.0"
DATASET="/fc"

# Assume system Java in production
if ! command -v java &> /dev/null; then
    echo "Java not found. Installing..."
    sudo apt-get update && sudo apt-get install -y openjdk-17-jre
fi

if [ ! -d "$FUSEKI_DIR" ]; then
    echo "Extracting Fuseki..."
    tar -xf apache-jena-fuseki-5.6.0.tar
fi

echo "Starting Fuseki..."
chmod +x "$FUSEKI_DIR/fuseki-server"
nohup ./"$FUSEKI_DIR/fuseki-server" --mem "$DATASET" > fuseki.log 2>&1 &
echo "Fuseki started in background."
