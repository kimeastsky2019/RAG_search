#!/bin/bash

FUSEKI_DIR="apache-jena-fuseki-5.6.0"
DATASET="/fc"
LOCAL_JDK="amazon-corretto-17.jdk/Contents/Home"

# Configure Local Java
if [ -d "$LOCAL_JDK" ]; then
    echo "Using Local JDK: $LOCAL_JDK"
    export JAVA_HOME="$(pwd)/$LOCAL_JDK"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# Verify Java
if ! command -v java &> /dev/null; then
    echo "Java could not be found. Please install Java or ensure local JDK is present."
    exit 1
fi

java -version

if [ ! -d "$FUSEKI_DIR" ]; then
    echo "Fuseki directory not found. Please extract apache-jena-fuseki-5.6.0.tar"
    exit 1
fi

echo "Starting Fuseki Server on port 3030 with in-memory dataset '$DATASET'..."

chmod +x "$FUSEKI_DIR/fuseki-server"
./"$FUSEKI_DIR/fuseki-server" --mem "$DATASET"
